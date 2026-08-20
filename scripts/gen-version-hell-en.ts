/**
 * English versions of the "version hell / editable" carousel (slides 01–05).
 * Edits the attached ZH frames → EN copy, stamps alchemy-carousel-v2 lockup.
 *
 *   npx tsx --env-file=.env.local scripts/gen-version-hell-en.ts
 */
import { fal } from "@fal-ai/client";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { downloadToFile } from "../lib/pipeline/ffmpeg";

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
const FAL_KEY = process.env.FAL_KEY?.trim();
if (!FAL_KEY) {
  console.error("Missing FAL_KEY");
  process.exit(1);
}
fal.config({ credentials: FAL_KEY });

const ASSETS = path.join(
  process.env.HOME ?? "",
  ".cursor/projects/Users-michaelng-Desktop-alchemy-studio/assets",
);
const LOCKUP_W = path.join(
  process.env.HOME ?? "",
  "Desktop/alchemy-carousel-v2/alchemy-lockup-white.png",
);
const LOCKUP_B = path.join(
  process.env.HOME ?? "",
  "Desktop/alchemy-carousel-v2/alchemy-lockup-black.png",
);
const OUT = path.join(
  process.env.HOME ?? "",
  "Desktop/alchemy-carousel-v2/en-version-hell",
);
mkdirSync(OUT, { recursive: true });

const STYLE =
  "Keep the SAME warm soft 3D claymorphic illustration, camera framing, character, and scene. ONLY replace Chinese text with clean readable English. No Chinese left. No gibberish. Do NOT draw any Alchemy logo, flask mark, or ALCHEMY wordmark — leave bottom-right empty for lockup composite.";

type Slide = {
  id: string;
  src: string;
  lockup: "white" | "black";
  prompt: string;
};

const SLIDES: Slide[] = [
  {
    id: "01-client-more-eye-catching",
    src: path.join(
      ASSETS,
      "01-client-more-eye-catching-4ccb6fd3-c451-4b59-9f22-e2659de4e86a.png",
    ),
    lockup: "white",
    prompt: `${STYLE}
Localize ALL whiteboard + sticky text to English.

TINY top label: Alchemy AI Lab｜Featured

WHITEBOARD:
- Keep V1 → V2 → V3 chips.
- Sticky notes (English only): "Make it pop more" / "Change direction" / "One more version"

MAIN HOOK (large):
Client: "Can you make it more eye-catching?"
You thought it was a small tweak.
The creative journey is just getting started.

Footer: Marketing never stops at V1.`,
  },
  {
    id: "02-small-request-big-project",
    src: path.join(
      ASSETS,
      "02-small-request-big-project-raw-be79531f-be76-463e-b16d-1d4670632072.png",
    ),
    lockup: "white",
    prompt: `${STYLE}
Localize ALL copy to English. Keep exactly four speech bubbles:

1. A bit more premium
2. A bit younger
3. Change the style
4. One more version

Keep small Edit / Revision / V2 chips.

TEXT:
- Title: Client's tiny requests. Huge projects.
- Sub: "A bit more premium" "A bit younger" "Change the style" "One more version" — every tweak is an adventure.
- Bottom: Behind every "small change" is another full iteration.`,
  },
  {
    id: "03-version-hell",
    src: path.join(
      ASSETS,
      "03-version-hell-84f5a9d5-54db-4926-8b36-ed1b27daa328.png",
    ),
    lockup: "white",
    prompt: `${STYLE}
Localize ALL copy to English. Keep folder tabs: V1 · V3 · V19 · FINAL · final_FINAL

TEXT:
- Title: Marketer's version hell
- Sub: "Version_final_FINAL_v19…" — the longer the filename, the shorter your patience.
- Bottom: Messier versions. Lower efficiency.

No duplicate title. No Chinese.`,
  },
  {
    id: "04-ai-edit-pain",
    src: path.join(
      ASSETS,
      "04-ai-edit-pain-raw-d8a89577-0bbd-40e3-bc95-d22c57fab4a9.png",
    ),
    lockup: "black",
    prompt: `${STYLE}
Localize ALL overlay text to English only. Keep the clay office + "Regenerate everything?" dialog with YES button. Remove the Chinese line under Regenerate everything.

TEXT:
- Title: The biggest pain of AI output
- Body: Generation is fast. Editing is slow. Want one small tweak — many tools force a full regenerate.
- Bottom: Uneditable AI output is the bottleneck in creative work.

No Chinese remaining.`,
  },
  {
    id: "05-edit-adjust-iterate",
    src: path.join(
      ASSETS,
      "05-edit-adjust-iterate-raw-eea80639-dbbd-4309-b3ea-167c27b67083.png",
    ),
    lockup: "white",
    prompt: `${STYLE}
Localize ALL Chinese text to English. Keep the center workflow English cards:
V1 Summer Campaign → Edit text → V2 Product Launch → Change visual → V3 Limited Offer
← Back to V2
multiple variations

TEXT:
- Top title ONLY: Edit · Adjust · Improve — no starting over
- Bottom (no duplicate title):
  Every version stays editable.
  Edit. Adjust. Iterate.

Remove Chinese at top and bottom. No gibberish.`,
  },
];

