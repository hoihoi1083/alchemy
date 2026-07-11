import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { fal, ApiError, ValidationError } from "@fal-ai/client";
import { NextResponse } from "next/server";
import {
  azureVoiceForLocale,
  isVoicePresetId,
  type VoiceoverLocale,
  type VoicePresetId,
} from "@/lib/ad-pack-preferences";
import { materializeMediaInput } from "@/lib/pipeline/local-input";
import { synthesizeSpeechToFile } from "@/lib/pipeline/tts";
import { mirrorImageUrlToFalStorage } from "@/lib/fal-mirror-media";
import { requireAppUser, trackUsage } from "@/lib/require-app-user";
import {
  HEYGEN_AVATAR_IV_ENDPOINT,
  type UgcPresenterTalkingStyle,
  ugcPresenterMotionHint,
} from "@/lib/ugc-presenter";
import {
  findHeygenAvatar,
  HEYGEN_DIGITAL_TWIN_ENDPOINT,
} from "@/lib/heygen-avatars";

export type PresenterSourceMode = "custom-keyframe" | "stock-avatar";

export const runtime = "nodejs";
export const maxDuration = 300;

const LOCALES = new Set<VoiceoverLocale>(["hk", "en", "cn"]);
const TALKING_STYLES = new Set<UgcPresenterTalkingStyle>(["stable", "expressive"]);

function formatFalError(e: unknown): string {
  if (e instanceof ValidationError) {
    const fieldMsgs = e.fieldErrors
      .map((f) => {
        const loc = f.loc?.length ? f.loc.join(".") : "body";
        return `${loc}: ${f.msg}`;
      })
      .filter(Boolean);
    const bits = fieldMsgs.length ? fieldMsgs : [e.message];
    if (e.requestId) bits.push(`fal request: ${e.requestId}`);
    return bits.join(" — ");
  }
  if (e instanceof ApiError) {
    const bits: string[] = [e.message];
    if (e.requestId) bits.push(`fal request: ${e.requestId}`);
    return bits.join(" — ");
  }
  if (e instanceof Error) return e.message;
  return "Digital presenter generation failed";
}

async function uploadAudioForFal(localPath: string): Promise<string> {
  const buf = await fs.readFile(localPath);
  const ext = path.extname(localPath).toLowerCase();
  const type =
    ext === ".wav" ? "audio/wav"
    : ext === ".m4a" ? "audio/mp4"
    : "audio/mpeg";
  return fal.storage.upload(new Blob([buf], { type }));
}

async function resolveAudioUrl(input: {
  speechUrl?: string;
  script?: string;
  locale: VoiceoverLocale;
  voicePreset?: VoicePresetId;
}): Promise<{ audioUrl: string; usedPreview: boolean }> {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "ugc-presenter-audio-"));
  try {
    if (input.speechUrl?.trim()) {
      const local = path.join(tmpDir, "preview.mp3");
      await materializeMediaInput(input.speechUrl.trim(), local);
      return { audioUrl: await uploadAudioForFal(local), usedPreview: true };
    }
    if (!input.script?.trim()) {
      throw new Error("script or speech_url is required for the presenter voice.");
    }
    const { voice, xmlLang } = azureVoiceForLocale(input.locale);
    const local = path.join(tmpDir, "narration.mp3");
    await synthesizeSpeechToFile({
      text: input.script.trim(),
      voice,
      xmlLang,
      locale: input.locale,
      outputPath: local,
      voicePresetId: input.voicePreset,
    });
    return { audioUrl: await uploadAudioForFal(local), usedPreview: false };
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
}

