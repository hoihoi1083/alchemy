import sharp from "sharp";

export type HealRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

/**
 * Soft local fill for a single hole.
 * Uses surrounding ring average colour (flat plate match) instead of a heavy
 * Gaussian blur slab — that looked broken on marketing stills.
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

  const ring = Math.max(8, Math.round(Math.min(hw, hh) * 0.1));
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

  let rSum = 0;
  let gSum = 0;
  let bSum = 0;
  let n = 0;
  for (let y = 0; y < rh; y++) {
    for (let x = 0; x < rw; x++) {
      const inHole =
        x >= holeL && x < holeL + hw && y >= holeT && y < holeT + hh;
      if (inHole) continue;
      const i = (y * rw + x) * channels;
      rSum += data[i]!;
      gSum += data[i + 1]!;
      bSum += data[i + 2]!;
      n += 1;
    }
  }

  const fillR = n ? Math.round(rSum / n) : 245;
  const fillG = n ? Math.round(gSum / n) : 245;
  const fillB = n ? Math.round(bSum / n) : 245;

  // Mild blur of neighbourhood for a soft edge (kept small on purpose)
  const softBlur = Math.min(6, Math.max(2, Math.round(Math.min(hw, hh) * 0.015)));
  const softPatch = await sharp(imgBuf)
    .extract({ left, top, width, height })
    .blur(softBlur)
    .extract({
      left: holeL,
      top: holeT,
      width: hw,
      height: hh,
    })
    .png()
    .toBuffer();

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

  // Mostly flat plate colour; light soft patch on top for edge continuity
  const softFaded = await sharp(softPatch)
    .ensureAlpha()
    .linear([1, 1, 1, 0.28], [0, 0, 0, 0])
    .png()
    .toBuffer();

  const patch = await sharp(solid)
    .composite([{ input: softFaded, blend: "over" }])
    .png()
    .toBuffer();

  return sharp(imgBuf)
    .composite([{ input: patch, left: hl, top: ht }])
    .jpeg({ quality: 92 })
    .toBuffer();
}