function extractImageUrl(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const d = data as { images?: Array<{ url?: string }>; image?: { url?: string } };
  return d.images?.[0]?.url ?? d.image?.url;
}

async function upload(filePath: string): Promise<string> {
  const buf = readFileSync(filePath);
  const mime = filePath.endsWith(".png") ? "image/png" : "image/jpeg";
  return fal.storage.upload(new Blob([buf], { type: mime }));
}

async function stampLockup(
  srcPath: string,
  destPath: string,
  which: "white" | "black",
): Promise<void> {
  const base = sharp(srcPath);
  const meta = await base.metadata();
  const w = meta.width ?? 824;
  const h = meta.height ?? 1024;
  const lockPath = which === "white" ? LOCKUP_W : LOCKUP_B;
  const targetH = Math.round(h * 0.045);
  const lock = await sharp(lockPath)
    .resize({ height: targetH, fit: "inside" })
    .png()
    .toBuffer({ resolveWithObject: true });
  const lw = lock.info.width ?? 160;
  const lh = lock.info.height ?? targetH;
  const margin = Math.round(Math.min(w, h) * 0.035);
  const shadow = await sharp(lock.data)
    .ensureAlpha()
    .modulate({ brightness: 0.2 })
    .blur(1.2)
    .toBuffer();
  await sharp(srcPath)
    .composite([
      { input: shadow, left: w - margin - lw + 1, top: h - margin - lh + 2 },
      { input: lock.data, left: w - margin - lw, top: h - margin - lh },
    ])
    .png()
    .toFile(destPath);
}

async function editOne(slide: Slide): Promise<void> {
  const rawOut = path.join(OUT, `${slide.id}-raw.png`);
  const finalOut = path.join(OUT, `${slide.id}.png`);
  if (existsSync(finalOut) && !process.argv.includes("--force")) {
    console.log(`skip ${slide.id}`);
    return;
  }
  if (!existsSync(slide.src)) {
    throw new Error(`Missing source: ${slide.src}`);
  }
  console.log(`edit ${slide.id}…`);
  const url = await upload(slide.src);
  const result = await fal.subscribe("fal-ai/nano-banana-2/edit", {
    input: {
      prompt: slide.prompt,
      image_urls: [url],
      aspect_ratio: "4:5",
      num_images: 1,
    },
    logs: true,
  });
  const imgUrl = extractImageUrl(result.data);
  if (!imgUrl) throw new Error(`No image for ${slide.id}`);
  await downloadToFile(imgUrl, rawOut);
  await stampLockup(rawOut, finalOut, slide.lockup);
  console.log(`✓ ${finalOut}`);
}

async function main() {
  for (const slide of SLIDES) {
    await editOne(slide);
  }
  writeFileSync(
    path.join(OUT, "README.txt"),
    `Version-hell carousel — English\n` +
      `Logo: alchemy-carousel-v2 lockup BR\n` +
      SLIDES.map((s) => s.id).join("\n") +
      "\n",
  );
  console.log("ALL DONE →", OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
