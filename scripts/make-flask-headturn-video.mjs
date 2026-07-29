/**
 * Cute flask L→R head-turn video (Seedance), for smooth mouse scrub.
 * Usage: node --env-file=.env.local scripts/make-flask-headturn-video.mjs
 */
import { fal } from "@fal-ai/client";
import { writeFileSync, existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const grid = path.join(root, "public/images/landing/look-grid");
const leftPath = path.join(grid, "lm.png");
const rightPath = path.join(grid, "rm.png");
const videoPath = path.join(root, "public/images/landing/alchemy-flask-headturn.mp4");
const posterPath = path.join(root, "public/images/landing/alchemy-flask-poster.jpg");

if (!process.env.FAL_KEY) {
  console.error("Missing FAL_KEY");
  process.exit(1);
}
if (!existsSync(leftPath) || !existsSync(rightPath)) {
  console.error("Need look-grid/lm.png and rm.png");
  process.exit(1);
}

fal.config({ credentials: process.env.FAL_KEY });

async function uploadPng(filePath) {
  const buf = await readFile(filePath);
  return fal.storage.upload(new Blob([buf], { type: "image/png" }));
}

async function download(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed ${res.status}`);
  writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
}

console.log("1) Upload L/R frames…");
const startUrl = await uploadPng(leftPath);
const endUrl = await uploadPng(rightPath);
console.log("   L", startUrl);
console.log("   R", endUrl);

console.log("2) Seedance fast head-turn (camera fixed)…");
const videoResult = await fal.subscribe("bytedance/seedance-2.0/fast/image-to-video", {
  input: {
    prompt:
      "The cute white crystalline flask mascot with goggles naturally turns its head from looking left to looking right. Camera completely fixed. Desk, laptop, holograms and environment stay perfectly still. Only the character face and gaze turn smoothly. Soft continuous motion, one shot.",
    image_url: startUrl,
    end_image_url: endUrl,
    duration: "4",
    aspect_ratio: "16:9",
    resolution: "720p",
    generate_audio: false,
  },
  logs: true,
});

const videoUrl = videoResult?.data?.video?.url || videoResult?.data?.video_url;
if (!videoUrl) {
  console.error("Missing video url", JSON.stringify(videoResult?.data));
  process.exit(1);
}
console.log("   ", videoUrl);
await download(videoUrl, videoPath);
console.log("✓", videoPath);

// Poster = center frame approx mid
const { spawnSync } = await import("node:child_process");
spawnSync(
  "ffmpeg",
  ["-y", "-ss", "2", "-i", videoPath, "-frames:v", "1", "-update", "1", "-q:v", "2", posterPath],
  { stdio: "inherit" },
);
console.log("✓", posterPath);
