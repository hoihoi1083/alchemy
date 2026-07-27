/**
 * Truncate caption / spoken lines without leaving mid-word Latin junk
 * or mid-phrase CJK cuts like "一键生成营销素".
 */

/** English connectors / prepositions left dangling after a hard cut. */
const DANGLING_EN =
  /\b(a|an|the|and|or|but|of|to|for|with|in|on|at|by|from|into|your|our|my|its|is|are|be|can|will|just|simply|easily|any)\s*$/i;

/**
 * CJK particles / connectives that usually mean the line was cut mid-thought.
 * Traditional + simplified covered by the same code points where identical.
 */
const DANGLING_CJK =
  /[的地得与和及以把被从在了着过而就都也还要会能可对让给跟同或但因所之乎于並并與為为]$/u;

function isCjkHeavy(text: string): boolean {
  const cjk = text.match(/[\u3040-\u30ff\u3400-\u9fff\uf900-\ufaff]/gu);
  if (!cjk) return false;
  return cjk.join("").length >= Math.ceil(text.replace(/\s/g, "").length * 0.4);
}

function stripTrailingDangling(text: string): string {
  let cut = text.trim();
  const minKeep = Math.max(2, Math.floor(cut.length * 0.45));
  while (cut.length > minKeep && (DANGLING_CJK.test(cut) || DANGLING_EN.test(cut))) {
    cut = cut.slice(0, -1).trimEnd();
  }
  return cut.replace(/[，,；;、.。！!？?\s]+$/u, "").trim();
}

export function clampLineText(text: string, maxChars: number): string {
  const t = text.trim();
  if (maxChars <= 0) return "";
  if (t.length <= maxChars) return t;

  let cut = t.slice(0, maxChars);
  // Prefer breaking on whitespace / CJK punctuation rather than mid-word.
  const boundary = cut.search(/[\s，,；;、.。！!？?]+[^\s，,；;、.。！!？?]*$/u);
  if (boundary >= Math.floor(maxChars * 0.45)) {
    cut = cut.slice(0, boundary);
  } else {
    const lastSpace = cut.lastIndexOf(" ");
    const looksLatin = /[A-Za-z]/.test(cut);
    if (looksLatin && lastSpace >= Math.floor(maxChars * 0.45)) {
      cut = cut.slice(0, lastSpace);
    }
  }
  cut = cut.replace(/[，,；;、.。！!？?\s]+$/u, "").trim();
  if (isCjkHeavy(cut) || DANGLING_CJK.test(cut)) {
    cut = stripTrailingDangling(cut);
  }
  return cut;
}

export function looksIncompleteSpoken(text: string): boolean {
  const t = text.trim();
  if (!t) return true;
  if (DANGLING_EN.test(t)) return true;
  if (DANGLING_CJK.test(t)) return true;
  if (/[,:;，、；：\-–—]$/u.test(t)) return true;
  return false;
}

/**
 * Prefer a complete on-screen caption over a butchered “longer” spoken line.
 * Works for English and Chinese (hk/cn): never keep an expansion that had to
 * be sliced, or that ends mid-thought.
 */
export function pickSpokenText(
  onScreenText: string,
  spokenCandidate: string | undefined | null,
  maxChars: number,
): string {
  const screen = onScreenText.trim();
  if (!screen) return "";
  const budget = Math.max(1, maxChars);
  const candidate = (spokenCandidate ?? "").trim();

  const usable =
    Boolean(candidate) &&
    candidate !== screen &&
    candidate.length <= budget &&
    candidate.length >= screen.length &&
    !looksIncompleteSpoken(candidate);

  if (usable) return candidate;

  if (screen.length <= budget) return screen;
  const clamped = clampLineText(screen, budget);
  // Incomplete speech is worse than slightly over the TTS window.
  if (!clamped || looksIncompleteSpoken(clamped)) return screen;
  return clamped;
}

/** Join spoken lines for the continuous preview script box. */
export function joinVoiceoverScript(
  lines: string[],
  locale: "en" | "hk" | "cn" = "en",
): string {
  const sep = locale === "en" ? " · " : "，";
  return lines.map((s) => s.trim()).filter(Boolean).join(sep);
}
