import { callDeepSeekChat } from "@/lib/deepseek-client";
import { parseLlmJsonObject } from "@/lib/parse-llm-json";
import type { CaptionLine } from "@/lib/ad-pack-types";
import { captionSpeakText } from "@/lib/ad-pack-types";
import type { VoiceoverLocale } from "@/lib/ad-pack-preferences";

function localeHint(locale: VoiceoverLocale): string {
  if (locale === "hk") {
    return "Write in Traditional Chinese (繁體中文), natural Cantonese-friendly Hong Kong ad copy.";
  }
  if (locale === "cn") {
    return "Write in Simplified Chinese (简体中文), natural Mandarin ad copy.";
  }
  return "Write in natural English ad copy.";
}

/** Prefer 4–6 lines from video length (about one beat every ~3–5s). */
export function defaultCaptionLineCount(videoDurationSec: number): number {
  const dur = Math.max(4, videoDurationSec);
  if (dur <= 8) return 3;
  if (dur <= 12) return 4;
  if (dur <= 18) return 5;
  if (dur <= 28) return 6;
  return 7;
}

/** On-screen slogan budget — keep captions short. */
function screenCharBudget(locale: VoiceoverLocale): { targetChars: number; maxChars: number } {
  if (locale === "en") return { targetChars: 28, maxChars: 40 };
  return { targetChars: 8, maxChars: 12 };
}

/** Spoken TTS budget — fill most of the caption window. */
function spokenCharBudget(
  durationSec: number,
  locale: VoiceoverLocale,
): { targetChars: number; maxChars: number } {
  const dur = Math.max(0.8, durationSec);
  const perSec = locale === "en" ? 13 : 5.6;
  const targetChars = Math.max(
    locale === "en" ? 22 : 14,
    Math.round(dur * perSec * 0.88),
  );
  const maxChars = Math.max(
    targetChars + (locale === "en" ? 10 : 5),
    Math.round(dur * perSec),
  );
  return { targetChars, maxChars };
}

function buildEvenWindows(
  videoDurationSec: number,
  lineCount: number,
  locale: VoiceoverLocale,
) {
  const dur = Math.max(2, videoDurationSec);
  const n = Math.max(2, Math.min(8, lineCount));
  const slice = dur / n;
  const screen = screenCharBudget(locale);
  return Array.from({ length: n }, (_, i) => {
    const startSec = Number((i * slice).toFixed(2));
    const endSec = Number((i === n - 1 ? dur : (i + 1) * slice).toFixed(2));
    const durationSec = Math.max(0.5, endSec - startSec);
    const spoken = spokenCharBudget(durationSec, locale);
    return {
      index: i,
      startSec,
      endSec,
      durationSec: Number(durationSec.toFixed(2)),
      screenTargetChars: screen.targetChars,
      screenMaxChars: screen.maxChars,
      spokenTargetChars: spoken.targetChars,
      spokenMaxChars: spoken.maxChars,
    };
  });
}

function clampLineText(text: string, maxChars: number): string {
  const t = text.trim();
  if (t.length <= maxChars) return t;
  return t.slice(0, maxChars).replace(/[，,；;、.。！!？?\s]+$/u, "");
}

export type PlanCaptionVoiceInput = {
  topic: string;
  locale: VoiceoverLocale;
  videoDurationSec: number;
  lineCount?: number;
};

export type PlanCaptionVoiceResult = {
  captionLines: CaptionLine[];
  voiceoverScript: string;
  lineCount: number;
};

/**
 * Plan short on-screen captions + longer spoken lines that fill each time window.
 */
export async function planCaptionVoice(
  input: PlanCaptionVoiceInput,
): Promise<PlanCaptionVoiceResult> {
  const topic = input.topic.trim();
  if (!topic) throw new Error("topic is required.");

  const videoDurationSec = Math.max(2, Number(input.videoDurationSec) || 8);
  const lineCount =
    typeof input.lineCount === "number" && input.lineCount >= 2
      ? Math.min(8, Math.round(input.lineCount))
      : defaultCaptionLineCount(videoDurationSec);

  const windows = buildEvenWindows(videoDurationSec, lineCount, input.locale);

  const system = [
    "You plan timed captions for a short social video.",
    "Each line has SHORT on-screen text and LONGER spoken text for TTS.",
    'Return JSON only: { "lines": [ { "index": 0, "text": "...", "spokenText": "..." }, ... ] }.',
    "Rules:",
    `- Exactly ${windows.length} items in lines, matching each input index.`,
    "- text: short slogan for the screen (about screenTargetChars; never exceed screenMaxChars).",
    "- spokenText: fuller spoken sentence for the same idea (about spokenTargetChars; never exceed spokenMaxChars) so TTS nearly fills durationSec.",
    "- spokenText must expand the same meaning as text — do not change the selling point.",
    "- Cover hook → benefit → ease → CTA across the lines.",
    "- No hashtags, no emoji, no stage directions.",
    "- Stay faithful to the user's topic.",
    localeHint(input.locale),
  ].join("\n");

  const user = [
    `Topic / idea: ${topic}`,
    `Video duration: ${videoDurationSec.toFixed(1)}s`,
    `Line count: ${windows.length}`,
    "Windows:",
    JSON.stringify(windows, null, 2),
  ].join("\n");

  const raw = await callDeepSeekChat(
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    { temperature: 0.55, max_tokens: 1800, jsonObject: true },
  );

  const parsed = parseLlmJsonObject<{
    lines?: Array<{ index?: number; text?: string; spokenText?: string }>;
  }>(raw, "Caption voice plan");

  const byIndex = new Map<number, { text: string; spokenText: string }>();
  for (const row of parsed.lines ?? []) {
    const idx = Number(row.index);
    const text = String(row.text ?? "").trim();
    const spokenText = String(row.spokenText ?? row.text ?? "").trim();
    if (!Number.isFinite(idx) || !text) continue;
    byIndex.set(idx, { text, spokenText });
  }

  const captionLines: CaptionLine[] = windows.map((w, i) => {
    const fallback =
      input.locale === "en"
        ? topic.slice(0, Math.min(40, w.screenMaxChars))
        : topic.slice(0, Math.min(12, w.screenMaxChars));
    const got = byIndex.get(i);
    const text = clampLineText(got?.text ?? fallback, w.screenMaxChars);
    const spokenText = clampLineText(
      got?.spokenText ?? text,
      w.spokenMaxChars,
    );
    return {
      startSec: w.startSec,
      endSec: w.endSec,
      text,
      spokenText,
      position: i % 2 === 0 ? "bottom" : "top",
    };
  });

  const voiceoverScript = captionLines
    .map((l) => captionSpeakText(l))
    .filter(Boolean)
    .join("，");

  return {
    captionLines,
    voiceoverScript,
    lineCount: captionLines.length,
  };
}
