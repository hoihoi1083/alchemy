import path from "path";
import { readFileSync, existsSync } from "fs";
import { fal } from "@fal-ai/client";
import { writeWatercolorCarouselToDir } from "../lib/compositor/journey-watercolor/render";
import { JOURNEY_SLIDES, STYLE_REF_01, STYLE_REF_06 } from "../lib/compositor/journey-watercolor/content";

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
const layoutOnly = process.argv.includes("--layout-only");
const slidesArg = process.argv.find((a) => a.startsWith("--slides="));
const slideIds = slidesArg
  ? slidesArg
      .slice("--slides=".length)
      .split(",")
      .map((n) => parseInt(n.trim(), 10))
      .filter((n) => !Number.isNaN(n))
  : undefined;
const outDir =
  args[0] || path.join(process.env.HOME || "", "Desktop", "journey-carousel-watercolor");

async function main() {
  loadEnvLocal();

  for (const s of JOURNEY_SLIDES) {
    if (!existsSync(s.sourceFile)) {
      console.error(`Missing: ${s.sourceFile}`);
      process.exit(1);
    }
  }

  if (layoutOnly) {
    const { composeWatercolorLayout } = await import(
      "../lib/compositor/journey-watercolor/render"
    );
    const { promises: fs } = await import("fs");
    await fs.mkdir(outDir, { recursive: true });
    for (const slide of JOURNEY_SLIDES) {
      console.log(`  [${slide.id}/7] layout ${slide.name}…`);
      const art = await fs.readFile(slide.sourceFile);
    const { usesCenteredLayout } = await import(
      "../lib/compositor/journey-watercolor/constants"
    );
      const out = await composeWatercolorLayout(art, slide.captions, {
        centered: usesCenteredLayout(slide.id),
        stripBakedText: slide.id === 1 || slide.id === 5 || slide.id === 6,
      });
      await fs.writeFile(path.join(outDir, `${slide.name}.png`), out);
    }
    console.log(`\nDone (layout only): ${outDir}`);
    return;
  }

  const key = process.env.FAL_KEY?.trim();
  if (!key) {
    console.error("Missing FAL_KEY — use --layout-only to re-caption sources only.");
    process.exit(1);
  }
  fal.config({ credentials: key });

  console.log("Watercolor carousel — style refs 01 + 06, recreate 02–05, 07");
  console.log(`Refs: ${path.basename(STYLE_REF_01)}, ${path.basename(STYLE_REF_06)}`);
  console.log(`Output: ${outDir}\n`);

  const paths = await writeWatercolorCarouselToDir(outDir, { textOnly, slideIds });
  console.log(`\nDone — ${paths.length} files:\n`);
  for (const p of paths) console.log(" ", p);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
