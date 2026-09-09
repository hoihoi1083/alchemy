import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import type { CaptionLine } from "@/lib/ad-pack-types";
import { chargeTokens, refundTokens } from "@/lib/billing/charge";
import { TOKEN_COST } from "@/lib/billing/token-costs";
import { requireAppUser } from "@/lib/require-app-user";
import { ensureFfmpeg, extractAudioWav, getMediaDurationSeconds } from "@/lib/pipeline/ffmpeg";
import { createOwnedJobDir } from "@/lib/pipeline/job-owner";
import { materializeMediaInput } from "@/lib/pipeline/local-input";
import { isLocalWhisperAvailable, transcribeWithLocalWhisper } from "@/lib/pipeline/localWhisper";
import { transcribeAudio } from "@/lib/pipeline/openai";
import type { TranscriptSegment } from "@/lib/pipeline/types";

export const runtime = "nodejs";
export const maxDuration = 180;

type AsrProvider = "openai" | "local";

function segmentsToCaptionLines(
  segments: TranscriptSegment[],
  durationSec: number,
): CaptionLine[] {
  const maxEnd = Math.max(0.5, durationSec);
  const lines: CaptionLine[] = [];
  for (const seg of segments) {
    const text = (seg.text ?? "").replace(/\s+/g, " ").trim();
    if (!text) continue;
    const startSec = Math.max(0, Math.min(maxEnd - 0.2, Number(seg.start) || 0));
    let endSec = Math.max(startSec + 0.2, Number(seg.end) || startSec + 1.5);
    endSec = Math.min(maxEnd, endSec);
    lines.push({
      startSec: Math.round(startSec * 100) / 100,
      endSec: Math.round(endSec * 100) / 100,
      text,
      position: "bottom",
    });
  }
  return lines;
}

function onServerless(): boolean {
  return Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
}

/**
 * Caption Studio 2 — speech → timed on-screen lines (no burn).
 * Classic /captions expects you to write or plan lines; this fills the timeline from audio.
 */
export async function POST(request: Request) {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const videoFile = formData.get("video_file") as File | null;
  const videoUrl = (formData.get("video_url") as string | null)?.trim();
  const preferRaw =
    ((formData.get("asr_provider") as string) || "").trim().toLowerCase();
  const hasOpenAi = Boolean(process.env.OPENAI_API_KEY?.trim());
  const localOk = !onServerless() && (await isLocalWhisperAvailable());

  let asrProvider: AsrProvider;
  if (preferRaw === "local") {
    if (!localOk) {
      return NextResponse.json(
        {
          error: onServerless()
            ? "Local Whisper is not available on this server. Use cloud ASR (OpenAI)."
            : "Local Whisper is not installed (brew install whisper-cpp + model).",
        },
        { status: 400 },
      );
    }
    asrProvider = "local";
  } else if (preferRaw === "openai" || hasOpenAi) {
    asrProvider = "openai";
  } else if (localOk) {
    asrProvider = "local";
  } else {
    return NextResponse.json(
      {
        error:
          "No speech-to-text configured. Set OPENAI_API_KEY for cloud ASR (whisper-1).",
      },
      { status: 503 },
    );
  }

  if ((!videoFile || videoFile.size === 0) && !videoUrl) {
    return NextResponse.json(
      { error: "Provide video_file or video_url." },
      { status: 400 },
    );
  }

  const tokenCost = asrProvider === "openai" ? TOKEN_COST.plan : 0;
  const charged =
    tokenCost > 0
      ? await chargeTokens(auth.user.userId, tokenCost, {
          kind: "transcribe-captions",
          asr: asrProvider,
        })
      : null;
  if (charged && "error" in charged) return charged.error;

  const { dir } = await createOwnedJobDir(auth.user.userId);
  const inputPath = path.join(dir, "input.mp4");
  const audioPath = path.join(dir, "audio.wav");

  try {
    await ensureFfmpeg();

    if (videoFile && videoFile.size > 0) {
      await fs.writeFile(inputPath, Buffer.from(await videoFile.arrayBuffer()));
    } else if (videoUrl) {
      await materializeMediaInput(videoUrl, inputPath, {
        clerkId: auth.user.userId,
      });
    }

    const durationSec = await getMediaDurationSeconds(inputPath);
    await extractAudioWav(inputPath, audioPath);

    let language: string | undefined;
    let text = "";
    let segments: TranscriptSegment[] = [];
    let used: AsrProvider = asrProvider;
    let evenSplit = false;

    if (asrProvider === "openai") {
      try {
        const audioBuffer = await fs.readFile(audioPath);
        const audioFile = new File([audioBuffer], "audio.wav", {
          type: "audio/wav",
        });
        const result = await transcribeAudio(audioFile, {
          preferTimedSegments: true,
        });
        language = result.language;
        text = result.text;
        segments = result.segments;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.warn("[transcribe-captions] openai failed:", msg);
        if (localOk) {
          used = "local";
          const local = await transcribeWithLocalWhisper({
            wavPath: audioPath,
            outputBase: path.join(dir, "local_whisper"),
          });
          language = local.transcript.language;
          text = local.transcript.text;
          segments = local.transcript.segments;
          if (charged && tokenCost > 0) {
            await refundTokens(auth.user.userId, tokenCost, {
              kind: "transcribe-captions-openai-fallback",
            });
          }
        } else {
          throw new Error(
            msg.includes("OPENAI_API_KEY")
              ? msg
              : `Cloud transcription failed. ${msg.slice(0, 180)}`,
          );
        }
      }
    } else {
      const local = await transcribeWithLocalWhisper({
        wavPath: audioPath,
        outputBase: path.join(dir, "local_whisper"),
      });
      language = local.transcript.language;
      text = local.transcript.text;
      segments = local.transcript.segments;
    }

    // Text without segments — split evenly (last resort; mark for UI).
    if (segments.length === 0 && text.trim()) {
      evenSplit = true;
      const chunks = text
        .split(/(?<=[。！？.!?])\s+|\n+/)
        .map((s) => s.trim())
        .filter(Boolean);
      const n = Math.max(1, chunks.length);
      const slice = durationSec / n;
      segments = chunks.map((chunk, i) => ({
        start: i * slice,
        end: Math.min(durationSec, (i + 1) * slice),
        text: chunk,
      }));
    }

    const lines = segmentsToCaptionLines(segments, durationSec);

    return NextResponse.json({
      lines,
      language: language ?? null,
      transcriptText: text,
      durationSec,
      asrProvider: used,
      tokensCharged: used === "openai" ? tokenCost : 0,
      emptySpeech: lines.length === 0,
      evenSplit,
    });
  } catch (e: unknown) {
    if (charged && tokenCost > 0) {
      await refundTokens(auth.user.userId, tokenCost, {
        kind: "transcribe-captions-failed",
      });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Transcription failed." },
      { status: 500 },
    );
  }
}
