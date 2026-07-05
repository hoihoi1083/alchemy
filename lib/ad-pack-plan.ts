import type { BrandProfile } from "@/lib/brand-profile";
import { brandProfilePromptBlock } from "@/lib/brand-profile";
import { callDeepSeekChat } from "@/lib/deepseek-client";
import { parseLlmJsonObject } from "@/lib/parse-llm-json";
import type { PromptMarket } from "@/lib/prompt-variables";
import type { AdPackPlan, CaptionLine } from "@/lib/ad-pack-types";
import type { MusicMood } from "@/lib/ad-pack-preferences";
import { musicMoodHint, maxVoiceoverChars } from "@/lib/ad-pack-preferences";
import type { StoryboardScenePlan } from "@/lib/video-storyboard-types";

function localeHint(market: PromptMarket): string {
  if (market === "hk" || market === "tw") {
    return "Write caption text in Traditional Chinese (繁體中文). Keep lines short for mobile Reels.";
  }
  if (market === "cn") {
    return "Write caption text in Simplified Chinese (简体中文). Keep lines short for mobile Reels.";
  }
  return "Write caption text in English. Keep lines short for mobile Reels.";
}

function normalizeCaptionLine(raw: Partial<CaptionLine>, i: number, durationSec: number): CaptionLine {
  const startSec = Math.max(0, Number(raw.startSec) || 0);
  const endSec = Math.min(durationSec, Math.max(startSec + 0.5, Number(raw.endSec) || startSec + 2));
  return {
    startSec,
    endSec,
    text: String(raw.text ?? "").trim() || `Line ${i + 1}`,
    position:
      raw.position === "top" ||
      raw.position === "center" ||
      raw.position === "bottom" ||
      raw.position === "top-left" ||
      raw.position === "top-right" ||
      raw.position === "bottom-left" ||
      raw.position === "bottom-right"
        ? raw.position
        : "bottom",
  };
}

export function normalizeAdPackPlan(parsed: Partial<AdPackPlan>, durationSec: number): AdPackPlan {
  const captionLines = (Array.isArray(parsed.captionLines) ? parsed.captionLines : [])
    .slice(0, 8)
    .map((line, i) => normalizeCaptionLine(line, i, durationSec));

  if (captionLines.length === 0) {
    captionLines.push({ startSec: 0, endSec: Math.min(3, durationSec), text: "Your ad hook" });
  }

  let voiceoverScript = String(parsed.voiceoverScript ?? "").trim();
  if (!voiceoverScript) {
    voiceoverScript = captionLines
      .map((line) => line.text.trim())
      .filter(Boolean)
      .join("，");
  }
  const maxChars = maxVoiceoverChars(durationSec, "hk");
  if (voiceoverScript.length > maxChars) {
    voiceoverScript = voiceoverScript.slice(0, maxChars).replace(/[，,；;、]$/, "");
  }

  const musicRaw = parsed.music ?? {};
  const promptEn = String(
    (musicRaw as { promptEn?: string }).promptEn ?? "",
  ).trim();
  if (!promptEn) {
    throw new Error("DeepSeek returned an empty music prompt.");
  }

  return {
    hookScript: String(parsed.hookScript ?? "").trim(),
    voiceoverScript,
    captionLines,
    music: {
      styleLabel: String((musicRaw as { styleLabel?: string }).styleLabel ?? "Custom").trim() || "Custom",
      promptEn,
      durationSec: Math.min(
        60,
        Math.max(4, Number((musicRaw as { durationSec?: number }).durationSec) || durationSec),
      ),
      moodTags: Array.isArray((musicRaw as { moodTags?: unknown }).moodTags)
        ? (musicRaw as { moodTags: unknown[] }).moodTags
            .map((t) => String(t).trim())
            .filter(Boolean)
            .slice(0, 5)
        : [],
    },
    sceneNotes: String(parsed.sceneNotes ?? "").trim(),
  };
}

export async function planAdPack(input: {
  product: string;
  headline: string;
  subline: string;
  business: string;
  offer: string;
  promptMarket: PromptMarket;
  durationSec: number;
  brandProfile?: BrandProfile | null;
  videoPrompt?: string;
  promptExtra?: string;
  storyboardScenes?: StoryboardScenePlan[];
  musicMood?: MusicMood;
}): Promise<AdPackPlan> {
  const durationSec = Math.min(60, Math.max(4, input.durationSec));
  const sceneBlock =
    input.storyboardScenes?.length ?
      [
        "Storyboard scene timing (align captions to these beats when possible):",
        ...input.storyboardScenes.map(
          (s) =>
            `- Scene ${s.imageIndex} (${s.startSec}-${s.endSec}s): ${s.sceneDescriptionZh || s.role}`,
        ),
      ].join("\n")
    : "";

  const userBlock = [
    input.brandProfile ? brandProfilePromptBlock(input.brandProfile) : "",
    `Market: ${input.promptMarket}`,
    `Target video duration: ${durationSec} seconds`,
    `Product / concept: ${input.product || input.headline || "(not set)"}`,
    `Business: ${input.business || "(not set)"}`,
    `Marketing headline (captions/voiceover ONLY — do NOT put in imagePrompt): ${input.headline || "(not set)"}`,
    `Marketing subline (captions/voiceover ONLY): ${input.subline || "(not set)"}`,
    `Offer / CTA (captions/voiceover ONLY): ${input.offer || "(not set)"}`,
    input.videoPrompt ? `Video motion context:\n${input.videoPrompt.slice(0, 1200)}` : "",
    input.promptExtra ? `Scene / creative context (for voiceover and captions): ${input.promptExtra}` : "",
    sceneBlock,
    input.musicMood && input.musicMood !== "auto"
      ? `User music mood preference: ${musicMoodHint(input.musicMood)}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const raw = await callDeepSeekChat(
    [
      {
        role: "system",
        content: [
          "You plan SMB social Reel ads: hook script, timed on-screen captions, and instrumental BGM.",
          "Return JSON only.",
          localeHint(input.promptMarket),
          "music.promptEn must be English (for fal AI music API): style, mood, BPM feel, instrumentation, NO vocals.",
        ].join(" "),
      },
      {
        role: "user",
        content: [
          userBlock,
          "",
          "Return JSON:",
          JSON.stringify({
            hookScript: "short hook for the ad",
            voiceoverScript: "optional spoken-style script (not burned into video by default)",
            captionLines: [{ startSec: 0, endSec: 3, text: "caption line" }],
            music: {
              styleLabel: "Custom",
              promptEn: "Soft ambient instrumental, gentle piano, 92 BPM, no vocals, IG reel background",
              durationSec,
              moodTags: ["calm", "warm"],
            },
            sceneNotes: "one line production note for the editor",
          }),
          "",
          "Rules:",
          `- captionLines: 2-5 lines covering 0-${durationSec}s, no overlap, endSec <= ${durationSec}`,
          "- Captions are burned AFTER video — do NOT assume Seedance renders text.",
          `- voiceoverScript: spoken narration; MUST fit ${durationSec}s (~${maxVoiceoverChars(durationSec, "hk")} Chinese chars or ~${maxVoiceoverChars(durationSec, "en")} English words). Short punchy ad copy only.`,
          "- music.styleLabel: short user-facing label (e.g. Upbeat pop, Premium minimal).",
          "- music.promptEn: 20-200 words, instrumental ad BGM only.",
        ].join("\n"),
      },
    ],
    { jsonObject: true, max_tokens: 1800, temperature: 0.5 },
  );

  return normalizeAdPackPlan(parseLlmJsonObject<Partial<AdPackPlan>>(raw), durationSec);
}
