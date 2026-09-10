import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import type { CaptionLine } from "@/lib/ad-pack-types";
import { captionSpeakText } from "@/lib/ad-pack-types";
import {
  azureVoiceForLocale,
  isVoicePresetId,
  type VoiceoverLocale,
  type VoicePresetId,
} from "@/lib/ad-pack-preferences";
import {
  assertVideoHasAudio,
  ensureFfmpeg,
  getMediaDurationSeconds,
  mixNarrationOverVideo,
  mixTimedNarrationClips,
  placeNarrationNaturalSpeed,
} from "@/lib/pipeline/ffmpeg";
import {
  materializeMediaInput,
  pipelineFileUrl,
} from "@/lib/pipeline/local-input";
import { createOwnedJobDir } from "@/lib/pipeline/job-owner";
import { resolveTtsProvider, synthesizeSpeechToFile } from "@/lib/pipeline/tts";
import { requireAppUser, trackUsage } from "@/lib/require-app-user";
import { chargeTokens, refundTokens } from "@/lib/billing/charge";
import { TOKEN_COST } from "@/lib/billing/token-costs";
import { persistAndDurablize } from "@/lib/storage/durable-media";

export const runtime = "nodejs";
export const maxDuration = 180;

const LOCALES = new Set<VoiceoverLocale>(["hk", "en", "cn"]);

function parseCaptionLines(raw: unknown): CaptionLine[] {
  let parsed = raw;
  if (typeof raw === "string" && raw.trim()) {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const text = String((row as { text?: unknown }).text ?? "").trim();
      if (!text) return null;
      const startRaw =
        (row as { startSec?: unknown; start_sec?: unknown }).startSec ??
        (row as { start_sec?: unknown }).start_sec;
      const endRaw =
        (row as { endSec?: unknown; end_sec?: unknown }).endSec ??
        (row as { end_sec?: unknown }).end_sec;
      const startSec = Math.max(0, Number(startRaw) || 0);
      const endSec = Math.max(startSec + 0.2, Number(endRaw) || startSec + 2);
      const spokenRaw = String(
        (row as { spokenText?: unknown; spoken_text?: unknown }).spokenText ??
          (row as { spoken_text?: unknown }).spoken_text ??
          "",
      ).trim();
      return {
        startSec,
        endSec,
        text,
        ...(spokenRaw ? { spokenText: spokenRaw } : {}),
      } satisfies CaptionLine;
    })
    .filter(Boolean) as CaptionLine[];
}

