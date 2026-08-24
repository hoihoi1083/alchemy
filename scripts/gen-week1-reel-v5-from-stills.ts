/**
 * Week 1 Reel v5 — EDIT the original ability stills (not from scratch).
 * Base: .tmp/marketing-ability-reel/scene-01…04.jpg (Nano Banana quality)
 * Edit: fal-ai/nano-banana-2/edit + real lockup composite
 * Video: minimax/h3/reference-to-video (no captions)
 *
 *   npx tsx --env-file=.env.local scripts/gen-week1-reel-v5-from-stills.ts --both
 *   npx tsx --env-file=.env.local scripts/gen-week1-reel-v5-from-stills.ts --lang en
 */
import { fal } from "@fal-ai/client";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { downloadToFile } from "../lib/pipeline/ffmpeg";

type Lang = "en" | "zh";

const OUT_ROOT = path.join(
  process.env.HOME ?? "",
  "Downloads",
  "Alchemy Week 1 Marketing",
  "Reel 1",
);
const WORK = path.join(process.cwd(), ".tmp/week1-reel-v5-edit");
const BASE = path.join(process.cwd(), ".tmp/marketing-ability-reel");
const LOCKUP = path.join(
  process.env.HOME ?? "",
  "Desktop/alchemy-carousel-v2/alchemy-lockup-black.png",
);
const MASCOT = path.join(
  process.env.HOME ?? "",
  "Desktop/mascot-angles/mascot-front-hero.jpg",
);

const BASE_SCENES = [
  "scene-01-prompt-problem.jpg",
  "scene-02-research.jpg",
  "scene-03-storyboard.jpg",
  "scene-04-assets-cta.jpg",
] as const;

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

/**
 * Stamp official Alchemy AI Lab lockup at TOP-LEFT.
 * Bottom placement collides with CTAs; top reads cleaner on these keyframes.
 */
async function stampLockup(src: string, dest: string): Promise<void> {
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
  const left = marginX;
  const top = marginY;
  await sharp(src)
    .composite([
      { input: plate, left, top },
      { input: lock.data, left: left + pad, top: top + pad },
    ])
    .jpeg({ quality: 94 })
    .toFile(dest);
}

