/**
 * Cute white flask + goggles → center scene + 3×3 look grid.
 * Usage: node --env-file=.env.local scripts/make-hero-look-grid.mjs
 */
import { fal } from "@fal-ai/client";
import { writeFileSync, existsSync, copyFileSync, rmSync } from "node:fs";
import { readFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "public/images/landing/look-grid");
const portraitPath =
  "/Users/michaelng/.cursor/projects/Users-michaelng-Desktop-alchemy-studio/assets/alchemy-flask-cute-goggles-portrait.png";
const centerOut = path.join(root, "public/images/landing/alchemy-flask-cute-center.png");

if (!process.env.FAL_KEY) {
  console.error("Missing FAL_KEY");
  process.exit(1);
}
fal.config({ credentials: process.env.FAL_KEY });

await mkdir(outDir, { recursive: true });

async function uploadPng(filePath) {
  const buf = await readFile(filePath);
  return fal.storage.upload(new Blob([buf], { type: "image/png" }));
}

async function download(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed ${res.status} ${url}`);
  writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
}

async function edit(imageUrl, prompt, aspect = "16:9") {
  const result = await fal.subscribe("fal-ai/nano-banana-2/edit", {
    input: {
      prompt,
      image_urls: [imageUrl],
      num_images: 1,
      aspect_ratio: aspect,
    },
    logs: true,
  });
  const url =
    result?.data?.images?.[0]?.url || result?.data?.image?.url || result?.data?.url;
  if (!url) throw new Error(`Edit missing image: ${JSON.stringify(result?.data)}`);
  return url;
}

if (!existsSync(portraitPath)) {
  console.error("Portrait not found", portraitPath);
  process.exit(1);
}

console.log("1) Upload cute flask portrait…");
const portraitUrl = await uploadPng(portraitPath);
console.log("   ", portraitUrl);

console.log("1b) Convert eyewear to chunky lab GOGGLES…");
const goggledUrl = await edit(
  portraitUrl,
  "Keep this exact cute white crystalline Erlenmeyer flask mascot, same face, same pose, same body. REPLACE the thin round glasses with chunky oversized laboratory SAFETY GOGGLES: thick soft rounded goggle cups, big circular lenses, visible elastic strap wrapping around the flask, slightly cartoonish and cute. Keep large adorable eyes visible through the goggle lenses and the tiny smile. Do not change the flask silhouette or colors.",
  "1:1",
);
const goggledLocal = path.join(root, "public/images/landing/alchemy-flask-cute-goggles.png");
await download(goggledUrl, goggledLocal);
console.log("   saved", goggledLocal);

console.log("2) Expand to cyber desk hero scene (keep cute face + goggles)…");
const centerUrl = await edit(
  goggledUrl,
  "Place this exact cute white crystalline Erlenmeyer flask mascot (milky translucent low-poly glass, soft pink glow at base, LARGE adorable round eyes, chunky oversized round LAB SAFETY GOGGLES with thick frames and strap — keep goggles) sitting on a dark reflective cyber AI lab desk. Open laptop beside it. Soft violet and cyan holographic dashboard panels in the blurred background. Fixed camera, character looking straight at camera. Wide cinematic 16:9 composition with darker empty space on the left for text overlay. Keep the mascot cute and friendly. No text, no logos.",
  "16:9",
);
await download(centerUrl, centerOut);
copyFileSync(centerOut, path.join(outDir, "cm.png"));
console.log("   saved", centerOut);

const baseUrl = await uploadPng(path.join(outDir, "cm.png"));

const keep =
  "Keep the exact same cyber desk, laptop, holograms, lighting, camera, and the cute white crystalline Erlenmeyer flask mascot with chunky round lab goggles. ";

const prompts = {
  lm: keep + "Only turn the flask face and gaze clearly toward the LEFT. Keep cute big eyes and goggles. Do not change anything else.",
  rm: keep + "Only turn the flask face and gaze clearly toward the RIGHT. Keep cute big eyes and goggles. Do not change anything else.",
  cu: keep + "Only tilt the flask face and gaze slightly UPWARD. Keep cute big eyes and goggles. Do not change anything else.",
  cd: keep + "Only tilt the flask face and gaze slightly DOWNWARD. Keep cute big eyes and goggles. Do not change anything else.",
  lu: keep + "Only turn the flask face LEFT and slightly UP. Keep cute big eyes and goggles. Do not change anything else.",
  ru: keep + "Only turn the flask face RIGHT and slightly UP. Keep cute big eyes and goggles. Do not change anything else.",
  ld: keep + "Only turn the flask face LEFT and slightly DOWN. Keep cute big eyes and goggles. Do not change anything else.",
  rd: keep + "Only turn the flask face RIGHT and slightly DOWN. Keep cute big eyes and goggles. Do not change anything else.",
};

for (const [key, prompt] of Object.entries(prompts)) {
  console.log("edit", key);
  const url = await edit(baseUrl, prompt, "16:9");
  const dest = path.join(outDir, `${key}.png`);
  await download(url, dest);
  console.log("  saved", dest);
}

console.log("✓ cute flask+goggles look grid ready");
