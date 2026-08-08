import { fal } from "@fal-ai/client";
import { callDeepSeekChat } from "@/lib/deepseek-client";
import { parseLlmJsonObject } from "@/lib/parse-llm-json";
import type { PromptMarket } from "@/lib/prompt-variables";
import {
  ensureFfmpeg,
  extractVideoFrames,
  getMediaDurationSeconds,
} from "@/lib/pipeline/ffmpeg";
import type { ResearchReelAnalysis, ReelShotFrame } from "@/lib/reel-analysis-types";
import { SEEDANCE_MAX_REFERENCE_SEC } from "@/lib/reference-video-prepare";
import { videoDurationPlannerBlock } from "@/lib/video-duration-planner";
import { runFlorenceDetailedCaption } from "@/lib/vision-json-repair";
import { mkdtemp, readFile, rm, writeFile } from "fs/promises";
import path from "path";
import { tmpdir } from "os";

/**
 * Sample stills across the full reel — more frames = richer beat detail for DeepSeek.
 * Vision uses Florence-2 (same path as concept/carousel refs), not Bagel.
 */
const TIMELINE_FRAMES = 5;
const FLORENCE_TIMEOUT_MS = 25_000;
const FLORENCE_CONCURRENCY = 3;

type FrameVisionRow = {
  index: number;
  timeSec: number;
  sceneSummary: string;
  layoutStyle: string;
  motionHint: string;
  subjects: string;
  visibleText: string;
  visionScored?: boolean;
};

function timelineStubRow(index: number, timeSec: number): FrameVisionRow {
  return {
    index,
    timeSec,
    sceneSummary: `Timeline beat ${index} (~${timeSec.toFixed(1)}s)`,
    layoutStyle: "",
    motionHint: "",
    subjects: "",
    visibleText: "",
    visionScored: false,
  };
}

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]!, i);
    }
  }
  const n = Math.min(concurrency, Math.max(1, items.length));
  await Promise.all(Array.from({ length: n }, () => worker()));
  return out;
}

/**
 * Florence-2 detailed caption per frame (fast fal-native VLM).
 * DeepSeek later turns captions into structured shots + Seedance prompt.
 */
async function visionCaptionAllFrames(
  frameUrls: string[],
  timesSec: number[],
): Promise<FrameVisionRow[]> {
  return mapPool(frameUrls, FLORENCE_CONCURRENCY, async (url, i) => {
    const index = i + 1;
    const timeSec = timesSec[i] ?? 0;
    if (!url) return timelineStubRow(index, timeSec);
    try {
      const caption = await withTimeout(
        runFlorenceDetailedCaption(url),
        FLORENCE_TIMEOUT_MS,
        `Reel frame ${index} Florence`,
      );
      return {
        index,
        timeSec,
        sceneSummary: caption.trim() || `Scene ${index}`,
        layoutStyle: "",
        motionHint: "",
        subjects: "",
        visibleText: "",
        visionScored: true,
      };
    } catch {
      return timelineStubRow(index, timeSec);
    }
  });
}

