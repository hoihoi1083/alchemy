/**
 * Week 1 Reel v2 — "One photo. Full campaign." (~22s, EN + 简体)
 *
 *   npx tsx --env-file=.env.local scripts/gen-week1-reel-v2.ts --both
 *   npx tsx --env-file=.env.local scripts/gen-week1-reel-v2.ts --lang en
 *   npx tsx --env-file=.env.local scripts/gen-week1-reel-v2.ts --lang zh --skip-stills
 *
 * Outputs → ~/Downloads/Alchemy Week 1 Marketing/Reel 1/
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fal } from "@fal-ai/client";
import { burnCaptionsOverlay } from "../lib/pipeline/caption-overlay-burn";
import type { CaptionLine } from "../lib/ad-pack-types";
import { concatVideos, downloadToFile } from "../lib/pipeline/ffmpeg";

type Lang = "en" | "zh";

const OUT_ROOT = path.join(
  process.env.HOME ?? "",
  "Downloads",
  "Alchemy Week 1 Marketing",
  "Reel 1",
);
const WORK = path.join(process.cwd(), ".tmp/week1-reel-v2");

const BRAND =
  "Premium SaaS UI, soft violet and blue accents, clean white panels, 9:16 vertical phone mock, high-end marketing creative, crisp readable typography, no watermarks, no real brand logos except ALCHEMY AI LAB when specified.";

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

function argFlag(name: string): boolean {
  return process.argv.includes(name);
}

function argValue(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
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
  const buf = readFileSync(filePath);
  return fal.storage.upload(new Blob([buf], { type: mime }));
}

function sceneDefs(lang: Lang): Array<{ id: string; prompt: string; editRefs?: string[] }> {
  const L = lang === "zh";
  return [
    {
      id: "01-hook",
      prompt: L
        ? `${BRAND} Hook frame. 一张护肤品瓶产品图摆在桌上，旁边日历大字「今天截止」，空白对话框和问号 — 表现「有产品图但不知道发什么」。不要讲产品功效。中文大字标题：「一张产品图，今天就要交稿？」`
        : `${BRAND} Hook frame. One skincare serum bottle product photo on a desk, calendar or sticky note screaming DUE TODAY, empty thought bubble and question marks — marketer panic, NOT product features. Big headline: "One product photo. Campaign due today?"`,
    },
    {
      id: "02-upload",
      prompt: L
        ? `${BRAND} Upload beat. UI 显示「上传一张产品图」，产品图落入上传区。下方灰色 Prompt 输入框闪一下，被红色大 X 划掉。旁边醒目中文：「无需写 Prompt」。`
        : `${BRAND} Upload beat. UI label "Upload one product photo" — bottle drops into upload zone. Grey Prompt textarea flashes then struck through with big red X. Bold label: "No prompt needed."`,
    },
    {
      id: "03-research",
      prompt: L
        ? `${BRAND} AI 研究界面。标题「AI 研究」下方快速展示四张卡片：受众、竞品、内容角度、视觉方向 — 每张有不同图标和数据感，让人看懂 AI 在分析而非乱生图。`
        : `${BRAND} AI Research screen. Header "AI Research". Four cards visible with icons: Audience, Competitors, Content Angle, Visual Direction — feels like analysis in progress, not random generation.`,
    },
    {
      id: "04-storyboard",
      prompt: L
        ? `${BRAND} 分镜优先。上方「Campaign 方向」箭头指向下方「分镜」面板，清晰展示 Scene 01 开场、Scene 02 产品、Scene 03 卖点、Scene 04 行动号召 四格缩略图。画面停住，适合 hold 1.5 秒。`
        : `${BRAND} Storyboard First hold. Top "Campaign Direction" arrow pointing to "Storyboard" panel with four clear thumbnails labeled Scene 01 Hook, Scene 02 Product, Scene 03 Benefit, Scene 04 CTA. Static hero frame.`,
    },
    {
      id: "05-storyboard-grid",
      prompt: L
        ? `${BRAND} 分镜网格特写。四场景并排，中文标签：开场 / 产品 / 卖点 / 行动号召。干净 UI。`
        : `${BRAND} Close storyboard grid. Four scenes side by side: Hook, Product, Benefit, CTA labels. Clean UI.`,
    },
    {
      id: "06-outputs",
      prompt: L
        ? `${BRAND} 同一琥珀色精华瓶，四种完全不同的创意输出（不是同图换尺寸）：生活方式帖、卖点广告、Reel 封面、Campaign KV — 布局/场景/文案位置明显不同。小字：一个产品，多种创意方向。`
        : `${BRAND} Same amber serum bottle but FOUR clearly different creative concepts (NOT same image resized): Lifestyle Post, Benefit Ad, Reel cover, Campaign KV — different layouts and scenes. Subline: One product. Multiple creative directions.`,
    },
    {
      id: "07-editable",
      prompt: L
        ? `${BRAND} 编辑界面。用户点击一张生成图，侧边出现：改标题、改场景、改视觉、编辑分镜 — 其中一项高亮，画面即时更新预览。`
        : `${BRAND} Edit mode. User taps one output; side panel shows Change headline, Change scene, Change visual, Edit storyboard — one control highlighted, preview updates.`,
    },
    {
      id: "08-cta",
      prompt: L
        ? `${BRAND} 干净结尾卡。Alchemy 水晶 flask 公仔居中，下方 ALCHEMY / AI LAB 正确 logo 字标。大字：一张照片，完整 campaign。小字：试试 Alchemy →。背景简洁紫白渐变。`
        : `${BRAND} Clean end card. Cute crystalline flask mascot centered, ALCHEMY AI LAB wordmark below. Big text: One photo. Full campaign. Small: Try Alchemy →. Minimal purple-white gradient.`,
      editRefs: ["mascot", "wordmark"],
    },
  ];
}

const CAPTIONS: Record<Lang, CaptionLine[]> = {
  en: [
    { startSec: 0, endSec: 2.2, text: "One product photo.\nCampaign due today?", position: "top" },
    { startSec: 2.0, endSec: 4.2, text: "Upload photo\nNo prompt needed.", position: "bottom" },
    { startSec: 4.0, endSec: 7.2, text: "AI Research\nAudience · Competitors · Angles", position: "bottom" },
    { startSec: 7.0, endSec: 10.2, text: "Plan first.\nGenerate second.", position: "top" },
    { startSec: 9.8, endSec: 13.2, text: "Storyboard First", position: "top" },
    { startSec: 13.0, endSec: 17.2, text: "One product.\nMultiple creative directions.", position: "bottom" },
    { startSec: 17.0, endSec: 20.2, text: "Edit. Adjust. Iterate.", position: "bottom" },
    { startSec: 20.0, endSec: 22.5, text: "One photo. Full campaign.\nTry Alchemy →", position: "center" },
  ],
  zh: [
    { startSec: 0, endSec: 2.2, text: "一张产品图\n今天就要交稿？", position: "top" },
    { startSec: 2.0, endSec: 4.2, text: "上传产品图\n无需写 Prompt", position: "bottom" },
    { startSec: 4.0, endSec: 7.2, text: "AI 研究\n受众 · 竞品 · 内容角度", position: "bottom" },
    { startSec: 7.0, endSec: 10.2, text: "先规划，再生成。", position: "top" },
    { startSec: 9.8, endSec: 13.2, text: "分镜优先", position: "top" },
    { startSec: 13.0, endSec: 17.2, text: "一个产品\n多种创意方向", position: "bottom" },
    { startSec: 17.0, endSec: 20.2, text: "编辑 · 调整 · 迭代", position: "bottom" },
    { startSec: 20.0, endSec: 22.5, text: "一张照片，完整 campaign\n试试 Alchemy →", position: "center" },
  ],
};

function h3PromptPartA(): string {
  return [
    "@Image1 @Image2 @Image3 @Image4",
    "Vertical 9:16 premium SaaS marketing reel, fast but readable.",
    "Beat 1 (~2s): hold Image 1 hook — deadline stress, one product photo.",
    "Beat 2 (~2s): transition to Image 2 upload — prompt box flashes then red X, emphasize No prompt needed.",
    "Beat 3 (~3s): Image 3 AI Research — four cards pop in: Audience, Competitors, Content Angle, Visual Direction.",
    "Beat 4 (~4s): hold Image 4 — Campaign Direction arrow to Storyboard with Scene 01-04, pause on storyboard.",
    "Smooth UI motion, no garbled morphing text, keep type legible.",
  ].join(" ");
}

function h3PromptPartB(): string {
  return [
    "@Image5 @Image6 @Image7 @Image8",
    "Vertical 9:16 premium SaaS marketing reel continuation.",
    "Beat 5 (~2s): hold Image 5 storyboard grid.",
    "Beat 6 (~4s): Image 6 — four DISTINCT creative outputs, same product, different concepts (not resize).",
    "Beat 7 (~3s): Image 7 edit mode — user changes headline/scene, preview updates.",
    "Beat 8 (~2s): hold Image 8 clean CTA end card with mascot and logo.",
    "Smooth transitions, readable UI, no text corruption.",
  ].join(" ");
}

async function genStill(
  lang: Lang,
  scene: { id: string; prompt: string; editRefs?: string[] },
  dir: string,
  refs: Record<string, string>,
): Promise<string> {
  const out = path.join(dir, `${scene.id}.jpg`);
  if (existsSync(out) && !argFlag("--force-stills")) {
    console.log(`  skip still ${scene.id} (exists)`);
    return out;
  }
  console.log(`  still ${lang}/${scene.id}…`);
  let result;
  if (scene.editRefs?.length) {
    const urls: string[] = [];
    if (scene.editRefs.includes("mascot")) urls.push(refs.mascot);
    if (scene.editRefs.includes("wordmark")) urls.push(refs.wordmark);
    result = await fal.subscribe("fal-ai/nano-banana-2/edit", {
      input: {
        prompt: scene.prompt,
        image_urls: urls,
        aspect_ratio: "9:16",
        num_images: 1,
      },
      logs: true,
    });
  } else {
    result = await fal.subscribe("fal-ai/nano-banana-2", {
      input: { prompt: scene.prompt, aspect_ratio: "9:16", num_images: 1 },
      logs: true,
    });
  }
  const url = extractImageUrl(result.data);
  if (!url) throw new Error(`No image for ${scene.id}`);
  await downloadToFile(url, out);
  return out;
}

async function genH3Clip(
  imagePaths: string[],
  prompt: string,
  duration: number,
  outPath: string,
): Promise<void> {
  if (existsSync(outPath) && !argFlag("--force-video")) {
    console.log(`  skip clip ${path.basename(outPath)} (exists)`);
    return;
  }
  const refs = await Promise.all(
    imagePaths.map((p) => uploadLocal(p, "image/jpeg")),
  );
  console.log(`  H3 ${duration}s × ${refs.length} refs → ${path.basename(outPath)}…`);
  const result = await fal.subscribe("minimax/h3/reference-to-video", {
    input: {
      prompt,
      reference_image_urls: refs,
      duration,
      resolution: "768P",
      aspect_ratio: "9:16",
    },
    logs: true,
  });
  const url = extractVideoUrl(result.data);
  if (!url) throw new Error(`No video URL for ${outPath}`);
  await downloadToFile(url, outPath);
}

async function buildLang(lang: Lang, refs: Record<string, string>): Promise<string> {
  const dir = path.join(WORK, lang);
  mkdirSync(dir, { recursive: true });
  mkdirSync(OUT_ROOT, { recursive: true });

  const scenes = sceneDefs(lang);
  const stillPaths: string[] = [];

  if (!argFlag("--skip-stills")) {
    console.log(`\n=== Stills (${lang}) ===`);
    for (const scene of scenes) {
      stillPaths.push(await genStill(lang, scene, dir, refs));
    }
  } else {
    for (const scene of scenes) {
      const p = path.join(dir, `${scene.id}.jpg`);
      if (!existsSync(p)) throw new Error(`Missing still: ${p}`);
      stillPaths.push(p);
    }
  }

  const clipA = path.join(dir, "clip-a.mp4");
  const clipB = path.join(dir, "clip-b.mp4");
  const raw = path.join(dir, "raw-stitched.mp4");

  if (!argFlag("--skip-video")) {
    console.log(`\n=== Video (${lang}) ===`);
    await genH3Clip(stillPaths.slice(0, 4), h3PromptPartA(), 11, clipA);
    await genH3Clip(stillPaths.slice(4, 8), h3PromptPartB(), 11, clipB);
    await concatVideos([clipA, clipB], raw);
  } else if (!existsSync(raw)) {
    throw new Error(`Missing ${raw} — run without --skip-video`);
  }

  console.log(`\n=== Captions (${lang}) ===`);
  const capDir = path.join(dir, "caption-work");
  mkdirSync(capDir, { recursive: true });
  const out =
    lang === "en"
      ? path.join(OUT_ROOT, "week1-reel-v2-en.mp4")
      : path.join(OUT_ROOT, "week1-reel-v2-zh-cn.mp4");
  if (lang === "zh") {
    const py = path.join(process.cwd(), "scripts/burn-reel-captions-cjk.py");
    const r = spawnSync("python3", [py, raw, out], { encoding: "utf8" });
    if (r.status !== 0) {
      console.error(r.stderr || r.stdout);
      throw new Error("CJK caption burn failed");
    }
  } else {
    await burnCaptionsOverlay(raw, CAPTIONS[lang], out, capDir, "classic");
  }
  console.log(`✓ ${out}`);
  return out;
}

async function main() {
  loadEnvLocal();
  const key = process.env.FAL_KEY?.trim();
  if (!key) {
    console.error("Missing FAL_KEY in .env.local");
    process.exit(1);
  }
  fal.config({ credentials: key });
  mkdirSync(WORK, { recursive: true });
  mkdirSync(OUT_ROOT, { recursive: true });

  const mascot = path.join(process.cwd(), "public/images/landing/alchemy-mascot-v3-center.png");
  const wordmark = path.join(process.cwd(), "public/images/brand/alchemy-wordmark-black.png");
  if (!existsSync(mascot) || !existsSync(wordmark)) {
    console.error("Missing mascot/wordmark assets");
    process.exit(1);
  }
  console.log("Uploading brand refs…");
  const refs = {
    mascot: await uploadLocal(mascot, "image/png"),
    wordmark: await uploadLocal(wordmark, "image/png"),
  };

  const langs: Lang[] = argFlag("--both")
    ? ["en", "zh"]
    : [((argValue("--lang") ?? "en") as Lang)];

  writeFileSync(
    path.join(OUT_ROOT, "week1-reel-v2-storyboard.json"),
    JSON.stringify({ beats: CAPTIONS, langs }, null, 2),
  );

  for (const lang of langs) {
    await buildLang(lang, refs);
  }

  console.log("\nAll done →", OUT_ROOT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
