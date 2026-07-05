import path from "path";
import { writeRealisticCarouselToDir } from "../lib/compositor/career-carousel/render-realistic";

const outDir =
  process.argv[2] ||
  path.join(process.env.HOME || "", "Desktop", "career-carousel-realistic");

async function main() {
  console.log("Rendering realistic-style career carousel…");
  const paths = await writeRealisticCarouselToDir(outDir);
  console.log(`\nWrote ${paths.length} slides to:\n${outDir}\n`);
  for (const p of paths) console.log(" ", p);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
