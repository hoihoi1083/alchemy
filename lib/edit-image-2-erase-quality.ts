import sharp from "sharp";

/**
 * FLUX Erase converts the binary mask to chroma-key green internally (BFL docs).
 * When erase fails or the mask covers nearly the whole plate, fal often returns
 * a solid / mostly green frame instead of a reconstructed background.
 */
export async function isFailedFluxEraseOutput(imgBuf: Buffer): Promise<boolean> {
  const { data, info } = await sharp(imgBuf)
    .resize(64, 64, { fit: "fill" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const n = info.width * info.height;
  if (n < 1) return true;

  let chromaGreen = 0;
  let nearSolidGreen = 0;
  for (let i = 0; i < data.length; i += 3) {
    const r = data[i]!;
    const g = data[i + 1]!;
    const b = data[i + 2]!;
    // Neon / chroma green (mask visualization leak)
    if (g > 160 && r < 100 && b < 100 && g - r > 70 && g - b > 70) {
      chromaGreen += 1;
    }
    // Flat #00FF00-ish plate
    if (g > 200 && r < 40 && b < 40) {
      nearSolidGreen += 1;
    }
  }

  return chromaGreen / n > 0.35 || nearSolidGreen / n > 0.25;
}
