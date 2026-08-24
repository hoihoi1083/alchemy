/**
 * Restamp ZH stills with Alchemy AI Lab lockup top-left (match EN), rebuild H3.
 *   npx tsx --env-file=.env.local scripts/fix-week1-reel-v5-zh-logo.ts
 */
import { fal } from "@fal-ai/client";
import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { downloadToFile } from "../lib/pipeline/ffmpeg";

const WORK = path.join(process.cwd(), ".tmp/week1-reel-v5-edit/zh");
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

  console.log("1) Restamp ZH 01–04 → Alchemy AI Lab lockup top-left…");
  for (const id of ["01", "02", "03", "04"]) {
    const raw = path.join(WORK, `${id}-raw.jpg`);
    const out = path.join(WORK, `${id}.jpg`);
    if (!existsSync(raw)) throw new Error(`Missing ${raw}`);
    await stampLockupTopLeft(raw, out);
    console.log(`   stamped ${id}.jpg`);
  }

  console.log("2) MiniMax H3 ZH…");
  const refs = await Promise.all(
    ["01", "02", "03", "04"].map((id) => uploadLocal(path.join(WORK, `${id}.jpg`), "image/jpeg")),
  );
  const prompt = [
    "@Image1 @Image2 @Image3 @Image4",
    "Vertical 9:16 Alchemy AI Lab SaaS marketing Reel, clean light UI, premium motion. Simplified Chinese on-screen text.",
    "0-3s: Image1 — 只有一张产品图 / 今天就要交 campaign / 无需写 Prompt.",
    "3-6s: Image2 — AI 研究; 受众/竞品/内容角度/视觉方向.",
    "6-9s: Image3 — 分镜优先; Scene 01-04; 先规划再生成.",
    "9-12s: Image4 — 多种创意方向; CTA 一张照片完整 campaign; 试试 Alchemy AI Lab; lockup top-left only.",
    "Keep Chinese text sharp. Brand is Alchemy AI Lab. No gibberish. No bottom logo.",
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
        process.stdout.write(`\r   queue: ${u.status}   `);
      }
    },
  });
  console.log("");
  const vUrl = extractVideoUrl(video.data);
  if (!vUrl) throw new Error("No video url");

  const local = path.join(WORK, "week1-reel-v5b-zh-cn.mp4");
  const dest = path.join(OUT_ROOT, "week1-reel-v5b-zh-cn.mp4");
  await downloadToFile(vUrl, local);
  writeFileSync(dest, readFileSync(local));
  console.log("saved", dest, statSync(dest).size);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