/** Edit prompts — keep layout/mascot; rewrite copy; kill gibberish; erase corner logos (we stamp lockup). */
function editPrompt(lang: Lang, sceneIndex: 0 | 1 | 2 | 3): string {
  const zh = lang === "zh";
  const common =
    "EDIT this exact 9:16 Alchemy AI Lab marketing keyframe. Brand name is exactly \"Alchemy AI Lab\" (never just Alchemy alone in logos). " +
    "Keep the same composition, lighting, and cute flask mascot identity when present. " +
    "Replace ALL on-image text with the EXACT readable words below — crisp sans, English letters and Chinese characters must be real and legible. " +
    "NO gibberish, NO fake UI strings, NO invented logos. ERASE any old corner logos/wordmarks (bottom-right and top-left badges) — leave those corners clean empty white/light so we can stamp the official Alchemy AI Lab lockup later. " +
    "Do not add Instagram chrome or watermarks.";

  if (sceneIndex === 0) {
    return zh
      ? `${common}
REWRITE as pain-point + No Prompt Needed:
Headline (exact):「只有一张产品图。」
Second line (exact):「今天就要交 campaign？」
Keep one product photo + confused marketer energy.
Change the big Prompt box: show word「Prompt」then thick red strike-through X / ❌.
Bold line (exact):「无需写 Prompt」
Remove old headline "Good marketing starts before generation."`
      : `${common}
REWRITE as pain-point + No Prompt Needed:
Headline (exact): "One product photo."
Second line (exact): "The campaign is due today."
Keep one product photo + confused marketer energy.
Change the big Prompt box: show the word "Prompt" then thick red strike-through X / ❌.
Bold line (exact): "No prompt needed."
Remove old headline "Good marketing starts before generation."`;
  }

  if (sceneIndex === 1) {
    return zh
      ? `${common}
REWRITE AI Research beat. Keep flask mascot.
Headline (exact):「AI 研究」
Sub (exact):「先理解产品，再生成」
Replace the three research result cards with EXACTLY these four short clear labels (add a 4th card if needed):
1. 受众
2. 竞品
3. 内容角度
4. 视觉方向
NO cut-off text. NO "Eco-materials" / fake metrics. Keep upload→research flow visual.`
      : `${common}
REWRITE AI Research beat. Keep flask mascot.
Headline (exact): "AI Research"
Sub (exact): "Understand the product before you generate."
Replace research result cards with EXACTLY these four short clear labels (add a 4th card if needed):
1. Audience
2. Competitors
3. Content Angle
4. Visual Direction
NO cut-off text. NO fake metrics like Eco-materials. Keep upload→research flow visual.`;
  }

  if (sceneIndex === 2) {
    return zh
      ? `${common}
REWRITE Storyboard First beat. Keep flask mascot pointing at boards.
Headline (exact):「分镜优先」
Sub (exact):「先规划，再生成。」
Storyboard cards labeled EXACTLY:
Scene 01 — Hook
Scene 02 — Product
Scene 03 — Benefit
Scene 04 — CTA
(Chinese ok beside English.) Remove "DIFFERENTIATION" / "Keyframe 3 of 4" meta labels. All text sharp and complete.`
      : `${common}
REWRITE Storyboard First beat. Keep flask mascot pointing at boards.
Headline (exact): "Storyboard First"
Sub (exact): "Plan first. Generate second."
Storyboard cards labeled EXACTLY:
Scene 01 — Hook
Scene 02 — Product
Scene 03 — Benefit
Scene 04 — CTA
Remove "DIFFERENTIATION" / "Keyframe 3 of 4" meta labels. All text sharp and complete.`;
  }

  // scene 3 — outputs + CTA (not resize tool)
  return zh
    ? `${common}
REWRITE result + CTA. Keep flask mascot.
Headline (exact):「一个产品，多种创意方向」
Show 3–4 DIFFERENT creative concepts for the SAME product (Lifestyle Post / Benefit Ad / Reel / Campaign KV) — NOT the same image resized to IG/Story/Banner.
Bottom CTA pill (exact):「一张照片，完整 campaign」
Smaller line under pill (exact):「试试 Alchemy AI Lab →」
NEVER write only "Try Alchemy" or "试试 Alchemy" — must include "AI Lab".
Leave top-left and bottom corners EMPTY (no logo) — we stamp Alchemy AI Lab lockup at top-left later.
CTA text must stay fully visible.
NO feature bullet list. NO "Multiple ready-to-use marketing assets." Remove old logos.`
    : `${common}
REWRITE result + CTA. Keep flask mascot.
Headline (exact): "One product. Multiple creative directions."
Show 3–4 DIFFERENT creative concepts for the SAME product (Lifestyle Post / Benefit Ad / Reel / Campaign KV) — NOT the same image resized to IG/Story/Banner.
Bottom CTA pill (exact): "One photo. Full campaign."
Smaller line under pill (exact): "Try Alchemy AI Lab →"
NEVER write only "Try Alchemy" — must be exactly "Try Alchemy AI Lab →".
Leave top-left and bottom corners EMPTY (no logo) — we stamp Alchemy AI Lab lockup at top-left later.
CTA text must stay fully visible.
NO feature bullet list. NO "Multiple ready-to-use marketing assets." Remove old logos.`;
}

