/**
 * Week 1 Reel v3 — rewrite of ability reel with pain-point hook + 4 pillars.
 * Standalone fal generation (not Studio wizard). Mascot + carousel lockup.
 *
 *   npx tsx --env-file=.env.local scripts/gen-week1-reel-v3.ts --both
 *   npx tsx --env-file=.env.local scripts/gen-week1-reel-v3.ts --lang en
 *
 * Outputs → ~/Downloads/Alchemy Week 1 Marketing/Reel 1/week1-reel-v3-*.mp4
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fal } from "@fal-ai/client";
import sharp from "sharp";
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
const WORK = path.join(process.cwd(), ".tmp/week1-reel-v3");
const LOCKUP_W = path.join(
  process.env.HOME ?? "",
  "Desktop/alchemy-carousel-v2/alchemy-lockup-white.png",
);
const LOCKUP_B = path.join(
  process.env.HOME ?? "",
  "Desktop/alchemy-carousel-v2/alchemy-lockup-black.png",
);
const MASCOT = path.join(
  process.cwd(),
  "public/images/landing/alchemy-flask-mascot-center.png",
);

/** Match original ability-reel look: clean light UI, soft violet, flat 2D. */
const STYLE =
  "Vertical 9:16 Instagram Reel still. Clean light off-white background, soft violet/blue accents, flat modern marketing UI illustration style matching Alchemy ability demos. Crisp readable sans typography. No watermarks. No cluttered dashboards. No feature bullet lists.";

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

async function stampLockup(
  srcPath: string,
  destPath: string,
  which: "white" | "black",
): Promise<void> {
  const base = sharp(srcPath);
  const meta = await base.metadata();
  const w = meta.width ?? 1080;
  const h = meta.height ?? 1920;
  const lockPath = which === "white" ? LOCKUP_W : LOCKUP_B;
  const targetH = Math.round(h * 0.055);
  const lock = await sharp(lockPath)
    .resize({ height: targetH, fit: "inside" })
    .png()
    .toBuffer({ resolveWithObject: true });
  const lw = lock.info.width ?? 160;
  const lh = lock.info.height ?? targetH;
  const margin = Math.round(Math.min(w, h) * 0.04);
  const shadow = await sharp(lock.data)
    .ensureAlpha()
    .modulate({ brightness: 0.15 })
    .blur(1.5)
    .toBuffer();
  await sharp(srcPath)
    .composite([
      { input: shadow, left: w - margin - lw + 1, top: h - margin - lh + 2 },
      { input: lock.data, left: w - margin - lw, top: h - margin - lh },
    ])
    .jpeg({ quality: 92 })
    .toFile(destPath);
}

