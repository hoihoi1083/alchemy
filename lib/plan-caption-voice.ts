import { callDeepSeekChat } from "@/lib/deepseek-client";
import { parseLlmJsonObject } from "@/lib/parse-llm-json";
import type { CaptionLine } from "@/lib/ad-pack-types";
import { captionSpeakText } from "@/lib/ad-pack-types";
import type { VoiceoverLocale } from "@/lib/ad-pack-preferences";
import { clampLineText, joinVoiceoverScript, pickSpokenText } from "@/lib/clamp-line-text";
import { spokenCharBudget } from "@/lib/speech-timing";

function localeHint(locale: VoiceoverLocale): string {
  if (locale === "hk") {
    return [
      "Write in Traditional Chinese (繁體中文), natural Cantonese-friendly Hong Kong ad copy.",
      "每一句必須係完整意思，唔可以斷喺「的／同／同埋／可以／一鍵」中間。",
      "口播通常直接用畫面字幕；只有完整長句裝得落 spokenMaxChars 先寫長過字幕。",
    ].join(" ");
  }
  if (locale === "cn") {
    return [
      "Write in Simplified Chinese (简体中文), natural Mandarin ad copy.",
      "每一句必须是完整意思，不可以断在「的／和／可以／一键」中间。",
      "口播通常直接用画面字幕；只有完整长句装得进 spokenMaxChars 才写得比字幕长。",
    ].join(" ");
  }
  return "Write in natural English ad copy. Every line must be a complete phrase — never end on of/and/with/to.";
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
    "Each line has on-screen text and optional spoken text for TTS.",
    'Return JSON only: { "lines": [ { "index": 0, "text": "...", "spokenText": "..." }, ... ] }.',
    "Rules:",
    `- Exactly ${windows.length} items in lines, matching each input index.`,
    "- text: short COMPLETE slogan for the screen (about screenTargetChars; never exceed screenMaxChars). Full readable phrase only.",
    "- spokenText: normally copy text exactly. Only write a longer line if a COMPLETE sentence fits in spokenMaxChars with no truncation. If it will not fit completely, set spokenText = text.",
    "- Never invent half-phrases (EN: \"You can save hours of\"; ZH: \"你可以節省大量的\" / \"你可以节省大量的\").",
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
    const spokenBudget = Math.max(w.spokenMaxChars, text.length);
    const spokenText = pickSpokenText(text, got?.spokenText, spokenBudget);
    return {
      startSec: w.startSec,
      endSec: w.endSec,
      text,
      spokenText,
      position: i % 2 === 0 ? "bottom" : "top",
    };
  });

  const voiceoverScript = joinVoiceoverScript(
    captionLines.map((l) => captionSpeakText(l)),
    input.locale,
  );

  return {
    captionLines,
    voiceoverScript,
    lineCount: captionLines.length,
  };
}
