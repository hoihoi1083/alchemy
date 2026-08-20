/**
 * Revise Week1 "version hell / editable" carousel slides (图1–5).
 * Uses nano-banana-2/edit + alchemy-carousel-v2 lockup (transparent, BR, no plate).
 *
 *   npx tsx --env-file=.env.local scripts/fix-version-hell-carousel.ts
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
  "Desktop/alchemy-carousel-v2/zh-cn-version-hell",
);
mkdirSync(OUT, { recursive: true });

const STYLE =
  "Keep warm soft 3D claymorphic / clay office illustration style. Same camera framing and character/scene identity. Clean readable Simplified Chinese typography. No gibberish characters. Do NOT draw any Alchemy logo, flask mark, or ALCHEMY wordmark — leave bottom-right empty for later composite.";

type Slide = {
  id: string;
  src: string;
  lockup: "white" | "black";
  prompt: string;
};

const SLIDES: Slide[] = [
  {
    id: "01-client-more-eye-catching",
    src: path.join(ASSETS, "slide-1__2_-35bf1a20-055f-49fa-934f-25388076305e.png"),
    lockup: "white",
    prompt: `${STYLE}
Revise this fisheye whiteboard creative-office slide for mobile clarity.

WHITEBOARD CLEANUP:
- Keep only a clear progression: V1 → V2 → V3 (large readable chips).
- Keep only 2–3 sticky notes with Simplified Chinese: 「再突出一点」「换个方向」「再来一版」.
- Remove dense V1/V2/V3/V4 sticker noise, MORE POP, ALMOST THERE?, and tiny UI mock clutter.
- Desk clutter on the left: reduce about 30% (fewer pens, mugs, papers).

TEXT (Simplified Chinese):
- Tiny column label at top: Alchemy AI Lab｜推介 (small, not the hero).
- Main Hook (large, readable):
  客户：「可以再抢眼一点吗？」
  你以为只是小改。
  其实创作旅程才刚开始。
- Keep a short footer line: 行销永远不会停在第一版。

Hand OK gesture can stay. Warm clay office look.`,
  },
  {
    id: "02-small-request-big-project",
    src: path.join(ASSETS, "slide-2__2_-265c4ccb-05dc-4e18-8ea0-a19da9f51f4c.png"),
    lockup: "white",
    prompt: `${STYLE}
Revise this clay character desk slide.

SPEECH BUBBLES — keep exactly four clear requests (Simplified Chinese), remove extras especially the unclear 「一点」 bubble:
1. 更高级一点
2. 更年轻一点
3. 换个风格
4. 再来一版

Add a few small versioning icons near bubbles: Edit / Revision / V2 style chips (simple, not noisy).

Desk props: reduce clutter ~30%.

TEXT (Simplified Chinese):
- Title: 客户的小要求，大工程
- Sub: 「更高级一点」「更年轻一点」「换个风格」「再来一版」——每个微调都是一场冒险。
- Bottom: 每个“小改动”，背后都是一轮新迭代。`,
  },
  {
    id: "03-version-hell",
    src: path.join(ASSETS, "slide-3__1_-badb0244-cd61-4709-a150-2f5c007e4c89.png"),
    lockup: "white",
    prompt: `${STYLE}
Revise this "version hell" desk + yellow folder slide.

CRITICAL LAYOUT FIX:
- Remove the DUPLICATE large title block at the bottom. Title only once at the top.

FOLDER TABS — keep only these five labels (clear, not overcrowded):
V1 · V3 · V19 · FINAL · final_FINAL

Reduce desk clutter (crumpled paper, pens, cups) about 30%. Desktop windows can stay messy but less dense.

TEXT (Simplified Chinese), top only:
- Title: 行销人的版本地狱
- Sub: 「Version_final_FINAL_v19…」——档案名称越来越长，你的耐心越来越短。
- Bottom single line only: 版本越乱，效率越低。`,
  },
  {
    id: "04-ai-edit-pain",
    src: path.join(ASSETS, "slide-4__1_-cfd250f2-e223-4a5f-a50f-5d2b6a0b4338.png"),
    lockup: "black",
    prompt: `${STYLE}
COMPLETE STYLE + METAPHOR CHANGE. Do NOT keep the heavy sci-fi robot arm / giant gears / code walls.

Restyle to the SAME warm soft 3D clay Alchemy Creative Lab office as the other slides.

New visual story (clear for mobile):
1) An AI-generated marketing image (product creative) is on a screen.
2) User highlights ONE tiny detail to change (small edit cursor / selection).
3) A dialog / modal prominently asks: 「Regenerate everything?」 / 「全部重新生成？」
Emphasize: generation is easy, editing is painful — not that AI is broken.

TEXT (Simplified Chinese):
- Title: AI 输出的最大痛点
- Body: 生成很快，修改很慢。想微调一个细节，很多工具却只能全部重来。
- Bottom: 不可编辑的 AI 输出，是创意流程的瓶颈。`,
  },
  {
    id: "05-edit-adjust-iterate",
    src: path.join(ASSETS, "slide-5-c8bd0619-88b5-4ec7-9d5b-94fbe6f99e02.png"),
    lockup: "white",
    prompt: `${STYLE}
Revise this holographic workflow slide — keep the warm lab + hand with stylus energy, but clean the logic.

LAYOUT:
- Keep ONE title at the top only. Delete the duplicate large title at the bottom.
- Soften / fade background dashboards by ~40% so the center workflow wins.

CENTER WORKFLOW (crystal clear versioning):
V1 → Edit text → V2
V2 → Change visual → V3
Also show a clear back arrow: ← Back to V2
Message at a glance: editable / branchable / rewindable / no full regenerate.

Card copy — replace ALL gibberish with normal English creative titles only, e.g.:
Summer Campaign · Product Launch · Limited Offer

TEXT:
- Top title (Simplified Chinese ok): 编辑 · 调整 · 改进，无需重来
- Bottom (no repeated title):
  每个版本都可以继续编辑。
  编辑 · 调整 · 迭代。
  Also small English: Every version stays editable. Edit. Adjust. Iterate.

Do not invent a new logo; leave bottom-right clear.`,
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
  // soft shadow plate (transparent) via slight blur shadow layer
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
    `Version-hell carousel fixes (简体)\n` +
      `Logo: alchemy-carousel-v2 lockup transparent BR (same as en/zh-cn slides)\n` +
      SLIDES.map((s) => s.id).join("\n") +
      "\n",
  );
  console.log("ALL DONE →", OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