async function dubVoiceJob(
  request: Request,
  input: {
    clerkId: string;
    videoUrl?: string;
    videoFile?: File;
    script?: string;
    locale: VoiceoverLocale;
    targetDurationSec?: number;
    speechStartSec?: number;
    /** Per-caption TTS at natural speed, placed at each startSec. */
    captionLines?: CaptionLine[];
    speechUrl?: string;
    voicePreset?: VoicePresetId;
    /** VO gain into mixNarrationOverVideo (default ~2.1). */
    voiceVolume?: number;
    /** Existing video/BGM level under VO (default ~0.14). */
    underVoiceBgmVolume?: number;
    /**
     * continuous = one TTS from script/preview (default when script present).
     * per_caption = one TTS per caption line (legacy choppy mode).
     */
    mixMode?: "continuous" | "per_caption";
    trackUsageUserId?: string;
    persistUserId?: string;
  },
) {
  const { jobId, dir } = await createOwnedJobDir(input.clerkId);

  const inputPath = path.join(dir, "input.mp4");
  const narrationWav = path.join(dir, "narration-fit.wav");
  const outputPath = path.join(dir, "with-voice.mp4");
  const ext = resolveTtsProvider() === "fal" ? "mp3" : "wav";

  const { voice, xmlLang } = azureVoiceForLocale(input.locale);

  await ensureFfmpeg();
  if (input.videoFile && input.videoFile.size > 0) {
    const buffer = Buffer.from(await input.videoFile.arrayBuffer());
    await fs.writeFile(inputPath, buffer);
  } else if (input.videoUrl?.trim()) {
    await materializeMediaInput(input.videoUrl.trim(), inputPath, { clerkId: input.clerkId });
  } else {
    throw new Error("video_url or video_file is required.");
  }

  const probedDuration = await getMediaDurationSeconds(inputPath);
  const videoDuration =
    typeof input.targetDurationSec === "number" && input.targetDurationSec > 0
      ? input.targetDurationSec
      : probedDuration;

  const timedLines = (input.captionLines ?? []).filter((l) => l.text.trim());
  let ttsVoice = voice;
  let ttsProvider = resolveTtsProvider();
  let clipCount = 1;

  const hasScriptOrSpeech = Boolean(input.script?.trim() || input.speechUrl);
  const mixMode =
    input.mixMode ??
    (hasScriptOrSpeech ? "continuous" : timedLines.length >= 2 ? "per_caption" : "continuous");

  if (mixMode === "per_caption" && timedLines.length >= 2) {
    // One natural-speed clip per caption — speak spokenText when present.
    console.info(
      `[dub-script-voice] per-caption TTS: ${timedLines.length} lines @ ${timedLines
        .map((l) => l.startSec.toFixed(1))
        .join(", ")}s`,
    );
    const clips: { path: string; startSec: number; endSec?: number }[] = [];
    for (let i = 0; i < timedLines.length; i++) {
      const line = timedLines[i];
      const outPath = path.join(dir, `narration-line-${i}.${ext}`);
      const speak = captionSpeakText(line);
      const tts = await synthesizeSpeechToFile({
        text: speak,
        voice,
        xmlLang,
        locale: input.locale,
        outputPath: outPath,
        voicePresetId: input.voicePreset,
      });
      ttsVoice = tts.voice;
      ttsProvider = tts.provider;
      clips.push({ path: outPath, startSec: line.startSec, endSec: line.endSec });
    }
    clipCount = clips.length;
    await mixTimedNarrationClips(clips, narrationWav, videoDuration);
  } else {
    console.info(
      `[dub-script-voice] continuous TTS (mix_mode=${mixMode}, lines=${timedLines.length})`,
    );
    const narrationSrc = path.join(dir, `narration.${ext}`);
    const speechStartSec =
      typeof input.speechStartSec === "number" && input.speechStartSec > 0
        ? input.speechStartSec
        : timedLines.length >= 1
          ? timedLines[0].startSec
          : 0;

    if (input.speechUrl) {
      await materializeMediaInput(input.speechUrl, narrationSrc, { clerkId: input.clerkId });
      ttsVoice = input.voicePreset ? `preview:${input.voicePreset}` : "preview:selected";
    } else {
      const text =
        input.script?.trim() ||
        (timedLines.length === 1 ? captionSpeakText(timedLines[0]) : "") ||
        timedLines.map((l) => captionSpeakText(l)).filter(Boolean).join(input.locale === "en" ? ". " : "，") ||
        "";
      if (!text) throw new Error("script, speech_url, or caption_lines required.");
      const tts = await synthesizeSpeechToFile({
        text,
        voice,
        xmlLang,
        locale: input.locale,
        outputPath: narrationSrc,
        voicePresetId: input.voicePreset,
      });
      ttsVoice = tts.voice;
      ttsProvider = tts.provider;
    }

    await placeNarrationNaturalSpeed(
      narrationSrc,
      narrationWav,
      videoDuration,
      speechStartSec,
    );
  }

  await mixNarrationOverVideo(
    inputPath,
    narrationWav,
    outputPath,
    typeof input.underVoiceBgmVolume === "number" &&
      Number.isFinite(input.underVoiceBgmVolume)
      ? Math.min(1, Math.max(0.02, input.underVoiceBgmVolume))
      : 0.14,
    typeof input.voiceVolume === "number" && Number.isFinite(input.voiceVolume)
      ? Math.min(4, Math.max(0.4, input.voiceVolume))
      : 2.1,
  );
  await assertVideoHasAudio(outputPath, "Voiceover mix");

  if (!input.speechUrl && input.trackUsageUserId) {
    await trackUsage(input.trackUsageUserId, "voiceover");
  }

  const videoUrlPipeline = pipelineFileUrl(request, jobId, "with-voice.mp4");
  const bytes = await fs.readFile(outputPath);
  const videoUrl = await persistAndDurablize({
    clerkId: input.clerkId,
    kind: "voiceover",
    sourceUrl: `voiceover://${jobId}/with-voice.mp4`,
    fallbackUrl: videoUrlPipeline,
    bytes,
    contentType: "video/mp4",
    name: "Voiceover video",
  });

  return {
    videoUrl,
    jobId,
    locale: input.locale,
    voice: ttsVoice,
    provider: ttsProvider,
    videoDurationSec: videoDuration,
    clipCount,
    usedPreviewSpeech: Boolean(input.speechUrl) && mixMode === "continuous",
    perCaption: mixMode === "per_caption" && timedLines.length >= 2,
    mixMode,
  };
}

