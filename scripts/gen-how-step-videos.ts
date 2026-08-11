/**
 * Generate Seedance I2V loops for landing How-it-works cards.
 *
 *   npx tsx scripts/gen-how-step-videos.ts
 *
 * Writes: public/videos/landing/how-step-{1..4}.mp4
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

const STEPS = [
  {
    id: 1,
    file: "how-step-1-upload.jpg",
    startFile: "how-step-1-upload-empty.jpg",
    out: "how-step-1-upload.mp4",
    prompt:
      "Product upload UI mock only. Soft paste-in motion: product photo settles into the dashed upload well with a light bounce. Phone style-reference stays mostly still with a tiny droplet shimmer. Keep UI labels sharp. No morphing text. No people.",
  },
  {
    id: 2,
    file: "how-step-2-analyze.jpg",
    out: "how-step-2-analyze.mp4",
    prompt:
      "AI style analysis UI. Soft violet scan beam sweeps across the amber bottle. Neural brain badge gently pulses. Palette cards stay fixed and sharp. Light camera push-in. No morphing text. No people.",
  },
  {
    id: 3,
    file: "how-step-3-plan.jpg",
    out: "how-step-3-plan.mp4",
    prompt:
      "Storyboard planner with three frames. Soft Ken Burns left-to-right across frames, then settle. Timeline and labels stay locked. No morphing text. No people.",
  },
  {
    id: 4,
    file: "how-step-4-generate.jpg",
    out: "how-step-4-generate.mp4",
    prompt:
      "Video edit canvas with filmstrip and Play control. Soft cinematic zoom into the product preview. Play button breathes with a gentle glow. UI text stays sharp. No morphing labels. No people.",
  },
] as const;

type Step = (typeof STEPS)[number];

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

async function download(url: string, dest: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed ${res.status} ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(dest, buf);
  return buf.length;
}

async function generateOne(step: Step, attempt = 1) {
  const endPath = path.join(process.cwd(), "public/images/landing", step.file);
  const startName = "startFile" in step ? step.startFile : undefined;
  const startPath = startName
    ? path.join(process.cwd(), "public/images/landing", startName)
    : endPath;

  console.log(`[${step.id}] uploading start ${path.basename(startPath)}…`);
  const startUrl = await fal.storage.upload(
    new Blob([readFileSync(startPath)], { type: "image/jpeg" }),
  );

  let endUrl: string | undefined;
  if (startName) {
    console.log(`[${step.id}] uploading end ${step.file}…`);
    endUrl = await fal.storage.upload(
      new Blob([readFileSync(endPath)], { type: "image/jpeg" }),
    );
  }

  console.log(`[${step.id}] Seedance fast I2V (attempt ${attempt})…`);
  try {
    const result = await fal.subscribe("bytedance/seedance-2.0/fast/image-to-video", {
      input: {
        prompt: step.prompt,
        image_url: startUrl,
        ...(endUrl ? { end_image_url: endUrl } : {}),
        resolution: "480p",
        duration: startName ? "5" : "4",
        aspect_ratio: "auto",
        generate_audio: false,
      },
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === "IN_PROGRESS" && update.logs?.length) {
          const last = update.logs[update.logs.length - 1];
          if (last?.message) console.log(`  [${step.id}] ${last.message}`);
        }
      },
    });

    const videoUrl = extractVideoUrl(result.data);
    if (!videoUrl) {
      console.error(`[${step.id}] no video URL`, JSON.stringify(result.data).slice(0, 500));
      throw new Error(`No video URL for step ${step.id}`);
    }

    const dest = path.join(OUT_DIR, step.out);
    const size = await download(videoUrl, dest);
    console.log(`[${step.id}] saved ${dest} (${(size / 1024 / 1024).toFixed(2)} MB)`);
    return dest;
  } catch (e: unknown) {
    const err = e as { status?: number; body?: unknown; message?: string };
    console.error(`[${step.id}] fal error status=${err.status}`);
    console.error(JSON.stringify(err.body, null, 2));
    if (attempt < 3) {
      console.log(`[${step.id}] retrying in 4s…`);
      await new Promise((r) => setTimeout(r, 4000));
      return generateOne(step, attempt + 1);
    }
    throw e;
  }
}

async function main() {
  const only = process.argv
    .slice(2)
    .map((v) => Number(v))
    .filter((n) => Number.isFinite(n) && n >= 1 && n <= 4);
  const queue = only.length
    ? STEPS.filter((s) => only.includes(s.id))
    : [...STEPS];
  console.log(
    `Generating How-it-works Seedance loops: ${queue.map((s) => s.id).join(", ")}…`,
  );
  for (const step of queue) {
    await generateOne(step);
  }
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
