/**
 * Input-language gate for Alchemy Studio.
 *
 * ALLOW (no warn): English, Simplified Chinese, Traditional Chinese, mixed EN+中文,
 * URLs, @handles, #hashtags, SKUs / short codes, empty / emoji / digits.
 *
 * GATE: Japanese (kana), Korean (Hangul), and other unsupported letter scripts.
 * TTS also gates EN↔中文 mismatch vs selected voice locale.
 *
 * AI *output* language still follows UI market (see plannerOutputLanguageRule).
 */

import type { VoiceoverLocale } from "@/lib/ad-pack-preferences";

export type InputLanguageClass =
  | "en"
  | "zh"
  | "mixed_en_zh"
  | "allow_noise"
  | "unsupported";

export type InputLanguageIssue =
  | { kind: "none" }
  | {
      kind: "unsupported";
      /** Best-effort label for copy: japanese | korean | other */
      script: "japanese" | "korean" | "other";
    }
  | {
      kind: "voice_mismatch";
      /** What the voice expects */
      expected: "en" | "zh";
      /** What the script looks like */
      got: "en" | "zh" | "mixed" | "unsupported" | "empty";
    };

/** Latin letters only (ASCII). */
const RE_LATIN = /[A-Za-z]/g;
/** Chinese Han — NOT Japanese kana. */
const RE_HAN = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/g;
/** Hiragana + Katakana + halfwidth + extensions. */
const RE_JAPANESE_KANA =
  /[\u3040-\u309f\u30a0-\u30ff\u31f0-\u31ff\uff66-\uff9d]/g;
/** Hangul syllables + jamo + compatibility jamo. */
const RE_HANGUL = /[\u1100-\u11ff\u3130-\u318f\uac00-\ud7af]/g;

const RE_URL =
  /https?:\/\/[^\s]+|www\.[^\s]+|(?:instagram|xiaohongshu|tiktok|facebook)\.com\/[^\s]+|xhslink\.com\/[^\s]+/gi;

/** Session Continue-anyway: keyed by each unsupported field's own text. */
const continuedAcknowledgements = new Set<string>();

function continueKey(text: string): string {
  return text.trim().replace(/\s+/g, " ").slice(0, 800);
}

/**
 * Mark Continue for every field that currently has unsupported script.
 * Keys are per-field text so Setup (6 fields) and Generate (7 fields) stay in sync.
 */
export function markUnsupportedInputContinued(...fields: string[]): void {
  for (const f of fields) {
    if (getUnsupportedInputIssue(f).kind === "unsupported") {
      const key = continueKey(f);
      if (key) continuedAcknowledgements.add(key);
    }
  }
}

export function hasUnsupportedInputContinued(...fields: string[]): boolean {
  // True only when every unsupported field in the list was acknowledged.
  for (const f of fields) {
    if (getUnsupportedInputIssue(f).kind === "unsupported") {
      const key = continueKey(f);
      if (!key || !continuedAcknowledgements.has(key)) return false;
    }
  }
  return true;
}

function countMatches(re: RegExp, text: string): number {
  // Avoid /g lastIndex bugs on reused regexes.
  const flags = re.flags.includes("g") ? re.flags : `${re.flags}g`;
  const copy = new RegExp(re.source, flags);
  const m = text.match(copy);
  return m ? m.length : 0;
}

/** Strip URLs so JP/KR next to a link is still detected. */
function stripUrls(text: string): string {
  return text.replace(RE_URL, " ").replace(/\s+/g, " ").trim();
}

/**
 * True when the string is ONLY noise: empty, URL(s), @handle, #hashtag, short SKU,
 * digits/emoji/punct — with no letter content left after stripping URLs.
 */
