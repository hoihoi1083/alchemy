/**
 * Make poster text crops closer to "pure text":
 * key out near-uniform plate color (colored bars / white paper) → RGBA.
 * Not true vector text — but movable without dragging a solid rectangle.
 */

export type Rgba = { r: number; g: number; b: number; a: number };

function dist2(a: Rgba, b: Rgba): number {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return dr * dr + dg * dg + db * db;
}

/** Median RGB of a list of samples. */
export function medianRgb(samples: Rgba[]): Rgba {
  if (!samples.length) return { r: 255, g: 255, b: 255, a: 255 };
  const rs = samples.map((s) => s.r).sort((a, b) => a - b);
  const gs = samples.map((s) => s.g).sort((a, b) => a - b);
  const bs = samples.map((s) => s.b).sort((a, b) => a - b);
  const mid = Math.floor(samples.length / 2);
  return { r: rs[mid]!, g: gs[mid]!, b: bs[mid]!, a: 255 };
}

/** Sample corner patches — poster text bars are usually uniform at edges. */
export function sampleCornerBg(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  patch = 4,
): Rgba {
  const samples: Rgba[] = [];
  const push = (x0: number, y0: number) => {
    for (let y = y0; y < Math.min(h, y0 + patch); y++) {
      for (let x = x0; x < Math.min(w, x0 + patch); x++) {
        const i = (y * w + x) * 4;
        samples.push({
          r: data[i]!,
          g: data[i + 1]!,
          b: data[i + 2]!,
          a: data[i + 3]!,
        });
      }
    }
  };
  push(0, 0);
  push(Math.max(0, w - patch), 0);
  push(0, Math.max(0, h - patch));
  push(Math.max(0, w - patch), Math.max(0, h - patch));
  return medianRgb(samples);
}

/**
 * Key out pixels close to corner bg color; flood from edges for solid plates.
 * Returns same-size RGBA buffer (may still include soft edges).
 */
export function keyUniformBackground(
  rgba: Uint8ClampedArray,
  w: number,
  h: number,
  opts?: { threshold?: number },
): { data: Uint8ClampedArray; keyedRatio: number } {
  const threshold = opts?.threshold ?? 38; // ~Euclidean in 0–255
  const thr2 = threshold * threshold;
  const bg = sampleCornerBg(rgba, w, h);
  const out = new Uint8ClampedArray(rgba);
  const keyed = new Uint8Array(w * h);

  for (let i = 0, p = 0; i < out.length; i += 4, p++) {
    const pix = { r: out[i]!, g: out[i + 1]!, b: out[i + 2]!, a: out[i + 3]! };
    if (dist2(pix, bg) <= thr2) {
      out[i + 3] = 0;
      keyed[p] = 1;
    }
  }

  // Edge flood: grow keyed region through near-bg pixels (covers anti-aliased bars).
  const q: number[] = [];
  const pushEdge = (x: number, y: number) => {
    const p = y * w + x;
    if (keyed[p]) q.push(p);
  };
  for (let x = 0; x < w; x++) {
    pushEdge(x, 0);
    pushEdge(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    pushEdge(0, y);
    pushEdge(w - 1, y);
  }

  const growThr2 = (threshold + 18) * (threshold + 18);
  while (q.length) {
    const p = q.pop()!;
    const x = p % w;
    const y = (p / w) | 0;
    const neigh = [
      [x - 1, y],
      [x + 1, y],
      [x, y - 1],
      [x, y + 1],
    ];
    for (const [nx, ny] of neigh) {
      if (nx! < 0 || ny! < 0 || nx! >= w || ny! >= h) continue;
      const np = ny! * w + nx!;
      if (keyed[np]) continue;
      const i = np * 4;
      const pix = { r: out[i]!, g: out[i + 1]!, b: out[i + 2]!, a: out[i + 3]! };
      if (dist2(pix, bg) <= growThr2) {
        out[i + 3] = 0;
        keyed[np] = 1;
        q.push(np);
      }
    }
  }

  let keyedCount = 0;
  for (let p = 0; p < keyed.length; p++) if (keyed[p]) keyedCount += 1;
  return { data: out, keyedRatio: keyedCount / Math.max(1, w * h) };
}

/** Content bbox of opaque pixels; null if empty. */
export function opaqueBBox(
  rgba: Uint8ClampedArray,
  w: number,
  h: number,
  alphaMin = 12,
): { left: number; top: number; width: number; height: number } | null {
  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (rgba[(y * w + x) * 4 + 3]! < alphaMin) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < minX || maxY < minY) return null;
  return {
    left: minX,
    top: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

/**
 * True when corners and center share one plate color (solid bar / paper).
 * False for pill buttons (dark ends + light center) — keying leaves a white box.
 */
export function plateLooksUniform(
  rgba: Uint8ClampedArray,
  w: number,
  h: number,
  opts?: { threshold?: number },
): boolean {
  if (w < 4 || h < 4) return false;
  const threshold = opts?.threshold ?? 38;
  const thr2 = threshold * threshold;
  const bg = sampleCornerBg(rgba, w, h);
  const cx = Math.floor(w / 2);
  const cy = Math.floor(h / 2);
  const patch = Math.max(2, Math.min(6, Math.floor(Math.min(w, h) / 4)));
  const samples: Rgba[] = [];
  for (let y = Math.max(0, cy - patch); y < Math.min(h, cy + patch); y++) {
    for (let x = Math.max(0, cx - patch); x < Math.min(w, cx + patch); x++) {
      const i = (y * w + x) * 4;
      samples.push({
        r: rgba[i]!,
        g: rgba[i + 1]!,
        b: rgba[i + 2]!,
        a: rgba[i + 3]!,
      });
    }
  }
  const center = medianRgb(samples);
  return dist2(center, bg) <= thr2 * 2.25;
}

/**
 * Decide whether keying helped: enough bg removed, enough glyph left.
 * Reject if almost everything gone (threshold too aggressive) or nothing keyed.
 */
export function keyingLooksUseful(keyedRatio: number, remainingOpaqueRatio: number): boolean {
  if (keyedRatio < 0.18) return false;
  if (remainingOpaqueRatio < 0.04) return false;
  if (remainingOpaqueRatio > 0.85) return false;
  if (remainingOpaqueRatio > 0.92 && keyedRatio < 0.2) return false;
  return true;
}
