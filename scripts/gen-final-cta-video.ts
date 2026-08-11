/**
 * Seedance I2V loop for landing final CTA media.
 *
 *   npx tsx scripts/gen-final-cta-video.ts
 *
 * Writes: public/videos/landing/final-cta-studio.mp4
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fal } from "@fal-ai/client";

function loadEnvLocal() {
  const p = path.join(process.cwd(), ".env.local");
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    const key = m[1]!;
    let val = m[2]!.trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvLocal();

const FAL_KEY = process.env.FAL_KEY;
if (!FAL_KEY) {
  console.error("Missing FAL_KEY");
  process.exit(1);
}
fal.config({ credentials: FAL_KEY });

const OUT_DIR = path.join(process.cwd(), "public/videos/landing");
mkdirSync(OUT_DIR, { recursive: true });

const STILL = path.join(
  process.cwd(),
  "public/images/landing/final-cta-studio.jpg",
);
const OUT = path.join(OUT_DIR, "final-cta-studio.mp4");

const PROMPT =
  "Premium SaaS marketing mock of two overlapping studio windows on a dark violet glow. Soft floating parallax: front product-asset window drifts gently forward, rear designed-poster window drifts slightly opposite. Subtle purple bloom pulse behind the windows. Tiny shimmer on the amber bottle. Keep all UI chrome, titles, and buttons sharp and readable. No morphing text. No people.";

function extractVideoUrl(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const d = data as Record<string, unknown>;
  if (typeof d.video === "object" && d.video && "url" in (d.video as object)) {
    const url = (d.video as { url?: unknown }).url;
    if (typeof url === "string") return url;
  }
  if (typeof d.video_url === "string") return d.video_url;
  if (typeof d.url === "string") return d.url;
  return undefined;
}

async function main() {
  console.log("Uploading final-cta still…");
  const imageUrl = await fal.storage.upload(
    new Blob([readFileSync(STILL)], { type: "image/jpeg" }),
  );

  console.log("Seedance fast I2V…");
  const result = await fal.subscribe(
    "bytedance/seedance-2.0/fast/image-to-video",
    {
      input: {
        prompt: PROMPT,
        image_url: imageUrl,
        resolution: "480p",
        duration: "5",
        aspect_ratio: "auto",
        generate_audio: false,
      },
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === "IN_PROGRESS" && update.logs?.length) {
          const last = update.logs[update.logs.length - 1];
          if (last?.message) console.log(`  ${last.message}`);
        }
      },
    },
  );

  const videoUrl = extractVideoUrl(result.data);
  if (!videoUrl) {
    console.error("No video URL", JSON.stringify(result.data).slice(0, 500));
    process.exit(1);
  }

  const res = await fetch(videoUrl);
  if (!res.ok) throw new Error(`Download failed ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(OUT, buf);
  console.log(`Saved ${OUT} (${(buf.length / 1024 / 1024).toFixed(2)} MB)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