async function editStill(
  lang: Lang,
  sceneIndex: 0 | 1 | 2 | 3,
  basePath: string,
  baseUrl: string,
  lockupUrl: string,
  mascotUrl: string,
  outDir: string,
): Promise<string> {
  const id = `0${sceneIndex + 1}`;
  const raw = path.join(outDir, `${id}-raw.jpg`);
  const out = path.join(outDir, `${id}.jpg`);
  if (existsSync(out) && !argFlag("--force")) {
    console.log(`  skip ${lang}/${id}`);
    return out;
  }
  console.log(`  edit ${lang}/${id}…`);
  const result = await fal.subscribe("fal-ai/nano-banana-2/edit", {
    input: {
      prompt: editPrompt(lang, sceneIndex),
      image_urls: [baseUrl, lockupUrl, mascotUrl],
      aspect_ratio: "9:16",
      num_images: 1,
      resolution: "2K",
    },
    logs: true,
  });
  const url = extractImageUrl(result.data);
  if (!url) throw new Error(`No image for ${lang}/${id}`);
  await downloadToFile(url, raw);
  await stampLockup(raw, out);
  console.log(`  saved ${out}`);
  return out;
}

async function genH3(imagePaths: string[], prompt: string, outPath: string) {
  if (existsSync(outPath) && !argFlag("--force-video")) {
    console.log(`  skip video ${path.basename(outPath)}`);
    return;
  }
  const refs = await Promise.all(imagePaths.map((p) => uploadLocal(p, "image/jpeg")));
  console.log(`  H3 12s × ${refs.length} → ${path.basename(outPath)}…`);
  const result = await fal.subscribe("minimax/h3/reference-to-video", {
    input: {
      prompt,
      reference_image_urls: refs,
      duration: 12,
      resolution: "768P",
      aspect_ratio: "9:16",
    },
    logs: true,
  });
  const url = extractVideoUrl(result.data);
  if (!url) throw new Error(`No video for ${outPath}`);
  await downloadToFile(url, outPath);
  console.log(`  saved ${outPath}`);
}

function h3Prompt(lang: Lang): string {
  return lang === "zh"
    ? [
        "@Image1 @Image2 @Image3 @Image4",
        "Vertical 9:16 Alchemy AI Lab SaaS marketing Reel, clean light UI, premium motion.",
        "0-3s: Image1 — one product photo + deadline panic; Prompt struck out; 无需写 Prompt.",
        "3-6s: Image2 — AI 研究; four cards 受众/竞品/内容角度/视觉方向 pop in.",
        "6-9s: Image3 — 分镜优先; Scene 01-04 hold readable; 先规划再生成.",
        "9-12s: Image4 — different creative directions then clean CTA 一张照片完整 campaign; Alchemy AI Lab lockup top-left.",
        "Keep on-screen text sharp. No gibberish. Smooth transitions. Keep flask mascot identity. Brand is Alchemy AI Lab.",
      ].join(" ")
    : [
        "@Image1 @Image2 @Image3 @Image4",
        "Vertical 9:16 Alchemy AI Lab SaaS marketing Reel, clean light UI, premium motion.",
        "0-3s: Image1 — one product photo + campaign due today; Prompt struck out; No prompt needed.",
        "3-6s: Image2 — AI Research; four cards Audience/Competitors/Content Angle/Visual Direction pop in.",
        "6-9s: Image3 — Storyboard First; Scene 01-04 hold readable; Plan first Generate second.",
        "9-12s: Image4 — different creative directions; CTA One photo Full campaign; Try Alchemy AI Lab; lockup top-left.",
        "Keep on-screen text sharp. No gibberish. Smooth transitions. Keep flask mascot identity. Brand is Alchemy AI Lab.",
      ].join(" ");
}

async function buildLang(
  lang: Lang,
  uploaded: { lockup: string; mascot: string; bases: string[] },
) {
  const dir = path.join(WORK, lang);
  mkdirSync(dir, { recursive: true });
  mkdirSync(OUT_ROOT, { recursive: true });

  const stills: string[] = [];
  for (let i = 0; i < 4; i++) {
    stills.push(
      await editStill(
        lang,
        i as 0 | 1 | 2 | 3,
        path.join(BASE, BASE_SCENES[i]!),
        uploaded.bases[i]!,
        uploaded.lockup,
        uploaded.mascot,
        dir,
      ),
    );
  }

  // Write into workspace first (Downloads can fail under sandbox), then copy out.
  const name =
    lang === "en" ? "week1-reel-v5-en.mp4" : "week1-reel-v5-zh-cn.mp4";
  const localOut = path.join(dir, name);
  const out = path.join(OUT_ROOT, name);
  await genH3(stills, h3Prompt(lang), localOut);
  try {
    writeFileSync(out, readFileSync(localOut));
    console.log(`  copied → ${out}`);
  } catch (e) {
    console.warn(`  could not copy to Downloads (${String(e)}); keep ${localOut}`);
  }
  return localOut;
}

