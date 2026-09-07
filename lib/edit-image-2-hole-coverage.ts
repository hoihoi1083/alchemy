export type HoleRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

/**
 * Approximate union coverage of hole rects on the image (0–1).
 * Used to skip full-frame FLUX erase when detect boxes cover too much —
 * that was wiping most of the plate into empty/broken background.
 */
export function holeUnionCoverage(
  holes: HoleRect[],
  imgW: number,
  imgH: number,
  grid = 256,
): number {
  if (!holes.length || imgW < 1 || imgH < 1) return 0;
  const mw = Math.max(8, Math.min(grid, imgW));
  const mh = Math.max(8, Math.min(grid, imgH));
  const sx = mw / imgW;
  const sy = mh / imgH;
  const mask = new Uint8Array(mw * mh);
  for (const r of holes) {
    const x0 = Math.max(0, Math.floor(r.left * sx));
    const y0 = Math.max(0, Math.floor(r.top * sy));
    const x1 = Math.min(mw, Math.ceil((r.left + r.width) * sx));
    const y1 = Math.min(mh, Math.ceil((r.top + r.height) * sy));
    for (let y = y0; y < y1; y++) {
      const row = y * mw;
      for (let x = x0; x < x1; x++) mask[row + x] = 1;
    }
  }
  let n = 0;
  for (let i = 0; i < mask.length; i++) n += mask[i]!;
  return n / mask.length;
}

/** Above this, prefer local ring-fill over FLUX erase. */
export const ERASE_COVERAGE_LIMIT = 0.42;

/**
 * Fill can handle larger holes than erase (scene continuation).
 * Above this, skip generative and use local — but avoid for dark photos
 * (local → solid black). Prefer raising this over forcing local on stadium ads.
 */
export const FILL_COVERAGE_LIMIT = 0.72;
