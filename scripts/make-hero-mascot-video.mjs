/**
 * One-off: edit left→right head pose on same scene, then Seedance head-turn video.
 * Usage: node --env-file=.env.local scripts/make-hero-mascot-video.mjs
 */
import { fal } from "@fal-ai/client";
import { createReadStream, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "public/images/landing");
const leftPath = path.join(outDir, "alchemy-head-left.png");
const rightEditedPath = path.join(outDir, "alchemy-head-right-matched.png");
const videoPath = path.join(outDir, "alchemy-mascot-headturn.mp4");

if (!process.env.FAL_KEY) {
  console.error("Missing FAL_KEY");
  process.exit(1);
}

fal.config({ credentials: process.env.FAL_KEY });

async function uploadPng(filePath) {
  const buf = await readFile(filePath);
  const blob = new Blob([buf], { type: "image/png" });
  // fal.storage.upload accepts File/Blob
  return fal.storage.upload(blob);
}

async function download(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed ${res.status}`);
  const ab = await res.arrayBuffer();
  writeFileSync(dest, Buffer.from(ab));
}

console.log("1) Upload start frame…");
const startUrl = await uploadPng(leftPath);
console.log("   ", startUrl);

console.log("2) Nano Banana edit → look right, keep scene fixed…");
const edit = await fal.subscribe("fal-ai/nano-banana-2/edit", {
  input: {
    prompt:
      "Keep the exact same cyber desk, laptop, holographic panels, lighting, camera angle, and character body. Only turn the translucent glowing AI companion's head and gaze clearly toward the RIGHT side of the frame. Do not change anything else.",
    image_urls: [startUrl],
    num_images: 1,
    aspect_ratio: "4:3",
  },
  logs: true,
});

const editedUrl =
  edit?.data?.images?.[0]?.url ||
  edit?.data?.image?.url ||
  edit?.data?.url;
if (!editedUrl) {
  console.error("Edit response missing image:", JSON.stringify(edit?.data, null, 2));
  process.exit(1);
}
console.log("   ", editedUrl);
await download(editedUrl, rightEditedPath);
console.log("   saved", rightEditedPath);

const endUrl = await uploadPng(rightEditedPath);

console.log("3) Seedance fast image-to-video (head turn, camera fixed)…");
const videoResult = await fal.subscribe("bytedance/seedance-2.0/fast/image-to-video", {
  input: {
    prompt:
      "The little translucent glowing AI companion naturally turns its head from looking left to looking right. Camera is completely fixed. Desk, laptop, holographic panels and environment stay still. Soft subtle motion only on the character head and eyes. One continuous shot, cinematic.",
    image_url: startUrl,
    end_image_url: endUrl,
    duration: "4",
    aspect_ratio: "4:3",
    resolution: "720p",
    generate_audio: false,
  },
  logs: true,
});

const videoUrl = videoResult?.data?.video?.url || videoResult?.data?.video_url;
if (!videoUrl) {
  console.error("Video response missing url:", JSON.stringify(videoResult?.data, null, 2));
  process.exit(1);
}
console.log("   ", videoUrl);
await download(videoUrl, videoPath);
console.log("✓ wrote", videoPath);
