import sharp from "sharp";
import type { HealRect } from "@/lib/edit-image-2-local-heal";

/**
 * True when the hole region barely changed — erase/fill left the component
 * (or painted almost nothing). Used to reject failed generative heals.
 */
export async function holeContentBarelyChanged(
  before: Buffer,
  after: Buffer,
  hole: HealRect,
  imgW: number,
  imgH: number,
): Promise<boolean> {
  const hl = Math.max(0, Math.min(hole.left, imgW - 1));
  const ht = Math.max(0, Math.min(hole.top, imgH - 1));
  const hw = Math.max(1, Math.min(hole.width, imgW - hl));
  const hh = Math.max(1, Math.min(hole.height, imgH - ht));

  const extract = async (buf: Buffer) =>
    sharp(buf)
      .extract({ left: hl, top: ht, width: hw, height: hh })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

  try {
    const [a, b] = await Promise.all([extract(before), extract(after)]);
    if (a.data.length !== b.data.length || a.data.length < 3) return true;
    let sum = 0;
    const n = a.data.length;
    for (let i = 0; i < n; i++) {
      sum += Math.abs(a.data[i]! - b.data[i]!);
    }
    const mad = sum / n;
    // Nearly identical hole → component still sitting on the plate.
    return mad < 6;
  } catch {
    return false;
  }
}
