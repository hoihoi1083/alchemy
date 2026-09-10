import type {
  CaptionLine,
  CaptionLineStyle,
  CaptionPosition,
} from "@/lib/ad-pack-types";

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

function clampPct(raw: unknown): number | undefined {
  if (typeof raw !== "number" || !Number.isFinite(raw)) return undefined;
  return Math.min(100, Math.max(0, raw));
}

function normalizeCaptionLineStyle(raw: unknown): CaptionLineStyle | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const style: CaptionLineStyle = {};
  if (typeof o.fill === "string" && o.fill.trim()) style.fill = o.fill.trim();
  if (typeof o.stroke === "string" && o.stroke.trim()) style.stroke = o.stroke.trim();
  if (typeof o.strokeWidth === "number" && Number.isFinite(o.strokeWidth)) {
    style.strokeWidth = o.strokeWidth;
  }
  if (typeof o.fontSizeScale === "number" && Number.isFinite(o.fontSizeScale)) {
    style.fontSizeScale = o.fontSizeScale;
  }
  if (typeof o.shadowColor === "string" && o.shadowColor.trim()) {
    style.shadowColor = o.shadowColor.trim();
  }
  if (typeof o.shadowBlur === "number" && Number.isFinite(o.shadowBlur)) {
    style.shadowBlur = o.shadowBlur;
  }
  return Object.keys(style).length > 0 ? style : undefined;
}

/** Keep preview drag/style fields so burn matches live overlay. */
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
  const line: CaptionLine = {
    startSec,
    endSec,
    text: String(raw.text ?? "").trim() || `Line ${index + 1}`,
    position: normalizeCaptionPosition(raw.position),
  };
  const spoken = String(raw.spokenText ?? "").trim();
  if (spoken) line.spokenText = spoken;
  const stylePreset = String(raw.stylePreset ?? "").trim();
  if (stylePreset) line.stylePreset = stylePreset;
  const xPct = clampPct(raw.xPct);
  if (xPct !== undefined) line.xPct = xPct;
  const yPct = clampPct(raw.yPct);
  if (yPct !== undefined) line.yPct = yPct;
  const style = normalizeCaptionLineStyle(raw.style);
  if (style) line.style = style;
  return line;
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
