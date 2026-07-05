import path from "path";
import { readFileSync, existsSync } from "fs";
import { fal } from "@fal-ai/client";
import { writeUnifiedCarouselToDir } from "../lib/compositor/journey-unified/render";
import { JOURNEY_SLIDES, STYLE_REF_01 } from "../lib/compositor/journey-unified/content";

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
const stylizeAll = process.argv.includes("--stylize-all");
const layoutOnly = process.argv.includes("--layout-only");
const outDir =
  args[0] || path.join(process.env.HOME || "", "Desktop", "journey-carousel-unified");

async function main() {
  loadEnvLocal();

  for (const s of JOURNEY_SLIDES) {
    if (!existsSync(s.sourceFile)) {
      console.error(`Missing: ${s.sourceFile}`);
      process.exit(1);
    }
  }

  if (layoutOnly) {
    const { composeUnifiedLayout } = await import(
      "../lib/compositor/journey-unified/render"
    );
    const { promises: fs } = await import("fs");
    await fs.mkdir(outDir, { recursive: true });
    for (const slide of JOURNEY_SLIDES) {
      console.log(`  [${slide.id}/7] layout ${slide.name}…`);
      const art = await fs.readFile(slide.sourceFile);
      const out = await composeUnifiedLayout(art, slide.captions);
      await fs.writeFile(path.join(outDir, `${slide.name}.png`), out);
    }
    console.log(`\nDone (layout only): ${outDir}`);
    return;
  }

  const key = process.env.FAL_KEY?.trim();
  if (!key) {
    console.error("Missing FAL_KEY — use --layout-only to align text on sources only.");
    process.exit(1);
  }
  fal.config({ credentials: key });

  console.log("Unified webtoon carousel (01 style + centered captions)");
  console.log(`Style ref: ${path.basename(STYLE_REF_01)}`);
  console.log(`Output: ${outDir}\n`);

  const paths = await writeUnifiedCarouselToDir(outDir, { textOnly, stylizeAll });
  console.log(`\nDone — ${paths.length} files:\n`);
  for (const p of paths) console.log(" ", p);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
