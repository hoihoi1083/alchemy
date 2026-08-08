import sharp from "sharp";
import { writeFileSync } from "node:fs";

async function main() {
  const src = "public/images/landing/how-step-1-upload.jpg";
  const meta = await sharp(src).metadata();
  const w = meta.width!;
  const h = meta.height!;
  // Left product well approx for 960x960 UI mock
  const left = Math.round(w * 0.07);
  const top = Math.round(h * 0.22);
  const boxW = Math.round(w * 0.48);
  const boxH = Math.round(h * 0.52);

  const overlay = await sharp({
    create: {
      width: boxW,
      height: boxH,
      channels: 3,
      background: { r: 248, g: 246, b: 255 },
    },
  })
    .png()
    .toBuffer();

  const empty = await sharp(src)
    .composite([{ input: overlay, left, top }])
    .jpeg({ quality: 92 })
    .toBuffer();

  writeFileSync("public/images/landing/how-step-1-upload-empty.jpg", empty);
  console.log("wrote empty start", w, h, { left, top, boxW, boxH });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