export function isAllowNoiseInput(text: string): boolean {
  const t = text.trim();
  if (!t) return true;

  const withoutUrls = stripUrls(t);
  if (!withoutUrls) return true;

  const tokens = withoutUrls.split(/\s+/).filter(Boolean);
  if (tokens.length === 1) {
    const one = tokens[0]!;
    if (/^@[\w.]+$/.test(one)) return true;
    if (/^#[\w\u3400-\u9fff]+$/u.test(one)) return true;
    // Short ASCII SKU / model — no kana/hangul
    if (
      /^[A-Za-z0-9][A-Za-z0-9+._/\-]{0,24}$/.test(one) &&
      !RE_JAPANESE_KANA.test(one) &&
      !RE_HANGUL.test(one)
    ) {
      return true;
    }
  }
  if (
    tokens.length <= 8 &&
    tokens.every(
      (x) =>
        /^#[\w\u3400-\u9fff]+$/u.test(x) ||
        /^@[\w.]+$/.test(x),
    )
  ) {
    return true;
  }

  // Digits / emoji / punctuation only (no letters in any script)
  if (!/\p{L}/u.test(withoutUrls)) return true;

  return false;
}

/**
 * True when text contains Chinese Han (简 or 繁). Excludes kana-only Japanese.
 */
export function textLooksChineseHan(text: string): boolean {
  return countMatches(RE_HAN, text) > 0;
}

/** Latin letters present (English product names, briefs). */
export function textLooksEnglishLatin(text: string): boolean {
  return countMatches(RE_LATIN, text) > 0;
}

/**
 * Detect unsupported letter scripts. Digits (incl. Arabic-Indic / Thai) never count.
 * Uses Unicode letter class + explicit allowlists for Latin / Han / kana / Hangul.
 */
export function detectUnsupportedScript(
  text: string,
): "japanese" | "korean" | "other" | null {
  const t = stripUrls(text.trim());
  if (!t) return null;

  if (countMatches(RE_JAPANESE_KANA, t) >= 1) return "japanese";
  if (countMatches(RE_HANGUL, t) >= 1) return "korean";

  // Any letter that is not Latin and not Han → unsupported "other"
  // (Greek, Cyrillic, Arabic letters, Thai letters, Bengali, Tamil, …)
  // Digits/marks/punct/emoji are ignored via \p{L}.
  for (const ch of t) {
    if (!/\p{L}/u.test(ch)) continue;
    if (/[A-Za-z]/.test(ch)) continue;
    if (/[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/.test(ch)) continue;
    if (/[\u3040-\u309f\u30a0-\u30ff\u31f0-\u31ff\uff66-\uff9d]/.test(ch)) continue;
    if (/[\u1100-\u11ff\u3130-\u318f\uac00-\ud7af]/.test(ch)) continue;
    return "other";
  }
  return null;
}

/**
 * Classify free-text for the input-language gate.
 * EN / 中文 / mixed are all first-class — never treated as errors.
 */
export function classifyInputLanguage(text: string): InputLanguageClass {
  const t = text.trim();
  if (!t) return "allow_noise";
  if (isAllowNoiseInput(t)) return "allow_noise";

  const unsupported = detectUnsupportedScript(t);
  if (unsupported) return "unsupported";

  const body = stripUrls(t);
  const latin = countMatches(RE_LATIN, body);
  const han = countMatches(RE_HAN, body);

  if (latin === 0 && han === 0) return "allow_noise";
  if (latin > 0 && han > 0) return "mixed_en_zh";
  if (han > 0) return "zh";
  return "en";
}

export function isUnsupportedInputLanguage(text: string): boolean {
  return classifyInputLanguage(text) === "unsupported";
}

/**
 * Issue for normal free-text fields (research, studio copy, concept, …).
 * Never flags EN↔中文 — only unsupported scripts.
 */
export function getUnsupportedInputIssue(text: string): InputLanguageIssue {
  const t = text.trim();
  if (!t || isAllowNoiseInput(t)) return { kind: "none" };
  const script = detectUnsupportedScript(t);
  if (!script) return { kind: "none" };
  return { kind: "unsupported", script };
}

/**
 * Aggregate several fields — first unsupported wins.
 */
export function getUnsupportedInputIssueFromFields(
  ...fields: (string | undefined | null)[]
): InputLanguageIssue {
  for (const f of fields) {
    const issue = getUnsupportedInputIssue(f ?? "");
    if (issue.kind !== "none") return issue;
  }
  return { kind: "none" };
}

/**
 * Soft gate for generate paths: every unsupported field must have been Continued.
 * Field lists can differ (Setup vs Generate) as long as the offending text was acknowledged.
 */
export function softGateAllowsProceed(...fields: string[]): boolean {
  return hasUnsupportedInputContinued(...fields);
}

/** Canonical studio copy fields used by soft-warn UI + generateImage. */
export function studioCopyLanguageFields(input: {
  product?: string;
  business?: string;
  headline?: string;
  subline?: string;
  offer?: string;
  promptExtra?: string;
  conceptIdea?: string;
}): string[] {
  return [
    input.product ?? "",
    input.business ?? "",
    input.headline ?? "",
    input.subline ?? "",
    input.offer ?? "",
    input.promptExtra ?? "",
    input.conceptIdea ?? "",
  ];
}

/**
 * TTS / VO gate: unsupported script OR English voice with Chinese-heavy script
 * (or Chinese voice with English-heavy script).
 * Mixed EN+中文 is allowed for both (common brand + Chinese lines).
 */
export function getVoiceoverInputIssue(
  script: string,
  voiceLocale: VoiceoverLocale,
): InputLanguageIssue {
  const t = script.trim();
  if (!t) {
    return { kind: "voice_mismatch", expected: voiceLocale === "en" ? "en" : "zh", got: "empty" };
  }

  const unsupported = detectUnsupportedScript(t);
  if (unsupported) {
    return { kind: "unsupported", script: unsupported };
  }

  if (isAllowNoiseInput(t)) return { kind: "none" };

  const latin = countMatches(RE_LATIN, t);
  const han = countMatches(RE_HAN, t);
  const expected: "en" | "zh" = voiceLocale === "en" ? "en" : "zh";

  if (latin > 0 && han > 0) return { kind: "none" }; // mixed OK
  if (expected === "en" && han > 0 && latin === 0) {
    return { kind: "voice_mismatch", expected: "en", got: "zh" };
  }
  if (expected !== "en" && latin > 0 && han === 0) {
    // Long English sentence on Chinese voice — mismatch.
    // Short product names (≤4 latin tokens, no sentence punctuation) allowed.
    const words = t.split(/\s+/).filter((w) => /[A-Za-z]/.test(w));
    const looksSentence =
      words.length >= 5 || /[.!?]/.test(t) || t.length >= 48;
    if (looksSentence) {
      return { kind: "voice_mismatch", expected: "zh", got: "en" };
    }
  }
  return { kind: "none" };
}

/** True when Han is present (for IG SC→TC hints) — excludes Japanese kana. */
export function topicLooksChineseHan(topic: string): boolean {
  const t = topic.trim();
  if (!t) return false;
  if (detectUnsupportedScript(t)) return false;
  return textLooksChineseHan(t);
}

export function canProceedWithSoftWarn(
  issue: InputLanguageIssue,
  continued: boolean,
): boolean {
  if (issue.kind === "none") return true;
  if (issue.kind === "unsupported") return continued;
  return false;
}

export function canProceedWithVoiceGate(issue: InputLanguageIssue): boolean {
  return issue.kind === "none";
}

/** Shared API error body for VO language rejection (before charging). */
export function voiceoverLanguageRejectPayload(issue: InputLanguageIssue): {
  error: string;
  code: string;
} | null {
  if (issue.kind === "none") return null;
  if (issue.kind === "unsupported") {
    return {
      code: "unsupported_input_language",
      error:
        "Voice script must be English or Chinese. Japanese, Korean, and other scripts are not supported.",
    };
  }
  if (issue.got === "empty") {
    return { code: "voice_script_required", error: "script is required." };
  }
  if (issue.expected === "en") {
    return {
      code: "voice_locale_mismatch",
      error:
        "This voice is English. Please write the script in English (Chinese-only script will not match).",
    };
  }
  return {
    code: "voice_locale_mismatch",
    error:
      "This voice is Chinese. Please write the script in Chinese, or switch to an English voice.",
  };
}
