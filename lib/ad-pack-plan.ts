import type { BrandProfile } from "@/lib/brand-profile";
import { brandProfilePromptBlock } from "@/lib/brand-profile";
import { callDeepSeekChat } from "@/lib/deepseek-client";
import { parseLlmJsonObject } from "@/lib/parse-llm-json";
import type { PromptMarket } from "@/lib/prompt-variables";
import type { AdPackHookVariant, AdPackPlan, CaptionLine } from "@/lib/ad-pack-types";
import type { MusicMood } from "@/lib/ad-pack-preferences";
import { musicMoodHint, maxVoiceoverChars } from "@/lib/ad-pack-preferences";
import type { StoryboardScenePlan } from "@/lib/video-storyboard-types";
import { layoutHookSplitCaptions } from "@/lib/ad-pack-hook-captions";

function localeHint(market: PromptMarket): string {
  if (market === "hk" || market === "tw") {
    return "Write caption text in Traditional Chinese (繁體中文). Keep lines short for mobile Reels.";
  }
  if (market === "cn") {
    return "Write caption text in Simplified Chinese (简体中文). Keep lines short for mobile Reels.";
  }
  return "Write caption text in English. Keep lines short for mobile Reels.";
}

function trimVoiceover(script: string, durationSec: number): string {
  const maxChars = maxVoiceoverChars(durationSec, "hk");
  if (script.length <= maxChars) return script;
  return script.slice(0, maxChars).replace(/[，,；;、]$/, "");
}

function normalizeHookVariant(
  raw: Partial<AdPackHookVariant>,
  durationSec: number,
  index: number,
): AdPackHookVariant {
  let voiceoverScript = String(raw.voiceoverScript ?? "").trim();
  const hookScript =
    String(raw.hookScript ?? "").trim() ||
    (Array.isArray(raw.captionLines) ? String(raw.captionLines[0]?.text ?? "").trim() : "") ||
    `Hook ${index + 1}`;

  if (!voiceoverScript && Array.isArray(raw.captionLines)) {
    voiceoverScript = raw.captionLines
      .map((line) => String(line.text ?? "").trim())
      .filter(Boolean)
      .join("，");
  }
  voiceoverScript = trimVoiceover(voiceoverScript, durationSec);

  const captionLines = layoutHookSplitCaptions(hookScript, voiceoverScript, durationSec);

  return {
    hookScript,
    voiceoverScript,
    captionLines,
  };
}

function buildHookVariants(parsed: Partial<AdPackPlan>, durationSec: number): AdPackHookVariant[] {
  const fromArray = (Array.isArray(parsed.hookVariants) ? parsed.hookVariants : [])
    .map((variant, i) => normalizeHookVariant(variant, durationSec, i))
    .filter((variant) => variant.hookScript.trim());

  if (fromArray.length >= 3) {
    return fromArray.slice(0, 3);
  }

  const legacy = normalizeHookVariant(
    {
      hookScript: parsed.hookScript,
      voiceoverScript: parsed.voiceoverScript,
      captionLines: parsed.captionLines,
    },
    durationSec,
    0,
  );

  if (fromArray.length === 0) {
    return [legacy];
  }

  return fromArray;
}

function inferAdPackDurationSec(plan: AdPackPlan): number {
  const fromCaptions = plan.captionLines.map((line) => line.endSec);
  const fromVariants = (plan.hookVariants ?? []).flatMap((variant) =>
    variant.captionLines.map((line) => line.endSec),
  );
  return Math.min(60, Math.max(4, ...fromCaptions, ...fromVariants, plan.music?.durationSec ?? 10));
}

export function ensureAdPackHookVariants(plan: AdPackPlan): AdPackPlan {
  const durationSec = inferAdPackDurationSec(plan);

  if (plan.hookVariants?.length) {
    const hookVariants = plan.hookVariants.map((variant) => ({
      ...variant,
      captionLines: layoutHookSplitCaptions(
        variant.hookScript,
        variant.voiceoverScript,
        durationSec,
      ),
    }));
    const active =
      hookVariants.find(
        (variant) =>
          variant.hookScript === plan.hookScript &&
          variant.voiceoverScript === plan.voiceoverScript,
      ) ?? hookVariants[0];
    return {
      ...plan,
      hookVariants,
      hookScript: active.hookScript,
      voiceoverScript: active.voiceoverScript,
      captionLines: active.captionLines,
    };
  }

  const legacy: AdPackHookVariant = {
    hookScript: plan.hookScript,
    voiceoverScript: plan.voiceoverScript,
    captionLines: layoutHookSplitCaptions(plan.hookScript, plan.voiceoverScript, durationSec),
  };
  return {
    ...plan,
    hookScript: legacy.hookScript,
    voiceoverScript: legacy.voiceoverScript,
    captionLines: legacy.captionLines,
    hookVariants: [legacy],
  };
}

export function normalizeAdPackPlan(parsed: Partial<AdPackPlan>, durationSec: number): AdPackPlan {
  const hookVariants = buildHookVariants(parsed, durationSec);
  const active = hookVariants[0] ?? normalizeHookVariant({}, durationSec, 0);
  const captionLines = active.captionLines;
  const voiceoverScript = active.voiceoverScript;
  const hookScript = active.hookScript;

  const musicRaw = parsed.music ?? {};
  const promptEn = String(
    (musicRaw as { promptEn?: string }).promptEn ?? "",
  ).trim();
  if (!promptEn) {
    throw new Error("DeepSeek returned an empty music prompt.");
  }

  return {
    hookScript,
    voiceoverScript,
    captionLines,
    hookVariants,
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
            hookVariants: [
              {
                hookScript: "short hook angle 1",
                voiceoverScript: "spoken script for angle 1",
              },
              {
                hookScript: "short hook angle 2",
                voiceoverScript: "spoken script for angle 2",
              },
              {
                hookScript: "short hook angle 3",
                voiceoverScript: "spoken script for angle 3",
              },
            ],
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
          "- hookVariants: EXACTLY 3 distinct marketing angles for the same product (different hooks, not paraphrases).",
          "- Each variant: hookScript (short punchy hook, 1 line) + voiceoverScript (product line, 1 line). UI burns hook top-center and voiceover bottom-center.",
          `- voiceoverScript per variant: spoken narration; MUST fit ${durationSec}s (~${maxVoiceoverChars(durationSec, "hk")} Chinese chars or ~${maxVoiceoverChars(durationSec, "en")} English words). Short punchy ad copy only.`,
          "- music.styleLabel: short user-facing label (e.g. Upbeat pop, Premium minimal).",
          "- music.promptEn: 20-200 words, instrumental ad BGM only.",
        ].join("\n"),
      },
    ],
    { jsonObject: true, max_tokens: 1800, temperature: 0.5 },
  );

  return normalizeAdPackPlan(parseLlmJsonObject<Partial<AdPackPlan>>(raw), durationSec);
}
