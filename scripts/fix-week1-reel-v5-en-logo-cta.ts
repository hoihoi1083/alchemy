/**
 * Fix EN scene 04 CTA → "Try Alchemy AI Lab →", restamp all EN stills top-left, rebuild H3.
 *   npx tsx --env-file=.env.local scripts/fix-week1-reel-v5-en-logo-cta.ts
 */
import { fal } from "@fal-ai/client";
import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { downloadToFile } from "../lib/pipeline/ffmpeg";

const WORK = path.join(process.cwd(), ".tmp/week1-reel-v5-edit/en");
const OUT_ROOT = path.join(
  process.env.HOME ?? "",
  "Downloads",
  "Alchemy Week 1 Marketing",
  "Reel 1",
);
const LOCKUP = path.join(
  process.env.HOME ?? "",
  "Desktop/alchemy-carousel-v2/alchemy-lockup-black.png",
);

function loadEnvLocal() {
  const p = path.join(process.cwd(), ".env.local");
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (!m) continue;
    const k = m[1]!.trim();
    const v = m[2]!.trim().replace(/^["']|["']$/g, "");
    if (!process.env[k]) process.env[k] = v;
  }
}

async function stampLockupTopLeft(src: string, dest: string) {
  const meta = await sharp(src).metadata();
  const w = meta.width ?? 1080;
  const h = meta.height ?? 1920;
  const targetH = Math.round(h * 0.036);
  const lock = await sharp(LOCKUP)
    .resize({ height: targetH, fit: "inside" })
    .png()
    .toBuffer({ resolveWithObject: true });
  const lw = lock.info.width ?? 160;
  const lh = lock.info.height ?? targetH;
  const marginX = Math.round(w * 0.04);
  const marginY = Math.round(h * 0.028);
  const pad = Math.round(Math.min(w, h) * 0.01);
  const plateW = lw + pad * 2;
  const plateH = lh + pad * 2;
  const plate = await sharp({
    create: {
      width: plateW,
      height: plateH,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 235 },
    },
  })
    .png()
    .toBuffer();
  await sharp(src)
    .composite([
      { input: plate, left: marginX, top: marginY },
      { input: lock.data, left: marginX + pad, top: marginY + pad },
    ])
    .jpeg({ quality: 94 })
    .toFile(dest);
}

function extractImageUrl(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const d = data as { images?: Array<{ url?: string }>; image?: { url?: string } };
  return d.images?.[0]?.url ?? d.image?.url;
}

function extractVideoUrl(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const d = data as { video?: { url?: string }; video_url?: string };
  return d.video?.url ?? d.video_url;
}

async function uploadLocal(filePath: string, mime: string): Promise<string> {
  return fal.storage.upload(new Blob([readFileSync(filePath)], { type: mime }));
}

async function main() {
  loadEnvLocal();
  const key = process.env.FAL_KEY?.trim();
  if (!key) throw new Error("Missing FAL_KEY");
  fal.config({ credentials: key });
  mkdirSync(WORK, { recursive: true });
  mkdirSync(OUT_ROOT, { recursive: true });

  const raw04 = path.join(WORK, "04-raw.jpg");
  if (!existsSync(raw04)) throw new Error(`Missing ${raw04}`);

  console.log("1) Edit scene 04 CTA → Try Alchemy AI Lab → …");
  const baseUrl = await uploadLocal(raw04, "image/jpeg");
  const lockupUrl = await uploadLocal(LOCKUP, "image/png");
  const edit = await fal.subscribe("fal-ai/nano-banana-2/edit", {
    input: {
      prompt:
        "EDIT this exact 9:16 marketing keyframe. Keep composition, mascot, cards, and headline identical. " +
        "ONLY change the bottom call-to-action line under the pill. Replace \"Try Alchemy →\" with EXACT text: \"Try Alchemy AI Lab →\". " +
        "Crisp readable sans. No gibberish. Do NOT invent logos. Leave top-left corner clean/empty for branding stamp. " +
        "Keep pill text \"One photo. Full campaign.\" unchanged.",
      image_urls: [baseUrl, lockupUrl],
      aspect_ratio: "9:16",
      num_images: 1,
      resolution: "2K",
    },
    logs: true,
  });
  const imgUrl = extractImageUrl(edit.data);
  if (!imgUrl) throw new Error("No edited image");
  await downloadToFile(imgUrl, raw04);
  console.log("   updated 04-raw.jpg");

  console.log("2) Restamp EN 01–04 with Alchemy AI Lab lockup (top-left)…");
  for (const id of ["01", "02", "03", "04"]) {
    const raw = path.join(WORK, `${id}-raw.jpg`);
    const out = path.join(WORK, `${id}.jpg`);
    if (!existsSync(raw)) throw new Error(`Missing ${raw}`);
    await stampLockupTopLeft(raw, out);
    console.log(`   stamped ${id}.jpg`);
  }

  console.log("3) MiniMax H3 from fixed stills…");
  const refs = await Promise.all(
    ["01", "02", "03", "04"].map((id) => uploadLocal(path.join(WORK, `${id}.jpg`), "image/jpeg")),
  );
  const prompt = [
    "@Image1 @Image2 @Image3 @Image4",
    "Vertical 9:16 Alchemy AI Lab SaaS marketing Reel, clean light UI, premium motion.",
    "0-3s: Image1 — one product photo + campaign due today; Prompt struck out; No prompt needed.",
    "3-6s: Image2 — AI Research; four cards Audience/Competitors/Content Angle/Visual Direction.",
    "6-9s: Image3 — Storyboard First; Scene 01-04; Plan first Generate second.",
    "9-12s: Image4 — creative directions; CTA One photo Full campaign; line says Try Alchemy AI Lab; lockup top-left.",
    "Keep text sharp. Brand is Alchemy AI Lab. No gibberish.",
  ].join(" ");

  const video = await fal.subscribe("minimax/h3/reference-to-video", {
    input: {
      prompt,
      reference_image_urls: refs,
      duration: 12,
      resolution: "768P",
      aspect_ratio: "9:16",
    },
    logs: true,
    onQueueUpdate: (u) => {
      if (u.status === "IN_PROGRESS" || u.status === "COMPLETED") {
        console.log("   queue:", u.status);
      }
    },
  });
  const vUrl = extractVideoUrl(video.data);
  if (!vUrl) throw new Error("No video url");

  const local = path.join(WORK, "week1-reel-v5b-en.mp4");
  const dest = path.join(OUT_ROOT, "week1-reel-v5b-en.mp4");
  await downloadToFile(vUrl, local);
  writeFileSync(dest, readFileSync(local));
  console.log("saved", dest, statSync(dest).size);
  console.log("Also local:", local);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
