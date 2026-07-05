import path from "path";
import { writeLifePathCarouselToDir } from "../lib/compositor/life-path-carousel/render";

const outDir =
  process.argv[2] ||
  path.join(process.env.HOME || "", "Desktop", "life-path-carousel");

async function main() {
  console.log("Life path carousel");
  console.log(`Output: ${outDir}\n`);
  const paths = await writeLifePathCarouselToDir(outDir);
  console.log(`\nDone — ${paths.length} slides:\n`);
  for (const p of paths) console.log(" ", p);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
