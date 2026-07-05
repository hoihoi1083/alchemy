import path from "path";
import { readFileSync, existsSync } from "fs";
import { fal } from "@fal-ai/client";
import { writeWatercolorCarouselToDir } from "../lib/compositor/watercolor-journey/render";
import { COMIC_SLIDES } from "../lib/compositor/comic-journey/content";
import { STYLE_REF_PATH } from "../lib/compositor/watercolor-journey/constants";

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
  args[0] || path.join(process.env.HOME || "", "Desktop", "watercolor-journey-carousel");

async function main() {
  loadEnvLocal();
  const key = process.env.FAL_KEY?.trim();
  if (!key) {
    console.error("Missing FAL_KEY in .env.local");
    process.exit(1);
  }
  fal.config({ credentials: key });

  if (!existsSync(STYLE_REF_PATH)) {
    console.error(`Style reference not found: ${STYLE_REF_PATH}`);
    process.exit(1);
  }

  for (const s of COMIC_SLIDES) {
    if (!existsSync(s.sourceFile)) {
      console.error(`Source not found: ${s.sourceFile}`);
      process.exit(1);
    }
  }

  console.log(
    textOnly
      ? "Re-applying watercolor captions (_raw cache)…"
      : "Generating 7 slides in watercolor style (fal pro + style ref)…",
  );
  console.log(`Style ref: ${path.basename(STYLE_REF_PATH)}`);
  console.log(`Output: ${outDir}\n`);

  const paths = await writeWatercolorCarouselToDir(outDir, { textOnly });
  console.log(`\nDone — ${paths.length} files:\n`);
  for (const p of paths) console.log(" ", p);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
