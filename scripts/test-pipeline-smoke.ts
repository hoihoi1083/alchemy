/**
 * End-to-end pipeline smoke with saved artifacts + vision QA report.
 *
 *   npm run test:pipeline              # ~$1.35 + reviews (dual-edit + carousel slide)
 *   npm run test:pipeline:full         # + text-to-video (~$2.00 total)
 *   SMOKE_SKIP_FAL=1 npm run test:pipeline   # planners + FFmpeg only
 *
 * Outputs: tests/output/pipeline-smoke/<runId>/report.html
 *          tests/output/pipeline-smoke/latest -> symlink
 */
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync, symlinkSync, rmSync } from "node:fs";
import { copyFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fal } from "@fal-ai/client";
import sharp from "sharp";
import { planAdPack } from "../lib/ad-pack-plan";
import { azureVoiceForLocale } from "../lib/ad-pack-preferences";
import type { CaptionLine } from "../lib/ad-pack-types";
import { planCampaign } from "../lib/campaign-plan";
import { analyzeConceptReferenceImage } from "../lib/concept-image-vision";
import { planContentResearch } from "../lib/content-research-plan";
import { defaultEditEndpoint, defaultTextEndpoint } from "../lib/image-endpoints";
import {
  reviewLayoutSimilarity,
  reviewPipelineOutput,
  uploadLocalImageForReview,
  type PipelineSmokeReview,
} from "../lib/pipeline-smoke-review";
import { evaluateGoldenPrompts } from "../lib/pipeline-smoke-golden";
import { burnCaptionsOverlay } from "../lib/pipeline/caption-overlay-burn";
import {
  addBackgroundMusic,
  concatVideos,
  downloadToFile,
  ensureFfmpeg,
  fitAudioToDuration,
  getMediaDurationSeconds,
  mixNarrationOverVideo,
} from "../lib/pipeline/ffmpeg";
import { synthesizeSpeechToFile } from "../lib/pipeline/tts";
import { burnVisualCaptionsOverlay } from "../lib/pipeline/visual-caption-burn";
import { newVisualCaptionClip } from "../lib/visual-caption-types";
import { planTeachingCarousel } from "../lib/teaching-carousel-plan";
import { planVideoStoryboard } from "../lib/video-storyboard-plan";
import { bgmFilePath } from "../lib/bgm/tracks";
import { writeSmokeReport, type StepRow } from "./lib/pipeline-smoke-report";
import {
  createXhsStyleReferencePng,
  runCarouselSlide1Generation,
  runDualEditGeneration,
} from "./lib/pipeline-smoke-xhs";
import {
  SMOKE_SCENARIO,
  type SmokeArtifact,
  type SmokeLayoutReviewRecord,
  type SmokeReviewRecord,
} from "./lib/pipeline-smoke-scenario";

type Tier = "free" | "cheap" | "fal";
type Status = "pass" | "fail" | "skip";

type StepResult = StepRow & { tier: Tier; status: Status };

const SKIP_FAL = process.env.SMOKE_SKIP_FAL === "1";
const MINIMAL = process.env.SMOKE_MINIMAL === "1";
const SKIP_VIDEO = process.env.SMOKE_SKIP_VIDEO === "1";
const SKIP_TTS = process.env.SMOKE_SKIP_TTS === "1";
const SKIP_REVIEW = process.env.SMOKE_SKIP_REVIEW === "1";
const ENABLE_T2V = process.env.SMOKE_T2V === "1";
const STRICT_REVIEW = process.env.SMOKE_STRICT_REVIEW === "1";

const COST = {
  deepseek: 0.002,
  vision: 0.01,
  textImage: 0.06,
  editImage: 0.06,
  dualEdit: 0.08,
  carouselSlide: 0.08,
  i2v480p4s: 0.95,
  t2v480p4s: 0.95,
  ttsShort: 0.01,
  review: 0.01,
} as const;

const results: StepResult[] = [];
const artifacts: SmokeArtifact[] = [];
const reviews: SmokeReviewRecord[] = [];
const layoutReviews: SmokeLayoutReviewRecord[] = [];

const smokeFixtures = path.join(process.cwd(), "tests/fixtures/smoke");
const outputRoot = path.join(process.cwd(), "tests/output/pipeline-smoke");
const runId = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const outDir = path.join(outputRoot, runId);
const artifactsDir = path.join(outDir, "artifacts");

