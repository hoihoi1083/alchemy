import { callDeepSeekChat } from "@/lib/deepseek-client";
import { parseLlmJsonObject } from "@/lib/parse-llm-json";
import type { CaptionLine } from "@/lib/ad-pack-types";
import type { VoiceoverLocale } from "@/lib/ad-pack-preferences";
import { defaultCaptionLineCount } from "@/lib/plan-caption-voice";

function localeHint(locale: VoiceoverLocale): string {
  if (locale === "hk") {
    return "Write spoken lines in Traditional Chinese (繁體中文), natural Cantonese-friendly ad narration for Hong Kong.";
  }
  if (locale === "cn") {
    return "Write spoken lines in Simplified Chinese (简体中文), natural Mandarin ad narration.";
  }
  return "Write spoken lines in natural English ad narration.";
}

function charsPerSec(locale: VoiceoverLocale): number {
  return locale === "en" ? 13 : 5.6;
}

function windowCharBudget(
  durationSec: number,
  locale: VoiceoverLocale,
): { targetChars: number; maxChars: number } {
  const dur = Math.max(0.8, durationSec);
  const perSec = charsPerSec(locale);
  const targetChars = Math.max(
    locale === "en" ? 18 : 11,
    Math.round(dur * perSec * 0.82),
  );
  const maxChars = Math.max(
    targetChars + (locale === "en" ? 8 : 4),
    Math.round(dur * perSec * 0.95),
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
  return Array.from({ length: n }, (_, i) => {
    const startSec = Number((i * slice).toFixed(2));
    const endSec = Number((i === n - 1 ? dur : (i + 1) * slice).toFixed(2));
    const durationSec = Math.max(0.5, endSec - startSec);
    return {
      index: i,
      startSec,
      endSec,
      durationSec: Number(durationSec.toFixed(2)),
      ...windowCharBudget(durationSec, locale),
    };
  });
}

function clampLineText(text: string, maxChars: number): string {
  const t = text.trim();
  if (t.length <= maxChars) return t;
  return t.slice(0, maxChars).replace(/[，,；;、.。！!？?\s]+$/u, "");
}

function splitSourcePhrases(texts: string[]): string[] {
  const out: string[] = [];
  for (const raw of texts) {
    const parts = raw
      .split(/[，,。！!？?\n；;]+/u)
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length) out.push(...parts);
    else if (raw.trim()) out.push(raw.trim());
  }
  return out;
}

/**
 * Pick line count: honor explicit request, else auto from duration,
 * nudged by how many source phrases the user already has (capped 3–8).
 */
export function resolveExpandLineCount(opts: {
  videoDurationSec: number;
  sourcePhraseCount: number;
  lineCount?: number;
}): number {
  if (typeof opts.lineCount === "number" && opts.lineCount >= 2) {
    return Math.min(8, Math.max(2, Math.round(opts.lineCount)));
  }
  const auto = defaultCaptionLineCount(opts.videoDurationSec);
  const fromSource = Math.min(8, Math.max(3, opts.sourcePhraseCount));
  // Prefer auto duration fit; if user already has more phrases, allow up to auto+1.
  return Math.min(8, Math.max(auto, Math.min(fromSource, auto + 1)));
}

export type ExpandCaptionVoiceInput = {
  captionLines: CaptionLine[];
  locale: VoiceoverLocale;
  product?: string;
  videoDurationSec?: number;
  /** Optional joined script; used as extra source material. */
  voiceoverScript?: string;
  /** Override auto line count (2–8). */
  lineCount?: number;
};

export type ExpandCaptionVoiceResult = {
  captionLines: CaptionLine[];
  voiceoverScript: string;
  lineCount: number;
};

/**
 * Expand slogans/script into speakable lines and **reflow caption timings**
 * across the full video so TTS windows match captions (same text for burn + voice).
 */
export async function expandCaptionVoice(
  input: ExpandCaptionVoiceInput,
): Promise<ExpandCaptionVoiceResult> {
  const fromCaptions = input.captionLines
    .map((l) => l.text.trim())
    .filter(Boolean);
  const fromScript = input.voiceoverScript?.trim()
    ? splitSourcePhrases([input.voiceoverScript.trim()])
    : [];
  const sourcePhrases = splitSourcePhrases(
    fromCaptions.length ? fromCaptions : fromScript,
  );
  if (!sourcePhrases.length) {
    throw new Error("At least one caption line or voiceover script is required.");
  }

  const videoDurationSec = Math.max(
    2,
    Number(input.videoDurationSec) ||
      Math.max(...input.captionLines.map((l) => l.endSec), 8),
  );
  const lineCount = resolveExpandLineCount({
    videoDurationSec,
    sourcePhraseCount: sourcePhrases.length,
    lineCount: input.lineCount,
  });
  const windows = buildEvenWindows(videoDurationSec, lineCount, input.locale);

  const product = input.product?.trim() || "";
  const system = [
    "You rewrite ad slogans into timed spoken captions for a short video.",
    "The SAME text is burned on screen and spoken by TTS — keep it readable and speakable.",
    'Return JSON only: { "lines": [ { "index": 0, "text": "..." }, ... ] }.',
    "Rules:",
    `- Exactly ${windows.length} items in lines, matching each input index.`,
    "- Cover a clear arc using the source material (hook → benefit → ease → CTA).",
    "- Each line must fit its window when spoken (about targetChars; never exceed maxChars).",
    "- Do not invent unrelated products; stay faithful to the source phrases.",
    "- No hashtags, no emoji, no stage directions.",
    localeHint(input.locale),
  ].join("\n");

  const user = [
    product ? `Product / topic: ${product}` : "Product / topic: (from slogans)",
    `Video duration: ${videoDurationSec.toFixed(1)}s`,
    `Target line count: ${windows.length} (system-chosen to fit video length)`,
    "Source phrases:",
    JSON.stringify(sourcePhrases, null, 2),
    "Output windows (use these timings; write text only):",
    JSON.stringify(windows, null, 2),
  ].join("\n");

  const raw = await callDeepSeekChat(
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    { temperature: 0.5, max_tokens: 1400, jsonObject: true },
  );

  const parsed = parseLlmJsonObject<{
    lines?: Array<{ index?: number; text?: string }>;
  }>(raw, "Caption voice expand");

  const byIndex = new Map<number, string>();
  for (const row of parsed.lines ?? []) {
    const idx = Number(row.index);
    const text = String(row.text ?? "").trim();
    if (!Number.isFinite(idx) || !text) continue;
    byIndex.set(idx, text);
  }

  const captionLines: CaptionLine[] = windows.map((w, i) => {
    const fallback = sourcePhrases[i % sourcePhrases.length] ?? sourcePhrases[0];
    const text = clampLineText(byIndex.get(i) ?? fallback, w.maxChars);
    return {
      startSec: w.startSec,
      endSec: w.endSec,
      text,
      position: i % 2 === 0 ? "bottom" : "top",
    };
  });

  const voiceoverScript = captionLines.map((l) => l.text.trim()).filter(Boolean).join("，");

  return {
    captionLines,
    voiceoverScript,
    lineCount: captionLines.length,
  };
}
