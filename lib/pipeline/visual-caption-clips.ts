import type { VisualCaptionClip } from "@/lib/visual-caption-types";

export function parseVisualCaptionClips(
  raw: unknown,
  durationSec = 60,
): VisualCaptionClip[] {
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
    .map((row, index) => {
      if (!row || typeof row !== "object") return null;
      const o = row as Partial<VisualCaptionClip>;
      const text = String(o.text ?? "").trim();
      if (!text) return null;
      const startSec = Math.max(0, Number(o.startSec) || 0);
      const endSec = Math.min(
        durationSec,
        Math.max(startSec + 0.3, Number(o.endSec) || startSec + 2),
      );
      const xPct = Math.min(100, Math.max(0, Number(o.xPct) || 50));
      const yPct = Math.min(100, Math.max(0, Number(o.yPct) || 82));
      return {
        id: String(o.id ?? `clip-${index}`),
        text,
        startSec,
        endSec,
        xPct,
        yPct,
      } satisfies VisualCaptionClip;
    })
    .filter(Boolean) as VisualCaptionClip[];
}
