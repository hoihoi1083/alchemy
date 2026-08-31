/**
 * Short Alchemy AI Lab intro bumper matching pin-field / sphere MG references.
 *
 *   npx tsx scripts/gen-alchemy-intro-bumper.ts
 *
 * Writes: ~/Downloads/alchemy-intro-bumper.mp4
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fal } from "@fal-ai/client";
import { downloadToFile } from "../lib/pipeline/ffmpeg";

function loadEnvLocal() {
  const p = path.join(process.cwd(), ".env.local");
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    let val = m[2]!.trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[m[1]!]) process.env[m[1]!] = val;
  }
}

loadEnvLocal();
const FAL_KEY = process.env.FAL_KEY?.trim();
if (!FAL_KEY) {
  console.error("Missing FAL_KEY");
  process.exit(1);
}
fal.config({ credentials: FAL_KEY });

const REF_V35 = path.join(process.env.HOME!, "Downloads/video (35).mp4");
const REF_V36 = path.join(process.env.HOME!, "Downloads/video (36).mp4");
const FLASK = path.join(
  process.cwd(),
  "public/images/landing/alchemy-flask-mascot-center.png",
);
const OUT_DIR = path.join(process.cwd(), ".tmp/alchemy-intro-bumper");
const OUT = path.join(process.env.HOME!, "Downloads/alchemy-intro-bumper.mp4");

const TAGLINE = "Do Ad as you wanted with Alchemy AI Lab";

function extractImageUrl(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const d = data as Record<string, unknown>;
  if (Array.isArray(d.images) && d.images[0]) {
    const first = d.images[0] as { url?: string };
    if (typeof first.url === "string") return first.url;
  }
  if (typeof d.image === "object" && d.image && "url" in (d.image as object)) {
    const url = (d.image as { url?: unknown }).url;
    if (typeof url === "string") return url;
  }
  return undefined;
}

function extractVideoUrl(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const d = data as Record<string, unknown>;
  if (typeof d.video === "object" && d.video && "url" in (d.video as object)) {
    const url = (d.video as { url?: unknown }).url;
    if (typeof url === "string") return url;
  }
  if (typeof d.video_url === "string") return d.video_url;
  return undefined;
}

async function uploadFile(p: string, mime: string) {
  return fal.storage.upload(new Blob([readFileSync(p)], { type: mime }));
}

function grabFrame(video: string, outJpg: string, tSec: number) {
  execFileSync(
    "ffmpeg",
    [
      "-y",
      "-ss",
      String(tSec),
      "-i",
      video,
      "-frames:v",
      "1",
      "-q:v",
      "2",
      outJpg,
    ],
    { stdio: "pipe" },
  );
}

async function main() {
  for (const p of [REF_V35, REF_V36, FLASK]) {
    if (!existsSync(p)) throw new Error(`Missing ${p}`);
  }
  mkdirSync(OUT_DIR, { recursive: true });

  const framePin = path.join(OUT_DIR, "ref-pin-hero.jpg");
  const frameSphere = path.join(OUT_DIR, "ref-sphere-wave.jpg");
  grabFrame(REF_V36, framePin, 6.5);
  grabFrame(REF_V35, frameSphere, 1.5);

  console.log("Uploading style refs…");
  const pinUrl = await uploadFile(framePin, "image/jpeg");
  const sphereUrl = await uploadFile(frameSphere, "image/jpeg");
  const flaskUrl = await uploadFile(FLASK, "image/png");
  console.log("  pin hero", pinUrl);
  console.log("  sphere wave", sphereUrl);

  const stillPrompt = [
    "16:9 premium C4D motion-graphics hero still for Alchemy AI Lab brand intro.",
    "@Image1 = silver pin-field logo lockup style reference (keep flask icon + ALCHEMY AI LAB typography feel).",
    "@Image2 = colorful glossy sphere wave style reference.",
    "@Image3 = Alchemy flask mascot identity — keep the iridescent flask icon beside the wordmark.",
    `Design: bright off-white studio. Dense glossy colored pin dots and small spheres ripple in waves across the floor.`,
    `Hero kinetic typography centered and sharp: first line "Do Ad as you wanted" in bold dark 3D particle letters; second line "with Alchemy AI Lab" smaller beneath.`,
    "Include the iridescent flask hex icon left of ALCHEMY AI LAB lockup exactly like @Image1.",
    "Soft directional light, long shadows, chromatic highlights, premium MG ad quality.",
    "No subtitles bar, no UI chrome, no gibberish text, no competitor logos.",
    `Exact readable English only: ${TAGLINE}.`,
  ].join(" ");

  console.log("Generating hero still (nano-banana-2/edit)…");
  const stillResult = await fal.subscribe("fal-ai/nano-banana-2/edit", {
    input: {
      prompt: stillPrompt,
      image_urls: [pinUrl, sphereUrl, flaskUrl],
      num_images: 1,
      aspect_ratio: "16:9",
      output_format: "jpeg",
    },
    logs: true,
    onQueueUpdate: (update) => {
      if (update.status === "IN_PROGRESS" && update.logs?.length) {
        const last = update.logs[update.logs.length - 1];
        if (last?.message) console.log(`  still: ${last.message}`);
      }
    },
  });
  const stillRemote = extractImageUrl(stillResult.data);
  if (!stillRemote) {
    console.error("No still URL", JSON.stringify(stillResult.data).slice(0, 800));
    process.exit(1);
  }
  const stillLocal = path.join(OUT_DIR, "hero-still.jpg");
  await downloadToFile(stillRemote, stillLocal);
  console.log("Saved still", stillLocal, statSync(stillLocal).size);

  const stillUrl = await uploadFile(stillLocal, "image/jpeg");

  const motionPrompt = [
    "H3 三维 Logo 演绎 brand intro bumper — 一镜到底 bright motion graphics.",
    "@Image1 锁定 Alchemy AI Lab 标识、iridescent flask icon、与 kinetic type 排版；禁止换品牌、禁止字幕条。",
    "0–2s：浅色台面，密集彩色光泽钉／小球波纹起伏，镜头轻推；可隐约看到 tagline 轮廓。",
    `2–5.5s：粒子场波浪聚合成清晰可读大字："Do Ad as you wanted"，下方 "with Alchemy AI Lab" 与 flask + ALCHEMY AI LAB 锁标同框；风格融合 silver pin-field (@Image1) 与 colorful sphere wave 质感。`,
    "5.5–8s：收在干净英雄位，全部英文文案锐利可读，轻动能光扫；连续运动无硬切。",
    "Negative: subtitles, captions, watermarks, UI overlays, voiceover, hard cut montage, dark Nike void, planet Earth, talking head, invented competitor logos, blurry text, gibberish letters.",
  ].join("\n");

  console.log("Generating H3 I2V (this may take several minutes)…");
  const videoResult = await fal.subscribe("minimax/h3/image-to-video", {
    input: {
      prompt: motionPrompt,
      image_url: stillUrl,
      duration: 8,
      resolution: "768P",
      aspect_ratio: "16:9",
    },
    logs: true,
    onQueueUpdate: (update) => {
      if (update.status === "IN_PROGRESS" && update.logs?.length) {
        const last = update.logs[update.logs.length - 1];
        if (last?.message) console.log(`  h3: ${last.message}`);
      }
      console.log("  queue:", update.status);
    },
  });

  const videoRemote = extractVideoUrl(videoResult.data);
  if (!videoRemote) {
    console.error("No video URL", JSON.stringify(videoResult.data).slice(0, 800));
    process.exit(1);
  }

  const rawMp4 = path.join(OUT_DIR, "raw-8s.mp4");
  await downloadToFile(videoRemote, rawMp4);
  console.log("Saved raw", rawMp4, statSync(rawMp4).size);

  // Trim to a tight ~5.5s bumper (drop trailing hold).
  execFileSync(
    "ffmpeg",
    [
      "-y",
      "-i",
      rawMp4,
      "-t",
      "5.5",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-crf",
      "18",
      "-preset",
      "medium",
      "-an",
      OUT,
    ],
    { stdio: "inherit" },
  );

  console.log(`\nDone → ${OUT} (${(statSync(OUT).size / 1024 / 1024).toFixed(2)} MB)`);
  console.log(`Tagline: "${TAGLINE}"`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
