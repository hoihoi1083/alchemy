/** Re-fix slides 02 + 03 only. */
import { fal } from "@fal-ai/client";
import { readFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { downloadToFile } from "../lib/pipeline/ffmpeg";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (!m) continue;
  const k = m[1]!.trim();
  let v = m[2]!.trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1);
  }
  if (!process.env[k]) process.env[k] = v;
}
fal.config({ credentials: process.env.FAL_KEY! });

const OUT = path.join(process.env.HOME!, "Desktop/alchemy-carousel-v2/zh-cn-version-hell");
const LOCKUP_W = path.join(process.env.HOME!, "Desktop/alchemy-carousel-v2/alchemy-lockup-white.png");

async function upload(p: string) {
  return fal.storage.upload(new Blob([readFileSync(p)], { type: "image/png" }));
}
function extract(data: unknown) {
  const d = data as { images?: { url?: string }[]; image?: { url?: string } };
  return d.images?.[0]?.url ?? d.image?.url;
}
async function stamp(src: string, dest: string) {
  const meta = await sharp(src).metadata();
  const w = meta.width!;
  const h = meta.height!;
  const targetH = Math.round(h * 0.045);
  const lock = await sharp(LOCKUP_W)
    .resize({ height: targetH, fit: "inside" })
    .png()
    .toBuffer({ resolveWithObject: true });
  const lw = lock.info.width!;
  const lh = lock.info.height!;
  const margin = Math.round(Math.min(w, h) * 0.035);
  const shadow = await sharp(lock.data)
    .ensureAlpha()
    .modulate({ brightness: 0.2 })
    .blur(1.2)
    .toBuffer();
  await sharp(src)
    .composite([
      { input: shadow, left: w - margin - lw + 1, top: h - margin - lh + 2 },
      { input: lock.data, left: w - margin - lw, top: h - margin - lh },
    ])
    .png()
    .toFile(dest);
}

const jobs = [
  {
    id: "02-small-request-big-project",
    prompt: `Edit this clay carousel slide. Keep warm 3D clay style and the woman + desk.
SPEECH BUBBLES: keep EXACTLY four demand bubbles only — remove the extra V2 bubble and any fifth bubble.
Keep only: 更高级一点 / 更年轻一点 / 换个风格 / 再来一版. Small Edit/Revision chips OK on those four.
Reduce desk clutter a bit more.
Keep title 客户的小要求，大工程 and bottom: 每个“小改动”，背后都是一轮新迭代。
Do NOT draw any Alchemy logo — leave bottom-right empty.`,
  },
  {
    id: "03-version-hell",
    prompt: `Edit this version-hell slide. CRITICAL: remove the DUPLICATE large title and subtitle block in the LOWER half of the image completely. Keep title ONLY once at the top: 行销人的版本地狱 with sub 「Version_final_FINAL_v19…」——档案名称越来越长，你的耐心越来越短。
Bottom area should show ONLY one short line: 版本越乱，效率越低。 No repeated headline.
Folder tabs only: V1, V3, V19, FINAL, final_FINAL (no duplicate V19).
Reduce desk clutter slightly. Warm clay style. Do NOT draw Alchemy logo — leave bottom-right empty.`,
  },
];

async function main() {
  for (const j of jobs) {
    const src = path.join(OUT, `${j.id}.png`);
    console.log("fix", j.id);
    const url = await upload(src);
    const result = await fal.subscribe("fal-ai/nano-banana-2/edit", {
      input: {
        prompt: j.prompt,
        image_urls: [url],
        aspect_ratio: "4:5",
        num_images: 1,
      },
      logs: true,
    });
    const img = extract(result.data);
    if (!img) throw new Error(`no image ${j.id}`);
    const raw = path.join(OUT, `${j.id}-fix-raw.png`);
    await downloadToFile(img, raw);
    await stamp(raw, src);
    console.log("OK", src);
  }
  console.log("done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
