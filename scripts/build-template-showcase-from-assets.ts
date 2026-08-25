/**
 * Build tpl-show-*.jpg from existing landing assets (no fal).
 * Different crops / light grades so each category has 6–7 distinct cards.
 *
 *   npx tsx scripts/build-template-showcase-from-assets.ts
 */
import path from "node:path";
import fs from "node:fs";
import sharp from "sharp";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "public/images/landing");
const W = 900;
const H = 1125;

type Grade = { brightness?: number; saturation?: number; hue?: number };
type Job = {
  id: string;
  src: string;
  position?: sharp.Gravity;
  grade?: Grade;
};

const JOBS: Job[] = [
  // Product
  { id: "product-serum", src: "landing-cta-bottle.png", position: "centre" },
  { id: "product-pack", src: "tpl-card-01-skincare.jpg", position: "north", grade: { saturation: 1.05 } },
  { id: "product-hero", src: "landing-hero-product.png", position: "centre" },
  { id: "product-flatlay", src: "scenario-beauty.png", position: "centre", grade: { brightness: 1.04 } },
  { id: "product-luxury", src: "landing-hero-after.png", position: "south", grade: { saturation: 0.92 } },
  { id: "product-kit", src: "landing-transform-after.png", position: "centre" },
  // Instagram
  { id: "ig-skincare", src: "landing-canvas-skincare.png", position: "centre" },
  { id: "ig-cafe", src: "landing-result-coffee.png", position: "north" },
  { id: "ig-fashion", src: "landing-hero-product-v2.png", position: "centre", grade: { saturation: 1.08 } },
  { id: "ig-testimonial", src: "tpl-card-06-testimonial.jpg", position: "centre" },
  { id: "ig-routine", src: "story-fan-transform.jpg", position: "south" },
  { id: "ig-color", src: "landing-tpl-sunscreen.png", position: "centre", grade: { saturation: 1.12 } },
  // Facebook
  { id: "fb-sale", src: "tpl-card-02-sale.jpg", position: "centre" },
  { id: "fb-coffee", src: "landing-ref-coffee.png", position: "centre" },
  { id: "fb-fitness", src: "tpl-card-05-service.jpg", position: "north" },
  { id: "fb-offer", src: "scenario-ecommerce.png", position: "centre", grade: { brightness: 1.06 } },
  { id: "fb-bundle", src: "landing-before-after-studio.png", position: "centre" },
  { id: "fb-launch", src: "landing-hero-after-crop.png", position: "centre" },
  // RedNote (7)
  { id: "xhs-haul", src: "tpl-card-03-new-arrival.jpg", position: "centre" },
  { id: "xhs-ootd", src: "landing-hero-wide.png", position: "east", grade: { saturation: 1.05 } },
  { id: "xhs-foodie", src: "scenario-food.png", position: "centre" },
  { id: "xhs-desk", src: "scenario-education.png", position: "centre" },
  { id: "xhs-skincare", src: "scenario-beauty.png", position: "north", grade: { brightness: 1.05 } },
  { id: "xhs-home", src: "scenario-realestate.png", position: "centre" },
  { id: "xhs-travel", src: "story-fan-reference.jpg", position: "north" },
  // Reels / Video
  { id: "reel-storyboard", src: "tpl-card-04-reels.jpg", position: "centre" },
  { id: "reel-unbox", src: "story-fan-storyboard.jpg", position: "north" },
  { id: "reel-tips", src: "landing-canvas-edit.png", position: "centre" },
  { id: "reel-before", src: "landing-before-after-studio.png", position: "south" },
  { id: "reel-ugc", src: "story-fan-canvas.jpg", position: "centre" },
  { id: "reel-hook", src: "landing-transform-before.png", position: "centre", grade: { saturation: 1.1 } },
  // Service
  { id: "svc-fitness", src: "tpl-card-05-service.jpg", position: "centre" },
  { id: "svc-clinic", src: "landing-tpl-service.png", position: "centre" },
  { id: "svc-salon", src: "landing-hero-abstract.png", position: "centre", grade: { hue: 10 } },
  { id: "svc-coach", src: "scenario-education.png", position: "south" },
  { id: "svc-spa", src: "scenario-beauty.png", position: "west", grade: { brightness: 1.03 } },
  { id: "svc-consult", src: "scenario-saas.png", position: "centre" },
];

async function build(job: Job) {
  const srcPath = path.join(OUT, job.src);
  if (!fs.existsSync(srcPath)) throw new Error(`Missing ${srcPath}`);
  let pipeline = sharp(srcPath).rotate().resize(W, H, {
    fit: "cover",
    position: job.position ?? "centre",
  });
  if (job.grade) {
    const mod: { brightness?: number; saturation?: number; hue?: number } = {};
    if (job.grade.brightness != null) mod.brightness = job.grade.brightness;
    if (job.grade.saturation != null) mod.saturation = job.grade.saturation;
    if (job.grade.hue != null) mod.hue = job.grade.hue;
    if (Object.keys(mod).length) pipeline = pipeline.modulate(mod);
  }
  const dest = path.join(OUT, `tpl-show-${job.id}.jpg`);
  await pipeline.jpeg({ quality: 86, mozjpeg: true }).toFile(dest);
  const st = fs.statSync(dest);
  console.log(`ok ${job.id} (${Math.round(st.size / 1024)}KB)`);
}

async function main() {
  for (const job of JOBS) await build(job);
  console.log(`Done — ${JOBS.length} cards`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
