import sharp from "sharp";

export type HealRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

/**
 * True when the plate is a flat light poster (white/cream UI).
 * Dark stadium / photo plates must NOT use local ring-fill (that paints solid black).
 */
export async function plateLooksFlatBright(imgBuf: Buffer): Promise<boolean> {
  const { data, info } = await sharp(imgBuf)
    .resize(48, 48, { fit: "fill" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const ch = info.channels;
  let n = 0;
  let sum = 0;
  let sumSq = 0;
  // Border ring only — interiors are usually busy subjects.
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const edge = x < 4 || y < 4 || x >= w - 4 || y >= h - 4;
      if (!edge) continue;
      const i = (y * w + x) * ch;
      const lum = (data[i]! + data[i + 1]! + data[i + 2]!) / 3;
      sum += lum;
      sumSq += lum * lum;
      n += 1;
    }
  }
  if (n < 8) return false;
  const mean = sum / n;
  const variance = sumSq / n - mean * mean;
  return mean >= 200 && variance < 1200;
}

/**
 * Opaque local fill for a hole — samples ONLY the ring outside the hole.
 * Never composites a blurred copy of the hole contents (that left move ghosts).
 */
export async function localRingFill(
  imgBuf: Buffer,
  hole: HealRect,
  imgW: number,
  imgH: number,
): Promise<Buffer> {
  const hl = Math.max(0, Math.min(hole.left, imgW - 1));
  const ht = Math.max(0, Math.min(hole.top, imgH - 1));
  const hw = Math.max(1, Math.min(hole.width, imgW - hl));
  const hh = Math.max(1, Math.min(hole.height, imgH - ht));

  // Wider ring → better plate match on posters with white/busy backgrounds.
  const ring = Math.max(12, Math.round(Math.min(hw, hh) * 0.18));
  const left = Math.max(0, hl - ring);
  const top = Math.max(0, ht - ring);
  const width = Math.min(imgW - left, hw + ring * 2);
  const height = Math.min(imgH - top, hh + ring * 2);

  const { data, info } = await sharp(imgBuf)
    .extract({ left, top, width, height })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const channels = info.channels;
  const rw = info.width;
  const rh = info.height;
  const holeL = hl - left;
  const holeT = ht - top;

  // Prefer near-edge ring pixels; use median so a few red logos don't turn white→grey.
  const nearR: number[] = [];
  const nearG: number[] = [];
  const nearB: number[] = [];
  let rSum = 0;
  let gSum = 0;
  let bSum = 0;
  let n = 0;
  const nearBand = Math.max(4, Math.round(ring * 0.45));

  for (let y = 0; y < rh; y++) {
    for (let x = 0; x < rw; x++) {
      const inHole = x >= holeL && x < holeL + hw && y >= holeT && y < holeT + hh;
      if (inHole) continue;
      const i = (y * rw + x) * channels;
      const rr = data[i]!;
      const gg = data[i + 1]!;
      const bb = data[i + 2]!;
      rSum += rr;
      gSum += gg;
      bSum += bb;
      n += 1;

      const dx =
        x < holeL ? holeL - x : x >= holeL + hw ? x - (holeL + hw - 1) : 0;
      const dy =
        y < holeT ? holeT - y : y >= holeT + hh ? y - (holeT + hh - 1) : 0;
      const dist = Math.max(dx, dy);
      if (dist > 0 && dist <= nearBand) {
        nearR.push(rr);
        nearG.push(gg);
        nearB.push(bb);
      }
    }
  }

  const median = (arr: number[]) => {
    if (!arr.length) return 255;
    const s = [...arr].sort((a, b) => a - b);
    return s[Math.floor(s.length / 2)]!;
  };
  const fillR = Math.round(nearR.length ? median(nearR) : n ? rSum / n : 255);
  const fillG = Math.round(nearG.length ? median(nearG) : n ? gSum / n : 255);
  const fillB = Math.round(nearB.length ? median(nearB) : n ? bSum / n : 255);

  // Opaque patch — no original-content ghost.
  const solid = await sharp({
    create: {
      width: hw,
      height: hh,
      channels: 4,
      background: { r: fillR, g: fillG, b: fillB, alpha: 1 },
    },
  })
    .png()
    .toBuffer();

  // Soft edge: slight feather using ONLY fill colour (not hole pixels).
  const feather = Math.min(8, Math.max(2, Math.round(Math.min(hw, hh) * 0.04)));
  const feathered =
    feather > 1
      ? await sharp(solid)
          .blur(feather / 2)
          .png()
          .toBuffer()
      : solid;

  return sharp(imgBuf)
    .composite([{ input: feathered, left: hl, top: ht }])
    .jpeg({ quality: 92 })
    .toBuffer();
}
