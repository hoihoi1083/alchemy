import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/require-app-user";
import { synthesizeCantoneseToFile } from "@/lib/pipeline/azureTts";
import {
  attachSoftSubtitleTrack,
  burnSubtitles,
  downloadToFile,
  ensureFfmpeg,
  extractAudioWav,
  mergeAudioIntoVideo,
} from "@/lib/pipeline/ffmpeg";
import { jobDir } from "@/lib/pipeline/paths";
import { transcribeWithLocalWhisper } from "@/lib/pipeline/localWhisper";
import { rewriteToCantonese, transcribeAudio } from "@/lib/pipeline/openai";
import { buildSrt } from "@/lib/pipeline/srt";
import { PostProcessResult } from "@/lib/pipeline/types";

export const runtime = "nodejs";
export const maxDuration = 300;

type SubtitleMode = "none" | "soft" | "burn";
type AsrProvider = "local" | "openai";
type RewriteProvider = "none" | "openai";
type DubProvider = "none" | "azure";

export async function POST(request: Request) {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const inputVideoFile = formData.get("video_file") as File | null;
  const inputVideoUrl = (formData.get("video_url") as string | null)?.trim();
  const withDub = formData.get("with_dub") === "true";
  const subtitleMode = ((formData.get("subtitle_mode") as string) ||
    "soft") as SubtitleMode;
  const voice = (formData.get("voice") as string) || "zh-HK-HiuGaaiNeural";
  const asrProvider = ((formData.get("asr_provider") as string) ||
    "local") as AsrProvider;
  const rewriteProvider = ((formData.get("rewrite_provider") as string) ||
    "none") as RewriteProvider;
  const dubProvider = ((formData.get("dub_provider") as string) ||
    (withDub ? "azure" : "none")) as DubProvider;

  if ((!inputVideoFile || inputVideoFile.size === 0) && !inputVideoUrl) {
    return NextResponse.json(
      { error: "Provide either video_file or video_url." },
      { status: 400 },
    );
  }

  const jobId = crypto.randomUUID();
  const dir = jobDir(jobId);
  await fs.mkdir(dir, { recursive: true });

  const inputVideoPath = path.join(dir, "input.mp4");
  const extractedAudioPath = path.join(dir, "extracted.wav");
  const srtPath = path.join(dir, "corrected.srt");
  const dubbedAudioPath = path.join(dir, "dubbed.wav");
  const outputVideoPath = path.join(dir, "final.mp4");
  const subtitledPath = path.join(dir, "subtitled.mp4");

  try {
    await ensureFfmpeg();

    if (inputVideoFile && inputVideoFile.size > 0) {
      const buffer = Buffer.from(await inputVideoFile.arrayBuffer());
      await fs.writeFile(inputVideoPath, buffer);
    } else if (inputVideoUrl) {
      await downloadToFile(inputVideoUrl, inputVideoPath);
    }

    await extractAudioWav(inputVideoPath, extractedAudioPath);
    const localSrtBase = path.join(dir, "local_whisper");

    const transcript =
      asrProvider === "openai"
        ? await (async () => {
            const audioBuffer = await fs.readFile(extractedAudioPath);
            const audioFile = new File([audioBuffer], "audio.wav", {
              type: "audio/wav",
            });
            return transcribeAudio(audioFile);
          })()
        : (
            await transcribeWithLocalWhisper({
              wavPath: extractedAudioPath,
              outputBase: localSrtBase,
            })
          ).transcript;

    if (!transcript.segments.length) {
      throw new Error(
        "Transcription returned no timestamped segments. Try a clearer audio source.",
      );
    }

    const correctedSegments =
      rewriteProvider === "openai"
        ? await rewriteToCantonese(transcript.segments)
        : transcript.segments;
    const srtText = buildSrt(correctedSegments);
    await fs.writeFile(srtPath, srtText, "utf8");

    let finalSource = inputVideoPath;
    let dubbedAudioUrl: string | undefined;

    if (withDub && dubProvider === "azure") {
      const narration = correctedSegments.map((s) => s.text).join("，");
      await synthesizeCantoneseToFile({
        text: narration,
        voice,
        outputWavPath: dubbedAudioPath,
      });
      dubbedAudioUrl = `/api/pipeline-files/${jobId}/dubbed.wav`;
      await mergeAudioIntoVideo(finalSource, dubbedAudioPath, outputVideoPath);
      finalSource = outputVideoPath;
    } else if (withDub && dubProvider !== "azure") {
      throw new Error(
        "Dubbing requested but unsupported dub provider selected. Use dub_provider=azure.",
      );
    }

    if (subtitleMode === "burn") {
      await burnSubtitles(finalSource, srtPath, subtitledPath);
      finalSource = subtitledPath;
    } else if (subtitleMode === "soft") {
      await attachSoftSubtitleTrack(finalSource, srtPath, subtitledPath);
      finalSource = subtitledPath;
    }

    const result: PostProcessResult = {
      jobId,
      srtUrl: `/api/pipeline-files/${jobId}/corrected.srt`,
      transcriptText: transcript.text,
      correctedText: correctedSegments.map((s) => s.text).join(" "),
      finalVideoUrl: `/api/pipeline-files/${jobId}/${path.basename(finalSource)}`,
      dubbedAudioUrl,
      note: withDub
        ? `Dubbed audio generated via ${dubProvider}.`
        : subtitleMode === "none"
          ? `No subtitles added. Transcript generated via ${asrProvider} ASR${rewriteProvider === "openai" ? " + OpenAI rewrite" : ""}.`
          : `Subtitles generated via ${asrProvider} ASR${rewriteProvider === "openai" ? " + OpenAI rewrite" : ""}.`,
    };

    return NextResponse.json(result);
  } catch (e: unknown) {
    const message =
      e && typeof e === "object" && "message" in e
        ? String((e as { message: unknown }).message)
        : "Post-processing failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
