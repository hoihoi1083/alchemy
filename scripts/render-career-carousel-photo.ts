import path from "path";
import { writePhotoCarouselToDir } from "../lib/compositor/career-carousel/render-photo";

const outDir =
  process.argv[2] ||
  path.join(process.env.HOME || "", "Desktop", "career-carousel-photo");

async function main() {
  console.log("Rendering photo-based career carousel (marketing assets)…");
  const paths = await writePhotoCarouselToDir(outDir);
  console.log(`\nWrote ${paths.length} slides to:\n${outDir}\n`);
  for (const p of paths) console.log(" ", p);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