const state = {
  productPng: path.join(smokeFixtures, "product.png"),
  styleRefPng: path.join(smokeFixtures, "xhs-style-ref.png"),
  testMp4: path.join(smokeFixtures, "test-2s.mp4"),
  textImagePath: "",
  editImagePath: "",
  dualEditPath: "",
  carouselSlide1Path: "",
  textImageUrl: "",
  i2vVideoPath: "",
  t2vVideoPath: "",
  ttsPath: "",
};

function loadEnvLocal() {
  if (!existsSync(".env.local")) return;
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  }
}

function runCmd(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (c: Buffer) => {
      stderr += c.toString("utf8");
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} exit ${code}: ${stderr.slice(-400)}`));
    });
  });
}

function relArtifact(absPath: string): string {
  return path.relative(outDir, absPath).split(path.sep).join("/");
}

function registerArtifact(artifact: SmokeArtifact) {
  artifacts.push(artifact);
}

async function persistDownload(url: string, filename: string): Promise<string> {
  const dest = path.join(artifactsDir, filename);
  await downloadToFile(url, dest);
  return dest;
}

async function extractVideoPoster(videoPath: string, posterName: string): Promise<string> {
  const poster = path.join(artifactsDir, posterName);
  await runCmd("ffmpeg", [
    "-y",
    "-i",
    videoPath,
    "-ss",
    "1",
    "-vframes",
    "1",
    "-q:v",
    "3",
    poster,
  ]);
  return poster;
}

async function step(
  id: string,
  label: string,
  tier: Tier,
  costUsd: number,
  run: () => Promise<string | void>,
  opts?: { skipIf?: boolean; skipReason?: string },
): Promise<void> {
  if (opts?.skipIf) {
    results.push({
      id,
      label,
      tier,
      status: "skip",
      ms: 0,
      detail: opts.skipReason,
      costUsd: 0,
    });
    return;
  }

  const t0 = Date.now();
  try {
    const detail = await run();
    results.push({
      id,
      label,
      tier,
      status: "pass",
      ms: Date.now() - t0,
      detail: typeof detail === "string" ? detail : undefined,
      costUsd: tier === "free" ? 0 : costUsd,
    });
    console.log(`✓ ${label}${detail ? ` — ${detail}` : ""} (${Date.now() - t0}ms)`);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    results.push({
      id,
      label,
      tier,
      status: "fail",
      ms: Date.now() - t0,
      detail: msg,
      costUsd: 0,
    });
    console.error(`✗ ${label}: ${msg}`);
  }
}

function extractImageUrl(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const d = data as { images?: Array<{ url?: string }>; image?: { url?: string } };
  return d.images?.[0]?.url ?? d.image?.url;
}

function extractVideoUrl(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const d = data as {
    video?: { url?: string };
    video_url?: string;
    url?: string;
  };
  if (d.video?.url) return d.video.url;
  if (typeof d.video_url === "string") return d.video_url;
  if (typeof d.url === "string" && /\.(mp4|mov|webm)/i.test(d.url)) return d.url;
  return undefined;
}

function assertFile(pathname: string, minBytes = 100): string {
  const st = statSync(pathname);
  if (st.size < minBytes) throw new Error(`Output too small: ${pathname}`);
  return `${Math.round(st.size / 1024)}KB`;
}

async function savePlannerJson(id: string, label: string, data: unknown) {
  const file = path.join(artifactsDir, `${id}.json`);
  await writeFile(file, JSON.stringify(data, null, 2), "utf8");
  registerArtifact({ id, label, kind: "planner", file: relArtifact(file) });
}

async function runVisionReview(args: {
  stepId: string;
  artifactId: string;
  label: string;
  imagePath: string;
  expectation: string;
  mediaKind: "image" | "video-frame";
}): Promise<PipelineSmokeReview | null> {
  if (SKIP_REVIEW || SKIP_FAL) return null;
  const imageUrl = await uploadLocalImageForReview(args.imagePath, path.basename(args.imagePath));
  const review = await reviewPipelineOutput({
    imageUrl,
    mediaKind: args.mediaKind,
    label: args.label,
    expectation: args.expectation,
    product: SMOKE_SCENARIO.product,
    mustAvoid: [...SMOKE_SCENARIO.mustAvoid],
  });
  reviews.push({ artifactId: args.artifactId, label: args.label, review });
  const verdict = review.matchesExpectation ? "PASS" : "FAIL";
  console.log(`  ↳ QA ${verdict} ${review.score}/100 — ${review.summary}`);
  return review;
}

async function main() {
  loadEnvLocal();
  mkdirSync(smokeFixtures, { recursive: true });
  mkdirSync(artifactsDir, { recursive: true });

  const falKey = process.env.FAL_KEY?.trim();
  const deepseekKey = process.env.DEEPSEEK_API_KEY?.trim();
  if (falKey) fal.config({ credentials: falKey });

  console.log("=== Pipeline smoke (reviewable) ===");
  console.log(`Output: ${outDir}`);
  console.log(
    `Flags: SKIP_FAL=${SKIP_FAL} T2V=${ENABLE_T2V} SKIP_REVIEW=${SKIP_REVIEW} STRICT=${STRICT_REVIEW}\n`,
  );

  await step("env", "Env keys present", "free", 0, async () => {
    const missing: string[] = [];
    if (!falKey && !SKIP_FAL) missing.push("FAL_KEY");
    if (!deepseekKey) missing.push("DEEPSEEK_API_KEY");
    if (missing.length) throw new Error(`Missing: ${missing.join(", ")}`);
    return falKey ? "FAL + DeepSeek" : "DeepSeek only";
  });

  await step("ffmpeg", "FFmpeg available", "free", 0, async () => {
    await ensureFfmpeg();
    return "ffmpeg/ffprobe OK";
  });

  await step("fixtures", "Local smoke fixtures", "free", 0, async () => {
    await sharp({
      create: {
        width: 256,
        height: 256,
        channels: 3,
        background: { r: 210, g: 170, b: 230 },
      },
    })
      .png()
      .toFile(state.productPng);

    await runCmd("ffmpeg", [
      "-y",
      "-f",
      "lavfi",
      "-i",
      "color=c=#1a1a2e:s=360x640:d=2",
      "-f",
      "lavfi",
      "-i",
      "anullsrc=channel_layout=stereo:sample_rate=44100",
      "-t",
      "2",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-shortest",
      state.testMp4,
    ]);

    const productCopy = path.join(artifactsDir, "00-fixture-product.png");
    await copyFile(state.productPng, productCopy);
    await createXhsStyleReferencePng(state.styleRefPng);
    const styleCopy = path.join(artifactsDir, "00-fixture-xhs-style-ref.png");
    await copyFile(state.styleRefPng, styleCopy);
    registerArtifact({
      id: "fixture-product",
      label: "Fixture product PNG",
      kind: "image",
      file: relArtifact(productCopy),
      expectation: "Placeholder pink product reference for edit path",
    });
    registerArtifact({
      id: "fixture-style-ref",
      label: "XHS-style layout reference",
      kind: "image",
      file: relArtifact(styleCopy),
      expectation: "3-panel carousel layout reference (style only)",
    });
    return assertFile(state.productPng) + ", " + assertFile(state.styleRefPng, 500);
  });

  await step("golden-prompts", "Golden prompt keywords", "free", 0, async () => {
    const golden = evaluateGoldenPrompts();
    const failed = golden.filter((g) => !g.pass);
    if (failed.length) {
      throw new Error(
        failed.map((f) => `${f.visualStyleId}: missing ${f.missing.join(", ")}`).join("; "),
      );
    }
    await writeFile(
      path.join(artifactsDir, "golden-prompts.json"),
      JSON.stringify(golden, null, 2),
      "utf8",
    );
    registerArtifact({
      id: "golden-prompts",
      label: "Golden prompt audit",
      kind: "json",
      file: relArtifact(path.join(artifactsDir, "golden-prompts.json")),
    });
    return `${golden.length} styles OK`;
  });

  await step(
    "planner-research",
    "Content research (playbook)",
    "cheap",
    COST.deepseek,
    async () => {
      const plan = await planContentResearch({
        topic: SMOKE_SCENARIO.searchTopic,
        platform: "xiaohongshu",
        market: "hk",
        promotionMode: "physical",
        product: SMOKE_SCENARIO.product,
        usePlaybookOnly: true,
      });
      if (!plan.candidates?.length) throw new Error("No candidates");
      await savePlannerJson("planner-research", "Research plan", plan);
      return `${plan.candidates.length} candidates`;
    },
  );

  await step(
    "planner-carousel",
    "Teaching carousel plan",
    "cheap",
    COST.deepseek,
    async () => {
      const plan = await planTeachingCarousel({
        visualStyleId: "product",
        promotionMode: "physical",
        product: SMOKE_SCENARIO.product,
        headline: "粉晶功效｜入門",
        slideCount: 4,
        promptMarket: "hk",
      });
      await savePlannerJson("planner-carousel", "Carousel plan", plan);
      return plan.theme.slice(0, 40);
    },
  );

  await step("planner-campaign", "Campaign plan", "cheap", COST.deepseek, async () => {
    const plan = await planCampaign({
      visualStyleId: "product",
      promotionMode: "physical",
      product: SMOKE_SCENARIO.product,
      headline: SMOKE_SCENARIO.headline,
    });
    await savePlannerJson("planner-campaign", "Campaign plan", plan);
    return `${plan.slides.length} slides`;
  });

  await step("planner-storyboard", "Video storyboard plan", "cheap", COST.deepseek, async () => {
    const plan = await planVideoStoryboard({
      product: SMOKE_SCENARIO.product,
      headline: "粉晶光澤特寫",
      durationSec: 8,
      sceneCountTarget: "4",
      market: "hk",
    });
    await savePlannerJson("planner-storyboard", "Storyboard plan", plan);
    return `${plan.scenes.length} scenes`;
  });

  await step("planner-adpack", "Ad pack plan", "cheap", COST.deepseek, async () => {
    const plan = await planAdPack({
      product: SMOKE_SCENARIO.product,
      headline: "溫柔粉晶",
      subline: "日常佩戴",
      business: "Alchemy Smoke",
      offer: "",
      promptMarket: "hk",
      durationSec: 4,
      storyboardScenes: [
        {
          imageIndex: 1,
          role: "hook",
          startSec: 0,
          endSec: 2,
          sceneDescriptionZh: "粉晶特寫",
          imagePrompt: "Pink crystal bracelet macro",
        },
        {
          imageIndex: 2,
          role: "cta",
          startSec: 2,
          endSec: 4,
          sceneDescriptionZh: "佩戴展示",
          imagePrompt: "Wrist wearing pink bracelet",
        },
      ],
    });
    await savePlannerJson("planner-adpack", "Ad pack plan", plan);
    return `${plan.captionLines.length} caption lines`;
  });

  await step(
    "vision-reference",
    "Reference vision analyze",
    "fal",
    COST.vision,
    async () => {
      const file = new File([readFileSync(state.styleRefPng)], "xhs-style-ref.png", {
        type: "image/png",
      });
      const imageUrl = await fal.storage.upload(file);
      let vision = await analyzeConceptReferenceImage({ imageUrl });
      if (!vision.sceneSummary && !vision.topic) {
        vision = await analyzeConceptReferenceImage({
          imageUrl,
          conceptIdea: "XHS carousel layout reference",
        });
      }
      await writeFile(
        path.join(artifactsDir, "vision-reference.json"),
        JSON.stringify(vision, null, 2),
        "utf8",
      );
      if (!vision.sceneSummary && !vision.topic && !vision.layoutStyle) {
        throw new Error("Empty vision");
      }
      return vision.contentType || vision.layoutStyle || "analyzed";
    },
    { skipIf: SKIP_FAL || !falKey, skipReason: "SMOKE_SKIP_FAL" },
  );

  await step(
    "image-text",
    "Text image (nano-banana-2)",
    "fal",
    COST.textImage,
    async () => {
      const result = await fal.subscribe(defaultTextEndpoint(), {
        input: {
          prompt: SMOKE_SCENARIO.textImagePrompt,
          aspect_ratio: "4:5",
          num_images: 1,
        },
        logs: false,
      });
      const url = extractImageUrl(result.data);
      if (!url) throw new Error("No image URL");
      state.textImageUrl = url;
      state.textImagePath = await persistDownload(url, "01-text-image.png");
      registerArtifact({
        id: "text-image",
        label: "Text-generated image",
        kind: "image",
        file: relArtifact(state.textImagePath),
        expectation: SMOKE_SCENARIO.expectations.textImage,
        reviewId: "text-image",
      });
      return assertFile(state.textImagePath, 1000);
    },
    { skipIf: SKIP_FAL || !falKey, skipReason: "SMOKE_SKIP_FAL" },
  );

  await step(
    "image-edit",
    "Product image edit",
    "fal",
    COST.editImage,
    async () => {
      const file = new File([readFileSync(state.productPng)], "product.png", {
        type: "image/png",
      });
      const hosted = await fal.storage.upload(file);
      const result = await fal.subscribe(defaultEditEndpoint(), {
        input: {
          prompt: SMOKE_SCENARIO.editImagePrompt,
          image_urls: [hosted],
          aspect_ratio: "1:1",
          num_images: 1,
          resolution: "1K",
          limit_generations: true,
        },
        logs: false,
      });
      const url = extractImageUrl(result.data);
      if (!url) throw new Error("No edited image URL");
      state.editImagePath = await persistDownload(url, "02-edit-image.png");
      registerArtifact({
        id: "edit-image",
        label: "Product image edit",
        kind: "image",
        file: relArtifact(state.editImagePath),
        expectation: SMOKE_SCENARIO.expectations.editImage,
        reviewId: "edit-image",
      });
      return assertFile(state.editImagePath, 1000);
    },
    {
      skipIf: SKIP_FAL || !falKey || MINIMAL,
      skipReason: MINIMAL ? "SMOKE_MINIMAL" : "SMOKE_SKIP_FAL",
    },
  );

  await step(
    "dual-edit-xhs",
    "Dual-edit (style ref + product)",
    "fal",
    COST.dualEdit,
    async () => {
      const url = await runDualEditGeneration({
        styleRefPath: state.styleRefPng,
        productPath: state.productPng,
      });
      state.dualEditPath = await persistDownload(url, "02b-dual-edit-xhs.png");
      registerArtifact({
        id: "dual-edit-xhs",
        label: "XHS dual-image edit",
        kind: "image",
        file: relArtifact(state.dualEditPath),
        expectation: SMOKE_SCENARIO.expectations.dualEdit,
        reviewId: "dual-edit-xhs",
      });
      return assertFile(state.dualEditPath, 1000);
    },
    { skipIf: SKIP_FAL || !falKey, skipReason: "SMOKE_SKIP_FAL" },
  );

  await step(
    "carousel-slide-1",
    "Teaching carousel slide 1 (dual ref)",
    "fal",
    COST.carouselSlide,
    async () => {
      const { imageUrl, plan } = await runCarouselSlide1Generation({
        styleRefPath: state.styleRefPng,
        productPath: state.productPng,
      });
      state.carouselSlide1Path = await persistDownload(imageUrl, "02c-carousel-slide-1.png");
      await writeFile(
        path.join(artifactsDir, "carousel-slide-1-plan.json"),
        JSON.stringify(plan, null, 2),
        "utf8",
      );
      registerArtifact({
        id: "carousel-slide-1",
        label: "Carousel slide 1 (cover)",
        kind: "image",
        file: relArtifact(state.carouselSlide1Path),
        expectation: SMOKE_SCENARIO.expectations.carouselSlide1,
        reviewId: "carousel-slide-1",
      });
      return plan.slides[0]?.title?.slice(0, 30) ?? assertFile(state.carouselSlide1Path, 1000);
    },
    { skipIf: SKIP_FAL || !falKey, skipReason: "SMOKE_SKIP_FAL" },
  );

  await step(
    "video-i2v",
    "Image→video (480p, 4s, fast)",
    "fal",
    COST.i2v480p4s,
    async () => {
      if (!state.textImageUrl) throw new Error("Need text image");
      const result = await fal.subscribe("bytedance/seedance-2.0/fast/image-to-video", {
        input: {
          prompt: SMOKE_SCENARIO.i2vPrompt,
          image_url: state.textImageUrl,
          resolution: "480p",
          duration: 4,
          aspect_ratio: "9:16",
          generate_audio: false,
        },
        logs: false,
      });
      const url = extractVideoUrl(result.data);
      if (!url) throw new Error("No video URL");
      state.i2vVideoPath = await persistDownload(url, "03-i2v.mp4");
      const poster = await extractVideoPoster(state.i2vVideoPath, "03-i2v-poster.jpg");
      const dur = await getMediaDurationSeconds(state.i2vVideoPath);
      registerArtifact({
        id: "video-i2v",
        label: "Image→video (480p · 4s)",
        kind: "video",
        file: relArtifact(state.i2vVideoPath),
        poster: relArtifact(poster),
        expectation: SMOKE_SCENARIO.expectations.i2vFrame,
        reviewId: "video-i2v",
        meta: { durationSec: dur, resolution: "480p" },
      });
      return `${assertFile(state.i2vVideoPath, 1000)} · ${dur.toFixed(1)}s`;
    },
    { skipIf: SKIP_FAL || !falKey || SKIP_VIDEO, skipReason: "video skipped" },
  );

  await step(
    "video-t2v",
    "Text→video (480p, 4s, fast)",
    "fal",
    COST.t2v480p4s,
    async () => {
      const result = await fal.subscribe("bytedance/seedance-2.0/fast/text-to-video", {
        input: {
          prompt: SMOKE_SCENARIO.t2vPrompt,
          resolution: "480p",
          duration: 4,
          aspect_ratio: "9:16",
          generate_audio: false,
        },
        logs: false,
      });
      const url = extractVideoUrl(result.data);
      if (!url) throw new Error("No video URL");
      state.t2vVideoPath = await persistDownload(url, "04-t2v.mp4");
      const poster = await extractVideoPoster(state.t2vVideoPath, "04-t2v-poster.jpg");
      const dur = await getMediaDurationSeconds(state.t2vVideoPath);
      registerArtifact({
        id: "video-t2v",
        label: "Text→video (480p · 4s)",
        kind: "video",
        file: relArtifact(state.t2vVideoPath),
        poster: relArtifact(poster),
        expectation: SMOKE_SCENARIO.expectations.t2vFrame,
        reviewId: "video-t2v",
        meta: { durationSec: dur, resolution: "480p" },
      });
      return `${assertFile(state.t2vVideoPath, 1000)} · ${dur.toFixed(1)}s`;
    },
    {
      skipIf: SKIP_FAL || !falKey || SKIP_VIDEO || !ENABLE_T2V,
      skipReason: ENABLE_T2V ? "video skipped" : "set SMOKE_T2V=1 for text-to-video",
    },
  );

  const videoForPost = state.i2vVideoPath || state.t2vVideoPath || state.testMp4;

  await step("burn-script-captions", "Burn script captions", "free", 0, async () => {
    const workDir = path.join(outDir, "_work-captions");
    mkdirSync(workDir, { recursive: true });
    const out = path.join(artifactsDir, "05-script-captions.mp4");
    const lines: CaptionLine[] = [
      { startSec: 0, endSec: 1.2, text: "粉晶入門", position: "bottom" },
      { startSec: 1.2, endSec: 2.5, text: SMOKE_SCENARIO.product.slice(0, 8), position: "bottom" },
    ];
    await burnCaptionsOverlay(videoForPost, lines, out, workDir);
    registerArtifact({
      id: "script-captions",
      label: "Script captions burn",
      kind: "video",
      file: relArtifact(out),
      expectation: "Chinese captions visible at bottom; product-related copy",
    });
    return assertFile(out, 500);
  });

  await step("burn-visual-captions", "Burn visual captions", "free", 0, async () => {
    const workDir = path.join(outDir, "_work-visual");
    mkdirSync(workDir, { recursive: true });
    const out = path.join(artifactsDir, "06-visual-captions.mp4");
    await burnVisualCaptionsOverlay(
      videoForPost,
      [newVisualCaptionClip({ text: SMOKE_SCENARIO.headline, startSec: 0, endSec: 2.5, xPct: 50, yPct: 18 })],
      out,
      workDir,
    );
    registerArtifact({
      id: "visual-captions",
      label: "Visual captions burn",
      kind: "video",
      file: relArtifact(out),
    });
    return assertFile(out, 500);
  });

  await step("stitch-videos", "Stitch videos", "free", 0, async () => {
    const out = path.join(artifactsDir, "07-stitched.mp4");
    const clip = state.i2vVideoPath || state.testMp4;
    await concatVideos([clip, clip], out);
    registerArtifact({ id: "stitched", label: "Stitched video", kind: "video", file: relArtifact(out) });
    return assertFile(out, 500);
  });

  await step("add-bgm", "Add background music", "free", 0, async () => {
    const bgm = bgmFilePath("calm");
    try {
      await import("node:fs/promises").then((fs) => fs.access(bgm));
    } catch {
      return "skipped — npm run setup:bgm";
    }
    const out = path.join(artifactsDir, "08-with-bgm.mp4");
    await addBackgroundMusic(videoForPost, bgm, out);
    registerArtifact({ id: "with-bgm", label: "Video + BGM", kind: "video", file: relArtifact(out) });
    return assertFile(out, 500);
  });

  await step(
    "tts-short",
    "TTS short line",
    "fal",
    COST.ttsShort,
    async () => {
      state.ttsPath = path.join(artifactsDir, "09-narration.mp3");
      const { voice, xmlLang } = azureVoiceForLocale("hk");
      await synthesizeSpeechToFile({
        text: `${SMOKE_SCENARIO.product.slice(0, 6)}，溫柔加分。`,
        voice,
        xmlLang,
        locale: "hk",
        outputPath: state.ttsPath,
        voicePresetId: "hk-female-pro",
      });
      registerArtifact({
        id: "tts",
        label: "TTS narration",
        kind: "audio",
        file: relArtifact(state.ttsPath),
      });
      return assertFile(state.ttsPath, 500);
    },
    { skipIf: SKIP_TTS, skipReason: "SMOKE_SKIP_TTS" },
  );

  await step(
    "dub-mix",
    "Dub narration over video",
    "free",
    0,
    async () => {
      if (!state.ttsPath) throw new Error("Need TTS");
      const narrationWav = path.join(outDir, "_work-dub", "narration-fit.wav");
      mkdirSync(path.dirname(narrationWav), { recursive: true });
      const out = path.join(artifactsDir, "10-with-voice.mp4");
      const dur = await getMediaDurationSeconds(videoForPost);
      await fitAudioToDuration(state.ttsPath, narrationWav, dur);
      await mixNarrationOverVideo(videoForPost, narrationWav, out);
      registerArtifact({ id: "with-voice", label: "Video + voice dub", kind: "video", file: relArtifact(out) });
      return assertFile(out, 500);
    },
    { skipIf: SKIP_TTS, skipReason: "SMOKE_SKIP_TTS" },
  );

  // --- Vision QA on visual outputs ---
  if (!SKIP_REVIEW && !SKIP_FAL && falKey) {
    console.log("\n--- Vision QA ---\n");
    await step("review-text-image", "QA text image", "fal", COST.review, async () => {
      if (!state.textImagePath) throw new Error("No text image");
      const r = await runVisionReview({
        stepId: "review-text-image",
        artifactId: "text-image",
        label: "Text image",
        imagePath: state.textImagePath,
        expectation: SMOKE_SCENARIO.expectations.textImage,
        mediaKind: "image",
      });
      if (!r) throw new Error("Review skipped");
      return `${r.score}/100`;
    });

    if (state.editImagePath) {
      await step("review-edit-image", "QA edit image", "fal", COST.review, async () => {
        const r = await runVisionReview({
          stepId: "review-edit-image",
          artifactId: "edit-image",
          label: "Edit image",
          imagePath: state.editImagePath,
          expectation: SMOKE_SCENARIO.expectations.editImage,
          mediaKind: "image",
        });
        if (!r) throw new Error("Review skipped");
        return `${r.score}/100`;
      });
    }

    if (state.dualEditPath) {
      await step("review-dual-edit", "QA dual-edit image", "fal", COST.review, async () => {
        const r = await runVisionReview({
          stepId: "review-dual-edit",
          artifactId: "dual-edit-xhs",
          label: "Dual-edit XHS",
          imagePath: state.dualEditPath,
          expectation: SMOKE_SCENARIO.expectations.dualEdit,
          mediaKind: "image",
        });
        if (!r) throw new Error("Review skipped");
        return `${r.score}/100`;
      });
    }

    if (state.carouselSlide1Path) {
      await step("review-carousel-slide", "QA carousel slide 1", "fal", COST.review, async () => {
        const r = await runVisionReview({
          stepId: "review-carousel-slide",
          artifactId: "carousel-slide-1",
          label: "Carousel slide 1",
          imagePath: state.carouselSlide1Path,
          expectation: SMOKE_SCENARIO.expectations.carouselSlide1,
          mediaKind: "image",
        });
        if (!r) throw new Error("Review skipped");
        return `${r.score}/100`;
      });

      await step(
        "review-layout-carousel",
        "Layout similarity vs reference",
        "fal",
        COST.review,
        async () => {
          const refUrl = await uploadLocalImageForReview(
            state.styleRefPng,
            "xhs-style-ref.png",
          );
          const genUrl = await uploadLocalImageForReview(
            state.carouselSlide1Path,
            "carousel-slide-1.png",
          );
          const layout = await reviewLayoutSimilarity({
            referenceImageUrl: refUrl,
            generatedImageUrl: genUrl,
            label: "Carousel slide 1 vs XHS reference",
            product: SMOKE_SCENARIO.product,
          });
          layoutReviews.push({
            artifactId: "carousel-slide-1",
            label: "Layout vs XHS reference",
            layoutScore: layout.layoutScore,
            matchesReferenceLayout: layout.matchesReferenceLayout,
            summary: layout.summary,
            borrowedElements: layout.borrowedElements,
            driftIssues: layout.driftIssues,
          });
          console.log(
            `  ↳ LAYOUT ${layout.matchesReferenceLayout ? "PASS" : "FAIL"} ${layout.layoutScore}/100 — ${layout.summary}`,
          );
          if (STRICT_REVIEW && (!layout.matchesReferenceLayout || layout.layoutScore < 60)) {
            throw new Error(`Layout QA failed: ${layout.summary}`);
          }
          return `${layout.layoutScore}/100`;
        },
      );
    }

    if (state.i2vVideoPath) {
      await step("review-i2v", "QA i2v frame", "fal", COST.review, async () => {
        const poster = path.join(artifactsDir, "03-i2v-poster.jpg");
        const r = await runVisionReview({
          stepId: "review-i2v",
          artifactId: "video-i2v",
          label: "I2V poster frame",
          imagePath: poster,
          expectation: SMOKE_SCENARIO.expectations.i2vFrame,
          mediaKind: "video-frame",
        });
        if (!r) throw new Error("Review skipped");
        return `${r.score}/100`;
      });
    }

    if (state.t2vVideoPath) {
      await step("review-t2v", "QA t2v frame", "fal", COST.review, async () => {
        const poster = path.join(artifactsDir, "04-t2v-poster.jpg");
        const r = await runVisionReview({
          stepId: "review-t2v",
          artifactId: "video-t2v",
          label: "T2V poster frame",
          imagePath: poster,
          expectation: SMOKE_SCENARIO.expectations.t2vFrame,
          mediaKind: "video-frame",
        });
        if (!r) throw new Error("Review skipped");
        return `${r.score}/100`;
      });
    }
  }

  const failed = results.filter((r) => r.status === "fail");
  const estCost = results.reduce((s, r) => s + (r.costUsd ?? 0), 0);
  const reviewPassed = reviews.filter((r) => r.review.matchesExpectation).length;
  const avgScore =
    reviews.length ?
      Math.round(reviews.reduce((s, r) => s + r.review.score, 0) / reviews.length)
    : 0;

  const { htmlPath } = await writeSmokeReport(outDir, {
    runId,
    createdAt: new Date().toISOString(),
    scenario: SMOKE_SCENARIO,
    steps: results,
    artifacts,
    reviews,
    layoutReviews,
    estCostUsd: estCost,
    reviewSummary: {
      reviewed: reviews.length,
      passed: reviewPassed,
      failed: reviews.length - reviewPassed,
      avgScore,
    },
  });

  const latestLink = path.join(outputRoot, "latest");
  try {
    rmSync(latestLink, { recursive: true, force: true });
    symlinkSync(outDir, latestLink, "dir");
  } catch {
    // symlink may fail on some FS — report path still valid
  }

  console.log("\n=== Pipeline smoke report ===\n");
  for (const r of results) {
    console.log(
      `${r.status === "pass" ? "✓" : r.status === "fail" ? "✗" : "○"} ${r.id.padEnd(20)} ${String(r.ms).padStart(6)}ms  ${r.detail ?? ""}`,
    );
  }
  console.log(`\nPass: ${results.filter((r) => r.status === "pass").length}  Fail: ${failed.length}`);
  console.log(`Vision QA: ${reviewPassed}/${reviews.length} passed (avg ${avgScore})`);
  console.log(`Est. spend: ~$${estCost.toFixed(2)}`);
  console.log(`\n📂 Review outputs:\n   ${htmlPath}`);
  console.log(`   open "${htmlPath}"`);

  const reviewFailures =
    STRICT_REVIEW ?
      reviews.filter((r) => !r.review.matchesExpectation || r.review.score < 60)
    : [];

  if (failed.length || reviewFailures.length) {
    if (reviewFailures.length) {
      console.error("\n=== VISION QA FAILED (STRICT) ===");
      for (const r of reviewFailures) {
        console.error(`  ${r.label}: ${r.review.score} — ${r.review.summary}`);
      }
    }
    if (failed.length) {
      console.error("\n=== PIPELINE SMOKE FAILED ===");
      for (const f of failed) console.error(`  ${f.id}: ${f.detail}`);
    }
    process.exit(1);
  }

  console.log("\n=== PIPELINE SMOKE PASS ===");
}

main().catch((e) => {
  console.error("Fatal:", e instanceof Error ? e.message : e);
  process.exit(1);
});
