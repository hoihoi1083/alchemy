import type { CaptionLine, CaptionPosition } from "@/lib/ad-pack-types";

const VALID_POSITIONS = new Set<CaptionPosition>([
  "top",
  "center",
  "bottom",
  "top-left",
  "top-right",
  "bottom-left",
  "bottom-right",
]);

export function normalizeCaptionPosition(raw: unknown): CaptionPosition {
  const value = String(raw ?? "").trim() as CaptionPosition;
  return VALID_POSITIONS.has(value) ? value : "bottom";
}

export function normalizeCaptionLine(
  raw: Partial<CaptionLine>,
  durationSec: number,
  index = 0,
): CaptionLine {
  const startSec = Math.max(0, Number(raw.startSec) || 0);
  const endSec = Math.min(
    durationSec,
    Math.max(startSec + 0.3, Number(raw.endSec) || startSec + 2),
  );
  return {
    startSec,
    endSec,
    text: String(raw.text ?? "").trim() || `Line ${index + 1}`,
    position: normalizeCaptionPosition(raw.position),
  };
}

export function parseCaptionLinesInput(raw: unknown, durationSec = 60): CaptionLine[] {
  let parsed: unknown = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map((line, index) => {
      if (!line || typeof line !== "object") return null;
      const row = line as Partial<CaptionLine>;
      const text = String(row.text ?? "").trim();
      if (!text) return null;
      return normalizeCaptionLine(row, durationSec, index);
    })
    .filter(Boolean) as CaptionLine[];
}
