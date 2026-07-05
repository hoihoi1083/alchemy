import path from "path";
import { writeCareerCarouselToDir } from "../lib/compositor/career-carousel/render";

const outDir =
  process.argv[2] ||
  path.join(process.env.HOME || "", "Desktop", "career-carousel-new-design");

async function main() {
  const paths = await writeCareerCarouselToDir(outDir);
  console.log(`Wrote ${paths.length} slides to:\n${outDir}\n`);
  for (const p of paths) console.log("  ", p);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