export async function POST(request: Request) {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;

  const contentType = request.headers.get("content-type") ?? "";

  // Validate inputs BEFORE chargeTokens (same contract as add-bgm).
  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const videoFile = formData.get("video_file");
    const videoUrl = (formData.get("video_url") as string | null)?.trim();
    const script = (formData.get("script") as string | null)?.trim();
    const speechUrl = (formData.get("speech_url") as string | null)?.trim();
    const locale = ((formData.get("locale") as string | null)?.trim() || "hk") as VoiceoverLocale;
    const rawPreset = (formData.get("voice_preset") as string | null)?.trim() ?? "";
    const voicePreset: VoicePresetId | undefined = isVoicePresetId(rawPreset)
      ? rawPreset
      : undefined;
    const targetRaw = formData.get("target_duration_sec");
    const targetDurationSec =
      typeof targetRaw === "string" && targetRaw.trim() ? Number(targetRaw) : undefined;
    const startRaw = formData.get("speech_start_sec");
    const speechStartSec =
      typeof startRaw === "string" && startRaw.trim() ? Number(startRaw) : undefined;
    const captionLines = parseCaptionLines(formData.get("caption_lines"));
    const file = videoFile instanceof File && videoFile.size > 0 ? videoFile : undefined;

    if (!LOCALES.has(locale)) {
      return NextResponse.json({ error: "Invalid locale." }, { status: 400 });
    }
    if (!file && !videoUrl) {
      return NextResponse.json(
        { error: "video_file or video_url is required." },
        { status: 400 },
      );
    }
    if (!speechUrl && !script && captionLines.length === 0) {
      return NextResponse.json(
        { error: "script, speech_url, or caption_lines is required." },
        { status: 400 },
      );
    }

    const tokenCost =
      TOKEN_COST.voiceover * Math.max(1, captionLines.length >= 2 ? captionLines.length : 1);
    const charged = await chargeTokens(auth.user.userId, tokenCost, {
      kind: "voiceover_dub",
      captionLines: captionLines.length,
    });
    if ("error" in charged) return charged.error;

    try {
      const result = await dubVoiceJob(request, {
        clerkId: auth.user.userId,
        videoFile: file,
        videoUrl,
        script,
        locale,
        targetDurationSec,
        speechStartSec,
        captionLines,
        speechUrl,
        voicePreset,
        voiceVolume: (() => {
          const v = Number(formData.get("voice_volume"));
          return Number.isFinite(v) && v > 0 ? v : undefined;
        })(),
        underVoiceBgmVolume: (() => {
          const v = Number(formData.get("under_voice_bgm_volume"));
          return Number.isFinite(v) && v > 0 ? v : undefined;
        })(),
        trackUsageUserId:
          speechUrl && captionLines.length < 2 ? undefined : auth.user.userId,
        persistUserId: auth.user.userId,
      });
      return NextResponse.json({
        ...result,
        tokensCharged: tokenCost,
        creditBalance: charged.balanceAfter,
      });
    } catch (e: unknown) {
      await refundTokens(auth.user.userId, tokenCost, {
        kind: "voiceover_dub",
        reason: "generation_failed",
      });
      const message = e instanceof Error ? e.message : "Voiceover dub failed.";
      return NextResponse.json({ error: message }, { status: 502 });
    }
  }

  let body: {
    video_url?: string;
    script?: string;
    locale?: string;
    target_duration_sec?: number;
    speech_start_sec?: number;
    speech_url?: string;
    voice_preset?: string;
    caption_lines?: unknown;
    voice_volume?: number;
    under_voice_bgm_volume?: number;
    mix_mode?: "continuous" | "per_caption";
  } | null = null;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const videoUrl = body?.video_url?.trim();
  const script = body?.script?.trim();
  const speechUrl = body?.speech_url?.trim();
  const locale = (body?.locale?.trim() || "hk") as VoiceoverLocale;
  const rawPreset = body?.voice_preset?.trim() ?? "";
  const voicePreset: VoicePresetId | undefined = isVoicePresetId(rawPreset)
    ? rawPreset
    : undefined;
  const captionLines = parseCaptionLines(body?.caption_lines);
  const mixModeRaw = body?.mix_mode;
  const mixMode =
    mixModeRaw === "per_caption" || mixModeRaw === "continuous"
      ? mixModeRaw
      : undefined;

  if (!videoUrl) {
    return NextResponse.json({ error: "video_url is required." }, { status: 400 });
  }
  if (!speechUrl && !script && captionLines.length === 0) {
    return NextResponse.json(
      { error: "script, speech_url, or caption_lines is required." },
      { status: 400 },
    );
  }
  if (!LOCALES.has(locale)) {
    return NextResponse.json({ error: "Invalid locale." }, { status: 400 });
  }

  const effectiveContinuous =
    mixMode === "continuous" ||
    (mixMode !== "per_caption" && Boolean(script || speechUrl));
  const tokenCost =
    TOKEN_COST.voiceover *
    Math.max(
      1,
      effectiveContinuous
        ? 1
        : captionLines.length >= 2
          ? captionLines.length
          : 1,
    );
  const charged = await chargeTokens(auth.user.userId, tokenCost, {
    kind: "voiceover_dub",
    captionLines: captionLines.length,
  });
  if ("error" in charged) return charged.error;

  try {
    const result = await dubVoiceJob(request, {
      clerkId: auth.user.userId,
      videoUrl,
      script,
      locale,
      targetDurationSec: body?.target_duration_sec,
      speechStartSec: body?.speech_start_sec,
      captionLines,
      speechUrl,
      voicePreset,
      mixMode,
      voiceVolume: (() => {
        const v = Number(body?.voice_volume);
        return Number.isFinite(v) && v > 0 ? v : undefined;
      })(),
      underVoiceBgmVolume: (() => {
        const v = Number(body?.under_voice_bgm_volume);
        return Number.isFinite(v) && v > 0 ? v : undefined;
      })(),
      trackUsageUserId:
        speechUrl && effectiveContinuous ? undefined : auth.user.userId,
      persistUserId: auth.user.userId,
    });
    return NextResponse.json({
      ...result,
      tokensCharged: tokenCost,
      creditBalance: charged.balanceAfter,
    });
  } catch (e: unknown) {
    await refundTokens(auth.user.userId, tokenCost, {
      kind: "voiceover_dub",
      reason: "generation_failed",
    });
    const message = e instanceof Error ? e.message : "Voiceover dub failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
