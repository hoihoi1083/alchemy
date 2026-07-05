/** Drag-and-drop caption clip — free position on frame (unlike preset positions). */
export type VisualCaptionClip = {
  id: string;
  text: string;
  startSec: number;
  endSec: number;
  /** Horizontal center, 0–100% of frame width */
  xPct: number;
  /** Vertical center, 0–100% of frame height */
  yPct: number;
};

export function newVisualCaptionClip(
  partial?: Partial<VisualCaptionClip>,
): VisualCaptionClip {
  return {
    id: partial?.id ?? crypto.randomUUID(),
    text: partial?.text ?? "Your text here",
    startSec: partial?.startSec ?? 0,
    endSec: partial?.endSec ?? 3,
    xPct: partial?.xPct ?? 50,
    yPct: partial?.yPct ?? 82,
  };
}