async function main() {
  loadEnvLocal();
  const key = process.env.FAL_KEY?.trim();
  if (!key) {
    console.error("Missing FAL_KEY");
    process.exit(1);
  }
  fal.config({ credentials: key });

  for (const f of BASE_SCENES) {
    const p = path.join(BASE, f);
    if (!existsSync(p)) {
      console.error("Missing base still:", p);
      process.exit(1);
    }
  }
  if (!existsSync(LOCKUP) || !existsSync(MASCOT)) {
    console.error("Missing lockup or mascot");
    process.exit(1);
  }

  mkdirSync(WORK, { recursive: true });
  mkdirSync(OUT_ROOT, { recursive: true });

  const langs: Lang[] = argFlag("--both")
    ? ["en", "zh"]
    : [((argValue("--lang") ?? "en") as Lang)];

  // Re-apply official Alchemy AI Lab lockup (bottom-left) onto existing *-raw.jpg
  if (argFlag("--restamp")) {
    for (const lang of langs) {
      const dir = path.join(WORK, lang);
      for (let i = 1; i <= 4; i++) {
        const id = `0${i}`;
        const raw = path.join(dir, `${id}-raw.jpg`);
        const out = path.join(dir, `${id}.jpg`);
        if (!existsSync(raw)) {
          console.warn(`  skip restamp missing ${lang}/${id}-raw.jpg`);
          continue;
        }
        console.log(`  restamp ${lang}/${id} → Alchemy AI Lab lockup (top-left)`);
        await stampLockup(raw, out);
      }
    }
    if (!argFlag("--force-video") && !argFlag("--continue")) {
      console.log("Restamp done. Pass --force-video to rebuild H3.");
      return;
    }
  }

  console.log("Uploading base stills + lockup + mascot…");
  const bases = await Promise.all(
    BASE_SCENES.map((f) => uploadLocal(path.join(BASE, f), "image/jpeg")),
  );
  const lockup = await uploadLocal(LOCKUP, "image/png");
  const mascot = await uploadLocal(MASCOT, "image/jpeg");

  writeFileSync(
    path.join(OUT_ROOT, "week1-reel-v5-storyboard.json"),
    JSON.stringify(
      {
        method: "edit original Nano Banana stills → MiniMax H3 (no captions)",
        brand: "Alchemy AI Lab",
        lockup: LOCKUP,
        logoPlacement: "top-left",
        bases: BASE_SCENES,
        langs,
        copy: {
          en: [
            "One product photo. / The campaign is due today. / No prompt needed.",
            "AI Research: Audience · Competitors · Content Angle · Visual Direction",
            "Storyboard First / Plan first. Generate second. / Scene 01–04",
            "One product. Multiple creative directions. / One photo. Full campaign. / Try Alchemy AI Lab →",
          ],
          zh: [
            "只有一张产品图。/ 今天就要交 campaign？/ 无需写 Prompt",
            "AI 研究：受众 · 竞品 · 内容角度 · 视觉方向",
            "分镜优先 / 先规划，再生成。/ Scene 01–04",
            "一个产品，多种创意方向 / 一张照片，完整 campaign / 试试 Alchemy AI Lab →",
          ],
        },
      },
      null,
      2,
    ),
  );

  for (const lang of langs) {
    console.log(`\n=== ${lang} ===`);
    await buildLang(lang, { lockup, mascot, bases });
  }
  console.log("\nAll done →", OUT_ROOT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
