import path from "path";
import { existsSync } from "fs";
import { readFile, writeFile } from "fs/promises";
import sharp from "sharp";
import { COMIC_SLIDES, W, H } from "../lib/compositor/comic-journey/content";
import { finalizeWatercolorSlide } from "../lib/compositor/watercolor-journey/render";

async function main() {
  const outDir =
    process.argv[2] ||
    path.join(process.env.HOME || "", "Desktop", "watercolor-journey-carousel");

  for (const slide of COMIC_SLIDES) {
    const rawPath = path.join(outDir, "_raw", `${slide.name}.png`);
    const finalPath = path.join(outDir, `${slide.name}.png`);
    let base: Buffer;
    if (existsSync(rawPath)) {
      base = await readFile(rawPath);
    } else if (existsSync(finalPath)) {
      base = await sharp(finalPath).resize(W, H, { fit: "cover" }).png().toBuffer();
    } else {
      console.error(`Missing ${finalPath}`);
      process.exit(1);
    }
    const out = await finalizeWatercolorSlide(base, slide.captions);
    await writeFile(finalPath, out);
    console.log("Fixed", finalPath);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
