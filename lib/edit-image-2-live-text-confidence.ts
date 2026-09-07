/**
 * Decide when OCR text is safe to show as live Konva type (Canva-like).
 * Latin / numbers / short brands: prefer live.
 * Chinese: only short, clean phrases with decent score — else keep pixel crop.
 */

import { isWeakOcrLabel } from "@/lib/edit-image-2-boxes";
import type { TextRole } from "@/lib/edit-image-2-text-structure";

export type LiveTextAssessment = {
  preferLive: boolean;
  text: string;
  reason: "latin_strong" | "latin" | "cjk_clean" | "weak" | "pixel_safer" | "pill_style";
};

function cleanLine(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function assessOneLine(
  raw: string,
  score: number,
  role: TextRole,
): LiveTextAssessment {
  const text = cleanLine(raw);
  if (!text || isWeakOcrLabel(text)) {
    return { preferLive: false, text: "", reason: "weak" };
  }

  // Stylized callout pills — keep pixel look (yellow outline etc.).
  if (role === "pill") {
    return { preferLive: false, text, reason: "pill_style" };
  }

  const hasHan = /[\u4e00-\u9fff]/.test(text);
  const latinOnly = text.replace(/[^A-Za-z0-9]/g, "");

  if (!hasHan) {
    // Brands / jersey / numbers
    if (/^[A-Z0-9][A-Z0-9 \-_.']{0,47}$/i.test(text) && text.length <= 48) {
      return { preferLive: true, text, reason: "latin_strong" };
    }
    if (latinOnly.length >= 2 && (score >= 0.35 || latinOnly.length <= 12)) {
      return { preferLive: true, text, reason: "latin" };
    }
    return { preferLive: false, text, reason: "pixel_safer" };
  }

  // Chinese: conservative — short clean CJK (+ light punctuation)
  const compact = text.replace(/\s+/g, "");
  const hanCount = (compact.match(/[\u4e00-\u9fff]/g) || []).length;
  const allowedOther = (
    compact.match(/[0-9A-Za-z：:，,。！!？?、·\-—（）()【】\[\]"""'']/g) || []
  ).length;
  const weird = compact.length - hanCount - allowedOther;
  if (
    hanCount >= 2 &&
    weird <= 1 &&
    compact.length <= 28 &&
    score >= 0.5 &&
    role !== "label"
  ) {
    return { preferLive: true, text: compact, reason: "cjk_clean" };
  }

  // Don't put bad Chinese into live text — empty edit field, keep pixels
  return { preferLive: false, text: "", reason: "pixel_safer" };
}

/**
 * Multi-line body: live only if every line is live-safe (usually Latin blocks).
 * Mixed CJK blocks stay pixel unless each line is cjk_clean.
 */
export function assessLiveTextConfidence(opts: {
  label: string;
  score: number;
  role: TextRole;
  lines?: string[];
}): LiveTextAssessment {
  const lines = (opts.lines?.length ? opts.lines : opts.label.split("\n"))
    .map(cleanLine)
    .filter(Boolean);
  if (!lines.length) {
    return { preferLive: false, text: "", reason: "weak" };
  }

  if (lines.length === 1) {
    return assessOneLine(lines[0]!, opts.score, opts.role);
  }

  const assessments = lines.map((ln) => assessOneLine(ln, opts.score, opts.role));
  if (assessments.every((a) => a.preferLive && a.text)) {
    return {
      preferLive: true,
      text: assessments.map((a) => a.text).join("\n"),
      reason: assessments.some((a) => a.reason === "cjk_clean")
        ? "cjk_clean"
        : "latin",
    };
  }

  // Partial confidence: keep pixel crop; still expose best Latin lines as editText hint
  const latinBits = assessments
    .filter((a) => a.preferLive && a.text && !/[\u4e00-\u9fff]/.test(a.text))
    .map((a) => a.text);
  return {
    preferLive: false,
    text: latinBits.length ? latinBits.join("\n") : "",
    reason: "pixel_safer",
  };
}