export async function POST(request: Request) {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;

  const key = process.env.FAL_KEY?.trim();
  if (!key) {
    return NextResponse.json(
      { error: "FAL_KEY is not configured on the server." },
      { status: 503 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const imageFile = formData.get("image") as File | null;
  const imageUrlRaw = (formData.get("image_url") as string | null)?.trim();
  const script = (formData.get("script") as string | null)?.trim();
  const speechUrl = (formData.get("speech_url") as string | null)?.trim();
  const locale = ((formData.get("locale") as string | null)?.trim() || "hk") as VoiceoverLocale;
  const rawPreset = (formData.get("voice_preset") as string | null)?.trim() ?? "";
  const voicePreset: VoicePresetId | undefined = isVoicePresetId(rawPreset)
    ? rawPreset
    : undefined;
  const talkingStyle = ((formData.get("talking_style") as string | null)?.trim() ||
    "expressive") as UgcPresenterTalkingStyle;
  const resolution = (formData.get("resolution") as string | null)?.trim() || "720p";
  const aspectRatio = (formData.get("aspect_ratio") as string | null)?.trim() || "9:16";
  const productName = (formData.get("product_name") as string | null)?.trim() || "";
  const motionHint = (formData.get("motion_hint") as string | null)?.trim();
  const presenterMode = ((formData.get("presenter_mode") as string | null)?.trim() ||
    "custom-keyframe") as PresenterSourceMode;
  const stockAvatarId = (formData.get("stock_avatar_id") as string | null)?.trim() || "";

  if (!LOCALES.has(locale)) {
    return NextResponse.json({ error: "Invalid locale." }, { status: 400 });
  }
  if (!TALKING_STYLES.has(talkingStyle)) {
    return NextResponse.json({ error: "Invalid talking_style." }, { status: 400 });
  }
  if (!speechUrl && !script) {
    return NextResponse.json(
      { error: "Ad pack voiceover script or a voice preview is required." },
      { status: 400 },
    );
  }

  fal.config({ credentials: key });

  try {
    const { audioUrl, usedPreview } = await resolveAudioUrl({
      speechUrl,
      script,
      locale,
      voicePreset,
    });

    if (presenterMode === "stock-avatar") {
      const avatar = findHeygenAvatar(stockAvatarId);
      if (!avatar) {
        return NextResponse.json({ error: "Pick a stock presenter avatar." }, { status: 400 });
      }
      const heygenAspect =
        aspectRatio === "16:9" || aspectRatio === "1:1" ? aspectRatio : "9:16";
      const result = await fal.subscribe(HEYGEN_DIGITAL_TWIN_ENDPOINT, {
        input: {
          character: { avatar: avatar.id as never },
          voice: script ? { prompt: script } : {},
          audio_url: audioUrl,
          resolution: resolution as "360p" | "480p" | "540p" | "720p" | "1080p",
          aspect_ratio: heygenAspect,
        },
        logs: true,
      });
      const data = result.data as { video?: { url?: string } };
      const videoUrl = data.video?.url;
      if (!videoUrl) throw new Error("HeyGen response missing video URL.");
      await trackUsage(auth.user.userId, "video");
      if (!usedPreview) await trackUsage(auth.user.userId, "voiceover");
      return NextResponse.json({
        videoUrl,
        requestId: result.requestId,
        generationMode: "digital-presenter-stock",
        endpoint: HEYGEN_DIGITAL_TWIN_ENDPOINT,
        note: `HeyGen stock presenter — ${avatar.id}. Lip-sync baked in.`,
      });
    }

    let imageUrl = imageUrlRaw;
    if (imageFile && imageFile.size > 0) {
      imageUrl = await fal.storage.upload(imageFile);
    }
    if (!imageUrl) {
      return NextResponse.json(
        { error: "Presenter keyframe image is required (generate in Step 2 first)." },
        { status: 400 },
      );
    }
    imageUrl = await mirrorImageUrlToFalStorage(imageUrl);

    const prompt = motionHint || ugcPresenterMotionHint(productName);

    const result = await fal.subscribe(HEYGEN_AVATAR_IV_ENDPOINT, {
      input: {
        image_url: imageUrl,
        audio_url: audioUrl,
        prompt,
        talking_style: talkingStyle,
        resolution: resolution as "360p" | "480p" | "540p" | "720p" | "1080p",
        aspect_ratio: (aspectRatio === "auto" ? "9:16" : aspectRatio) as
          | "9:16"
          | "16:9"
          | "1:1",
      },
      logs: true,
    });

    const data = result.data as { video?: { url?: string } };
    const videoUrl = data.video?.url;
    if (!videoUrl) {
      throw new Error("HeyGen response missing video URL.");
    }

    await trackUsage(auth.user.userId, "video");
    if (!usedPreview) {
      await trackUsage(auth.user.userId, "voiceover");
    }

    return NextResponse.json({
      videoUrl,
      requestId: result.requestId,
      generationMode: "digital-presenter",
      endpoint: HEYGEN_AVATAR_IV_ENDPOINT,
      note: "HeyGen Avatar IV — lip-sync is baked into this clip (not Seedance).",
    });
  } catch (e: unknown) {
    if (e instanceof ValidationError) {
      console.error("[api/generate-digital-presenter] validation", JSON.stringify(e.fieldErrors));
    } else {
      console.error("[api/generate-digital-presenter]", e);
    }
    const message = formatFalError(e);
    const status =
      e instanceof ApiError && e.status >= 400 && e.status < 600 ? e.status : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