function buildDeepSeekAdaptPrompt(input: {
  product: string;
  headline: string;
  subline: string;
  offer: string;
  promptExtra: string;
  market: PromptMarket;
  sourceDurationSec: number;
  referenceClipSec: number;
  outputDurationSec: number;
  digestMontage: boolean;
  frames: FrameVisionRow[];
}): string {
  const frameBlock = input.frames
    .map((f) => {
      const tag =
        f.visionScored === false
          ? " [caption missing — infer from neighbors]"
          : " [Florence caption]";
      return `Frame ${f.index} (at ${f.timeSec.toFixed(1)}s in the ${input.sourceDurationSec.toFixed(0)}s source)${tag}: ${f.sceneSummary}`;
    })
    .join("\n");

  const refNote = input.digestMontage
    ? `@Video1 will be a ~${input.referenceClipSec.toFixed(0)}s DIGEST MONTAGE of the full ${input.sourceDurationSec.toFixed(0)}s reference (prepared at generate) — not just the opening.`
    : `@Video1 is the reference reel (up to ${input.referenceClipSec.toFixed(0)}s).`;

  return [
    "Adapt this reference REEL structure for the user's product video (Seedance reference-to-video).",
    "Return ONE JSON object only.",
    "",
    "Required JSON:",
    '{"visualDirection":"","motionSummary":"","seedancePrompt":"","productionNotesZh":"","shots":[{"index":1,"timeSec":0,"sceneSummary":"","layoutStyle":"","motionHint":"","subjects":"","visibleText":""}]}',
    "",
    "Rules:",
    "- Frames above span the FULL source timeline — use the whole story arc (hook, product demo, payoff/CTA), not only the first seconds.",
    "- For each shot: compress the Florence caption into sceneSummary/layoutStyle/motionHint/subjects/visibleText (do not invent on-screen text).",
    "- seedancePrompt: English for Seedance R2V. The OUTPUT must feel like a COMPLETE standalone ad in the target duration — clear opening hook, product hero moment, and satisfying close (even if subtle).",
    "- Compress the reference's narrative arc into the output duration; do NOT produce a fragment that feels like it cuts off mid-intro.",
    "- Match reference pacing, cut rhythm, camera language, locations/shot types, and VISUAL STYLE FAMILY — NOT reference faces, brands, or on-video text.",
    "- spine = reference structure; swap hero object to the user's product/topic.",
    "- If the reference product category differs from the user's product: keep the SAME scenes/settings/camera from the reference and place the user's product as the held/placed hero prop — do not rewrite into a blank studio packshot that drops the reference structure.",
    "- If the reference is tutorial, how-to, authenticity test, or educational demo: keep the test/structure energy when the research direction asks for it; still avoid copying reference faces/brands/on-screen text.",
    refNote,
    `- OUTPUT length: ${input.outputDurationSec}s (Seedance / MiniMax). Map the full reference story into this short ad.`,
    ...videoDurationPlannerBlock(input.outputDurationSec),
    "",
    "Analyzed frames (full source timeline):",
    frameBlock,
    "",
    input.product
      ? `User product name (label — at generate time the uploaded photo @Image1 overrides if they conflict): ${input.product}`
      : "",
    input.headline ? `Headline: ${input.headline}` : "",
    input.subline ? `Selling points: ${input.subline}` : "",
    input.offer ? `Offer/CTA: ${input.offer}` : "",
    input.promptExtra ? `Campaign notes: ${input.promptExtra}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function normalizeAnalysis(
  parsed: Partial<ResearchReelAnalysis> & { shots?: Partial<ReelShotFrame>[] },
  durationSec: number,
  frameCount: number,
  fallbackFrames: FrameVisionRow[],
): ResearchReelAnalysis {
  const shots: ReelShotFrame[] = (parsed.shots?.length ? parsed.shots : fallbackFrames).map(
    (s, i) => {
      const fb = fallbackFrames[i];
      return {
        index: Number(s.index) || i + 1,
        timeSec: Number(s.timeSec) || fb?.timeSec || 0,
        sceneSummary: String(s.sceneSummary ?? fb?.sceneSummary ?? "").trim(),
        layoutStyle: String(s.layoutStyle ?? fb?.layoutStyle ?? "").trim(),
        motionHint: String(s.motionHint ?? fb?.motionHint ?? "").trim(),
        subjects: String(s.subjects ?? fb?.subjects ?? "").trim(),
        visibleText: String(s.visibleText ?? fb?.visibleText ?? "").trim(),
      };
    },
  );

  const seedancePrompt = String(parsed.seedancePrompt ?? "").trim();
  if (!seedancePrompt) {
    throw new Error("DeepSeek returned an empty Seedance prompt.");
  }

  return {
    durationSec,
    frameCount,
    shots,
    visualDirection: String(parsed.visualDirection ?? "").trim(),
    motionSummary: String(parsed.motionSummary ?? "").trim(),
    seedancePrompt,
    productionNotesZh: String(parsed.productionNotesZh ?? "").trim(),
  };
}

export type AnalyzeResearchReelInput = {
  videoBytes: Buffer;
  product: string;
  headline?: string;
  subline?: string;
  offer?: string;
  promptExtra?: string;
  market?: PromptMarket;
  outputDurationSec?: number;
};

export type AnalyzeResearchReelResult = {
  analysis: ResearchReelAnalysis;
  /** Null when clip is deferred to /api/prepare-reference-video at generate time. */
  referenceVideoUrl: string | null;
  referenceDigestMontage: boolean;
  sourceDurationSec: number;
  referenceDurationSec: number;
  /** First extracted MP4 frame — better style ref than search-list cover. */
  styleReferenceFrameUrl?: string;
};

/**
 * Research-reel analysis:
 * - ffmpeg stills across the full timeline (detail)
 * - Florence-2 captions (fast; same stack as concept/carousel refs — not Bagel)
 * - DeepSeek adapts captions → Seedance R2V brief
 * - Seedance digest clip deferred to generate
 */
export async function analyzeResearchReelFromVideo(
  input: AnalyzeResearchReelInput,
): Promise<AnalyzeResearchReelResult> {
  await ensureFfmpeg();
  const workDir = await mkdtemp(path.join(tmpdir(), "reel-analyze-"));
  const videoPath = path.join(workDir, "input.mp4");

  try {
    await writeFile(videoPath, input.videoBytes);

    const [sourceDurationSec, frameExtract] = await Promise.all([
      getMediaDurationSeconds(videoPath),
      extractVideoFrames(videoPath, workDir, {
        maxFrames: TIMELINE_FRAMES,
        minFrames: Math.min(3, TIMELINE_FRAMES),
      }),
    ]);
    const { paths, timesSec } = frameExtract;
    const outputDurationSec = input.outputDurationSec ?? 8;
    const willDigest = sourceDurationSec > SEEDANCE_MAX_REFERENCE_SEC + 0.25;
    const referenceDurationSec = willDigest
      ? SEEDANCE_MAX_REFERENCE_SEC
      : sourceDurationSec;

    const buffers = await Promise.all(paths.map((p) => readFile(p)));
    const frameUrls = await Promise.all(
      buffers.map((buf, i) =>
        fal.storage.upload(
          new File([buf], path.basename(paths[i]!), { type: "image/jpeg" }),
        ),
      ),
    );

    const frameVision = await visionCaptionAllFrames(frameUrls, timesSec);

    const deepSeekRaw = await callDeepSeekChat(
      [
        {
          role: "system",
          content:
            "You are a performance marketing video director. Adapt reference reel structure for a new product. Output valid JSON only.",
        },
        {
          role: "user",
          content: buildDeepSeekAdaptPrompt({
            product: input.product,
            headline: input.headline?.trim() ?? "",
            subline: input.subline?.trim() ?? "",
            offer: input.offer?.trim() ?? "",
            promptExtra: input.promptExtra?.trim() ?? "",
            market: input.market ?? "hk",
            sourceDurationSec,
            referenceClipSec: referenceDurationSec,
            outputDurationSec,
            digestMontage: willDigest,
            frames: frameVision,
          }),
        },
      ],
      { temperature: 0.45, max_tokens: 3000, jsonObject: true },
    );

    const parsed = parseLlmJsonObject<
      Partial<ResearchReelAnalysis> & { shots?: Partial<ReelShotFrame>[] }
    >(deepSeekRaw, "Research reel adaptation");

    const analysis = normalizeAnalysis(
      parsed,
      sourceDurationSec,
      paths.length,
      frameVision,
    );

    return {
      analysis,
      referenceVideoUrl: null,
      referenceDigestMontage: willDigest,
      sourceDurationSec,
      referenceDurationSec,
      styleReferenceFrameUrl: frameUrls[0],
    };
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

/** @internal Test helper — DeepSeek adapt prompt text. */
export function buildResearchReelAdaptPromptForTest(
  input: Parameters<typeof buildDeepSeekAdaptPrompt>[0],
): string {
  return buildDeepSeekAdaptPrompt(input);
}