function sceneDefs(lang: Lang): Array<{
  id: string;
  prompt: string;
  editRefs?: Array<"mascot" | "style">;
  stampLockup?: "white" | "black";
}> {
  const L = lang === "zh";
  return [
    {
      id: "01-hook",
      prompt: L
        ? `${STYLE} Hook only — pain point, NOT brand slogan. Center: one skincare product photo in a simple photo frame. Beside it a calendar sticky note 「今天截止」 and empty thought bubble with 「???」. Confused marketer silhouette. Big Chinese headline at top:「一张产品图。今天就要交稿？」NO product benefits. NO feature list. NO "Good marketing starts…" copy. Leave bottom-right empty (no logo).`
        : `${STYLE} Hook only — pain point, NOT brand slogan. Center: one skincare product photo in a simple photo frame. Beside it sticky calendar "DUE TODAY" and empty thought bubble with "???". Confused marketer silhouette. Big headline at top: "One product photo. Campaign due today?" NO product benefits. NO feature list. NO "Good marketing starts before generation". Leave bottom-right empty (no logo).`,
      editRefs: ["style"],
    },
    {
      id: "02-upload",
      prompt: L
        ? `${STYLE} Upload beat. Label「上传一张产品图」. Product photo drops into upload zone. Below: grey Prompt textarea flashes then struck with thick red X and ❌. Bold Chinese:「无需写 Prompt」. Visual proof of No Prompt Needed. Leave bottom-right empty.`
        : `${STYLE} Upload beat. Label "Upload one product photo". Product photo drops into upload zone. Below: grey Prompt textarea flashes then struck with thick red X and ❌. Bold text: "No prompt needed." Visual proof — not a paragraph. Leave bottom-right empty.`,
      editRefs: ["style"],
    },
    {
      id: "03-research",
      prompt: L
        ? `${STYLE} AI Research screen. Title「AI 研究」. Four clear result cards with icons popping in: 受众 / 竞品 / 内容角度 / 视觉方向. Feels like analysis in progress — Alchemy understands the product before generating. Leave bottom-right empty.`
        : `${STYLE} AI Research screen. Title "AI Research". Four clear result cards with icons popping in: Audience / Competitors / Content Angle / Visual Direction. Feels like analysis in progress — Alchemy understands the product before generating. Leave bottom-right empty.`,
      editRefs: ["style"],
    },
    {
      id: "04-direction",
      prompt: L
        ? `${STYLE} Hold frame. Large text「Campaign Direction」with arrow ↓ pointing to「Storyboard」. Clean, readable, pause-friendly for 1–1.5s. Leave bottom-right empty.`
        : `${STYLE} Hold frame. Large text "Campaign Direction" with arrow ↓ pointing to "Storyboard". Clean, readable, pause-friendly for 1–1.5s. Leave bottom-right empty.`,
    },
    {
      id: "05-storyboard",
      prompt: L
        ? `${STYLE} Storyboard First close-up. Four scene thumbnails clearly labeled: Scene 01 — 开场 / Scene 02 — 产品 / Scene 03 — 卖点 / Scene 04 — 行动号召. Hold-friendly composition. Leave bottom-right empty.`
        : `${STYLE} Storyboard First close-up. Four scene thumbnails clearly labeled: Scene 01 — Hook / Scene 02 — Product / Scene 03 — Benefit / Scene 04 — CTA. Hold-friendly composition. Leave bottom-right empty.`,
    },
    {
      id: "06-outputs",
      prompt: L
        ? `${STYLE} Same amber serum bottle, FOUR clearly DIFFERENT creative concepts (NOT same image resized): 生活方式帖 / 卖点广告 / Reel封面 / Campaign KV — different scenes, layouts, copy placement. Small line:「一个产品，多种创意方向」. Leave bottom-right empty.`
        : `${STYLE} Same amber serum bottle, FOUR clearly DIFFERENT creative concepts (NOT same image resized): Lifestyle Post / Benefit Ad / Reel cover / Campaign KV — different scenes, layouts, copy placement. Small line: "One product. Multiple creative directions." Leave bottom-right empty.`,
    },
    {
      id: "07-editable",
      prompt: L
        ? `${STYLE} Editable beat. User taps one generated creative. Side panel shows: 改标题 / 改场景 / 改视觉 / 编辑分镜 — one option highlighted, preview updates immediately. Leave bottom-right empty.`
        : `${STYLE} Editable beat. User taps one generated creative. Side panel shows: Change headline / Change scene / Change visual / Edit storyboard — one option highlighted, preview updates immediately. Leave bottom-right empty.`,
    },
    {
      id: "08-cta",
      prompt: L
        ? `${STYLE} CLEAN end card only. Exact IMAGE 1 Alchemy flask mascot (cute crystalline flask with eyes) large and centered — keep identity. Soft purple-white gradient, NO phone mock, NO dashboards, NO feature list. Large Chinese headline:「一张照片，完整 campaign」. Soft line below:「试试 Alchemy →」. Do NOT draw any Alchemy logo or wordmark — leave bottom-right empty for lockup composite.`
        : `${STYLE} CLEAN end card only. Exact IMAGE 1 Alchemy flask mascot (cute crystalline flask with eyes) large and centered — keep identity. Soft purple-white gradient, NO phone mock, NO dashboards, NO feature list. Large headline: "One photo. Full campaign." Soft line below: "Try Alchemy →". Do NOT draw any Alchemy logo or wordmark — leave bottom-right empty for lockup composite.`,
      editRefs: ["mascot"],
      stampLockup: "black",
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
    "Vertical 9:16 Alchemy SaaS marketing reel, clean light UI, fast but readable.",
    "0-2s: hold Image 1 hook — one product photo + deadline panic. Do not morph text.",
    "2-4s: Image 2 upload — Prompt box flashes then big red X / No prompt needed.",
    "4-7s: Image 3 AI Research — four cards Audience/Competitors/Angle/Visual pop in.",
    "7-11s: Image 4 Campaign Direction ↓ Storyboard — hold readable 1+ seconds.",
    "Smooth UI transitions, keep type legible, no garbled characters.",
  ].join(" ");
}

function h3PromptPartB(): string {
  return [
    "@Image5 @Image6 @Image7 @Image8",
    "Vertical 9:16 Alchemy SaaS marketing reel continuation.",
    "0-2s: hold Image 5 storyboard grid Scene 01-04.",
    "2-6s: Image 6 — four DISTINCT creative concepts, same product, not resize.",
    "6-9s: Image 7 edit mode — tap creative, change headline/scene, preview updates.",
    "9-11s: hold Image 8 clean CTA — flask mascot + One photo Full campaign. No feature list.",
    "Smooth transitions, readable UI, no text corruption.",
  ].join(" ");
}

async function genStill(
  lang: Lang,
  scene: {
    id: string;
    prompt: string;
    editRefs?: Array<"mascot" | "style">;
    stampLockup?: "white" | "black";
  },
  dir: string,
  refs: Record<string, string>,
): Promise<string> {
  const out = path.join(dir, `${scene.id}.jpg`);
  const raw = path.join(dir, `${scene.id}-raw.jpg`);
  if (existsSync(out) && !argFlag("--force-stills")) {
    console.log(`  skip still ${scene.id} (exists)`);
    return out;
  }
  console.log(`  still ${lang}/${scene.id}…`);
  let result;
  if (scene.editRefs?.length) {
    const urls: string[] = [];
    if (scene.editRefs.includes("mascot")) urls.push(refs.mascot);
    if (scene.editRefs.includes("style")) urls.push(refs.style);
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
  if (scene.stampLockup) {
    await downloadToFile(url, raw);
    await stampLockup(raw, out, scene.stampLockup);
  } else {
    await downloadToFile(url, out);
  }
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
  const refs = await Promise.all(imagePaths.map((p) => uploadLocal(p, "image/jpeg")));
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
      ? path.join(OUT_ROOT, "week1-reel-v3-en.mp4")
      : path.join(OUT_ROOT, "week1-reel-v3-zh-cn.mp4");
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

  const styleRef = path.join(WORK, "refs/orig-01.jpg");
  if (!existsSync(MASCOT) || !existsSync(LOCKUP_B) || !existsSync(styleRef)) {
    console.error("Missing mascot / lockup / style ref", { MASCOT, LOCKUP_B, styleRef });
    process.exit(1);
  }

  console.log("Uploading brand refs (flask mascot + original style frame)…");
  const refs = {
    mascot: await uploadLocal(MASCOT, "image/png"),
    style: await uploadLocal(styleRef, "image/jpeg"),
  };

  const langs: Lang[] = argFlag("--both")
    ? ["en", "zh"]
    : [((argValue("--lang") ?? "en") as Lang)];

  writeFileSync(
    path.join(OUT_ROOT, "week1-reel-v3-storyboard.json"),
    JSON.stringify(
      {
        source: "vFG4ZDUst20x_jsoCPD6j_7ATeKS0l.mp4",
        mascot: "alchemy-flask-mascot-center.png",
        lockup: "alchemy-carousel-v2/alchemy-lockup-*.png",
        beats: CAPTIONS,
        langs,
      },
      null,
      2,
    ),
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
