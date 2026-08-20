/**
 * Fix EN slide 05 — remove duplicate bottom title.
 *   npx tsx --env-file=.env.local scripts/fix-version-hell-en-05.ts
 */
import { fal } from "@fal-ai/client";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

function loadEnvLocal() {
  const p = path.join(process.cwd(), ".env.local");
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (!m) continue;
    let val = m[2]!.trim().replace(/^["']|["']$/g, "");
    if (!process.env[m[1]!.trim()]) process.env[m[1]!.trim()] = val;
  }
}

loadEnvLocal();
fal.config({ credentials: process.env.FAL_KEY!.trim() });

const OUT = path.join(process.env.HOME!, "Desktop/alchemy-carousel-v2/en-version-hell");
const LOCKUP_W = path.join(process.env.HOME!, "Desktop/alchemy-carousel-v2/alchemy-lockup-white.png");
const src = path.join(OUT, "05-edit-adjust-iterate-raw.png");

async function download(url: string, dest: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${res.status}`);
  writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
}

async function main() {
  const prompt = `Keep the SAME warm holographic lab + hand with stylus scene and center workflow.
CRITICAL: Keep title ONLY at the TOP: "Edit · Adjust · Improve — no starting over"
DELETE the large duplicate title at the BOTTOM completely.
Bottom should ONLY have smaller lines:
Every version stays editable.
Edit. Adjust. Iterate.
Keep V1→Edit text→V2→Change visual→V3 and ← Back to V2.
Leave bottom-right empty — no logo.`;

  const url = await fal.storage.upload(
    new Blob([readFileSync(src)], { type: "image/png" }),
  );
  const result = await fal.subscribe("fal-ai/nano-banana-2/edit", {
    input: { prompt, image_urls: [url], aspect_ratio: "4:5", num_images: 1 },
    logs: true,
  });
  const d = result.data as { images?: Array<{ url?: string }>; image?: { url?: string } };
  const imgUrl = d.images?.[0]?.url ?? d.image?.url;
  if (!imgUrl) throw new Error("no image");
  const raw = path.join(OUT, "05-edit-adjust-iterate-raw.png");
  const final = path.join(OUT, "05-edit-adjust-iterate.png");
  await download(imgUrl, raw);

  const meta = await sharp(raw).metadata();
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
  await sharp(raw)
    .composite([
      { input: shadow, left: w - margin - lw + 1, top: h - margin - lh + 2 },
      { input: lock.data, left: w - margin - lw, top: h - margin - lh },
    ])
    .png()
    .toFile(final);
  console.log("✓ fixed", final);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
