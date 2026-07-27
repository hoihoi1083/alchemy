import { callDeepSeekChat } from "@/lib/deepseek-client";
import { parseLlmJsonObject } from "@/lib/parse-llm-json";
import type { CaptionLine } from "@/lib/ad-pack-types";
import { captionSpeakText } from "@/lib/ad-pack-types";
import type { VoiceoverLocale } from "@/lib/ad-pack-preferences";
import { spokenCharBudget } from "@/lib/speech-timing";

function localeHint(locale: VoiceoverLocale): string {
  if (locale === "hk") {
    return "Write spokenText in Traditional Chinese (繁體中文), natural Cantonese-friendly narration.";
  }
  if (locale === "cn") {
    return "Write spokenText in Simplified Chinese (简体中文), natural Mandarin narration.";
  }
  return "Write spokenText in natural English narration.";
}

function clampLineText(text: string, maxChars: number): string {
  const t = text.trim();
  if (t.length <= maxChars) return t;
  return t.slice(0, maxChars).replace(/[，,；;、.。！!？?\s]+$/u, "");
}

export type ExpandSpokenCaptionsInput = {
  captionLines: CaptionLine[];
  locale: VoiceoverLocale;
  product?: string;
};

export type ExpandSpokenCaptionsResult = {
  captionLines: CaptionLine[];
  voiceoverScript: string;
  lineCount: number;
};

/**
 * Keep short on-screen `text` + timings; generate longer `spokenText` to fill each window.
 */
export async function expandSpokenForCaptions(
  input: ExpandSpokenCaptionsInput,
): Promise<ExpandSpokenCaptionsResult> {
  const source = input.captionLines.filter((l) => l.text.trim());
  if (!source.length) {
    throw new Error("At least one caption line with text is required.");
  }

  const windows = source.map((l, i) => {
    const durationSec = Math.max(0.5, l.endSec - l.startSec);
    const budget = spokenCharBudget(durationSec, input.locale);
    return {
      index: i,
      startSec: l.startSec,
      endSec: l.endSec,
      durationSec: Number(durationSec.toFixed(2)),
      text: l.text.trim(),
      ...budget,
    };
  });

  const product = input.product?.trim() || "";
  const system = [
    "You write longer spoken voiceover lines for existing short on-screen captions.",
    "Do NOT change the short on-screen slogan wording in the output text field — only expand spokenText.",
    'Return JSON only: { "lines": [ { "index": 0, "spokenText": "..." }, ... ] }.',
    "Rules:",
    `- Exactly ${windows.length} items, matching each index.`,
    "- spokenText expands the same idea as text (about targetChars; never exceed maxChars). Prefer slightly SHORTER than durationSec so natural TTS fits without cutting words.",
    "- Keep meaning faithful; no new products; no hashtags/emoji.",
    localeHint(input.locale),
  ].join("\n");

  const user = [
    product ? `Product / topic: ${product}` : "Product / topic: (from captions)",
    "Caption windows (keep timings and short text):",
    JSON.stringify(windows, null, 2),
  ].join("\n");

  const raw = await callDeepSeekChat(
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    { temperature: 0.5, max_tokens: 1600, jsonObject: true },
  );

  const parsed = parseLlmJsonObject<{
    lines?: Array<{ index?: number; spokenText?: string }>;
  }>(raw, "Expand spoken captions");

  const byIndex = new Map<number, string>();
  for (const row of parsed.lines ?? []) {
    const idx = Number(row.index);
    const spoken = String(row.spokenText ?? "").trim();
    if (!Number.isFinite(idx) || !spoken) continue;
    byIndex.set(idx, spoken);
  }

  const captionLines: CaptionLine[] = source.map((line, i) => {
    const w = windows[i];
    const spoken = clampLineText(byIndex.get(i) ?? line.text.trim(), w.maxChars);
    return {
      ...line,
      text: line.text.trim(),
      spokenText: spoken,
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
