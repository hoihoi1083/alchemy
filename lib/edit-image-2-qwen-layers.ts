import sharp from "sharp";

export type AlphaBBox = {
  left: number;
  top: number;
  width: number;
  height: number;
  opaqueCount: number;
  coverage: number;
};

/**
 * Content bbox from RGBA alpha. Returns null if nearly empty.
 */
export async function alphaContentBBox(
  pngBuf: Buffer,
  opts?: { alphaThreshold?: number; minOpaque?: number },
): Promise<AlphaBBox | null> {
  const threshold = opts?.alphaThreshold ?? 12;
  const minOpaque = opts?.minOpaque ?? 24;
  const { data, info } = await sharp(pngBuf)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const ch = info.channels;
  if (!w || !h || ch < 4) return null;

  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;
  let opaque = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const a = data[(y * w + x) * ch + 3]!;
      if (a < threshold) continue;
      opaque += 1;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (opaque < minOpaque || maxX < minX || maxY < minY) return null;
  return {
    left: minX,
    top: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
    opaqueCount: opaque,
    coverage: opaque / (w * h),
  };
}

/** Pick the densest full-frame-ish layer as background plate. */
export function pickBackgroundLayerIndex(
  layers: Array<{ coverage: number; width: number; height: number; frameW: number; frameH: number }>,
): number {
  if (!layers.length) return 0;
  let best = 0;
  let bestScore = -1;
  for (let i = 0; i < layers.length; i++) {
    const L = layers[i]!;
    const areaFrac = (L.width * L.height) / Math.max(1, L.frameW * L.frameH);
    // Prefer high opacity coverage + large footprint.
    const score = L.coverage * 0.65 + areaFrac * 0.35;
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  }
  return best;
}

export function tokensForQwenLayered(): number {
  // fal $0.05 flat → 41 tok at 75% Master yearly (tokensForFalUsd).
  return 41;
}
