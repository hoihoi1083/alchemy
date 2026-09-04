import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { chargeTokens, refundTokens } from "@/lib/billing/charge";
import { TOKEN_COST } from "@/lib/billing/token-costs";
import { requireAppUser, trackUsage } from "@/lib/require-app-user";
import {
  VOICEOVER_LOCALES,
  isVoicePresetId,
  type VoiceoverLocale,
  type VoicePresetId,
} from "@/lib/ad-pack-preferences";
import { createOwnedJobDir } from "@/lib/pipeline/job-owner";
import { synthesizeSpeechToFile } from "@/lib/pipeline/tts";
import { persistAndDurablize } from "@/lib/storage/durable-media";

export const runtime = "nodejs";
export const maxDuration = 120;

const LOCALES = new Set<VoiceoverLocale>(VOICEOVER_LOCALES);

export async function POST(request: Request) {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;

  let body: {
    script?: string;
    locale?: string;
    voice_preset?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const script = body.script?.trim();
  const locale = (body.locale?.trim() || "en") as VoiceoverLocale;
  const voicePresetRaw = body.voice_preset?.trim() || "";

  if (!script) {
    return NextResponse.json({ error: "script is required." }, { status: 400 });
  }
  if (!LOCALES.has(locale)) {
    return NextResponse.json({ error: "Invalid locale." }, { status: 400 });
  }
  if (!isVoicePresetId(voicePresetRaw)) {
    return NextResponse.json({ error: "Invalid voice_preset." }, { status: 400 });
  }
  const voicePresetId = voicePresetRaw as VoicePresetId;

  const tokenCost = TOKEN_COST.voiceover;
  const charged = await chargeTokens(auth.user.userId, tokenCost, {
    kind: "voiceover",
    locale,
    voice_preset: voicePresetId,
  });
  if ("error" in charged) return charged.error;
  const balanceAfter = charged.balanceAfter;

  const { jobId, dir } = await createOwnedJobDir(auth.user.userId);
  const outPath = path.join(dir, "ultra-tts.mp3");

  try {
    const { provider, voice } = await synthesizeSpeechToFile({
      text: script,
      voice: voicePresetId,
      xmlLang: locale === "en" ? "en-US" : locale === "cn" ? "zh-CN" : "zh-HK",
      locale,
      outputPath: outPath,
      voicePresetId,
    });

    const bytes = await fs.readFile(outPath);
    const audioUrl = await persistAndDurablize({
      clerkId: auth.user.userId,
      kind: "audio",
      sourceUrl: `ultra-tts://${jobId}/ultra-tts.mp3`,
      fallbackUrl: "",
      bytes,
      contentType: "audio/mpeg",
      name: `ultra-tts-${voicePresetId}`,
    });
    if (audioUrl.includes("/api/pipeline-files/")) {
      throw new Error("Voice could not be saved to durable storage.");
    }

    void trackUsage(auth.user.userId, "voiceover");

    return NextResponse.json({
      audioUrl,
      presetId: voicePresetId,
      locale,
      provider,
      voice,
      jobId,
      tokensCharged: tokenCost,
      creditBalance: balanceAfter,
    });
  } catch (e: unknown) {
    await refundTokens(auth.user.userId, tokenCost, {
      kind: "voiceover",
      reason: "ultra_tts_failed",
    });
    const message = e instanceof Error ? e.message : "Voice generation failed.";
    console.error("[ultra-tts]", e);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
