import path from "path";
import { readFileSync, existsSync } from "fs";
import { fal } from "@fal-ai/client";
import { writeComicCarouselToDir } from "../lib/compositor/comic-journey/render";
import { COMIC_SLIDES } from "../lib/compositor/comic-journey/content";

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i > 0) process.env[t.slice(0, i)] = t.slice(i + 1).trim();
  }
}

const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const textOnly = process.argv.includes("--text-only");
const outDir =
  args[0] || path.join(process.env.HOME || "", "Desktop", "comic-journey-carousel");

async function main() {
  loadEnvLocal();
  const key = process.env.FAL_KEY?.trim();
  if (!key) {
    console.error("Missing FAL_KEY in .env.local");
    process.exit(1);
  }
  fal.config({ credentials: key });

  for (const s of COMIC_SLIDES) {
    if (!existsSync(s.sourceFile)) {
      console.error(`Source not found: ${s.sourceFile}`);
      process.exit(1);
    }
  }

  const endpoint =
    process.env.FAL_IMAGE_EDIT_ENDPOINT?.trim() || "fal-ai/nano-banana/edit";

  console.log(
    textOnly
      ? "Re-applying captions on cached _raw/ (comic-journey)…"
      : "Generating 7 slides in comic style (fal)…",
  );
  console.log(`Output: ${outDir}\n`);

  const paths = await writeComicCarouselToDir(outDir, { endpoint, textOnly });
  console.log(`\nDone — ${paths.length} files:\n`);
  for (const p of paths) console.log(" ", p);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
