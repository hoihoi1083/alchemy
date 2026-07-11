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
import {
  buildSeedanceReferenceClip,
} from "@/lib/reference-video-prepare";
import { mkdtemp, readFile, rm, writeFile } from "fs/promises";
import path from "path";
import { tmpdir } from "os";

const VISION_ENDPOINT = "fal-ai/any-llm/vision";
const VISION_MODEL = "google/gemini-2.5-flash-lite";
const MAX_FRAMES = 6;
const MIN_FRAMES = 3;

type FrameVisionRow = {
  index: number;
  timeSec: number;
  sceneSummary: string;
  layoutStyle: string;
  motionHint: string;
  subjects: string;
  visibleText: string;
};

function extractVisionText(data: unknown): string {
  if (!data || typeof data !== "object") return "";
  const d = data as Record<string, unknown>;
  if (typeof d.output === "string") return d.output.trim();
  if (typeof d.text === "string") return d.text.trim();
  const choices = d.choices as Array<{ message?: { content?: string } }> | undefined;
  const content = choices?.[0]?.message?.content;
  if (typeof content === "string") return content.trim();
  return "";
}

type RawFrameVisionRow = Partial<FrameVisionRow> & {
  summary?: string;
  motion?: string;
};

function normalizeFrameRow(
  raw: RawFrameVisionRow,
  index: number,
  timeSec: number,
): FrameVisionRow {
  return {
    index,
    timeSec,
    sceneSummary: String(raw.sceneSummary ?? raw.summary ?? "").trim() || `Scene ${index}`,
    layoutStyle: String(raw.layoutStyle ?? "").trim(),
    motionHint: String(raw.motionHint ?? raw.motion ?? "").trim(),
    subjects: String(raw.subjects ?? "").trim(),
    visibleText: String(raw.visibleText ?? "").trim(),
  };
}

async function visionAnalyzeReelFrames(
  frameUrls: string[],
  timesSec: number[],
): Promise<FrameVisionRow[]> {
  const result = await fal.subscribe(VISION_ENDPOINT, {
    input: {
      model: VISION_MODEL,
      image_urls: frameUrls,
      system_prompt:
        "You analyze social-media reel frames in timeline order. Output valid JSON only.",
      prompt: [
        `These ${frameUrls.length} images are frames extracted in chronological order from one reference reel.`,
        "For EACH frame, describe composition, implied camera motion, and subjects.",
        "Return JSON: {\"frames\":[{\"index\":1,\"sceneSummary\":\"\",\"layoutStyle\":\"\",\"motionHint\":\"\",\"subjects\":\"\",\"visibleText\":\"\"}]}",
        "index must match frame order 1…N. motionHint = how this shot moves or cuts (static, pan, zoom, hand motion, etc.).",
        "visibleText = legible on-screen text if any (original language); empty string if none.",
        "Do not invent text that is not visible.",
      ].join("\n"),
    },
    logs: false,
  });

  const text = extractVisionText(result.data);
  const parsed = parseLlmJsonObject<{ frames?: RawFrameVisionRow[] }>(
    text,
    "Reel frame vision",
  );
  const rows = Array.isArray(parsed.frames) ? parsed.frames : [];
  return frameUrls.map((_, i) =>
    normalizeFrameRow(rows[i] ?? {}, i + 1, timesSec[i] ?? 0),
  );
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
    .map(
      (f) =>
        `Frame ${f.index} (at ${f.timeSec.toFixed(1)}s in the ${input.sourceDurationSec.toFixed(0)}s source): ${f.sceneSummary}. Layout: ${f.layoutStyle}. Motion: ${f.motionHint}. Subjects (DO NOT copy): ${f.subjects}.`,
    )
    .join("\n");

  const refNote = input.digestMontage
    ? `@Video1 is a ${input.referenceClipSec.toFixed(0)}s DIGEST MONTAGE stitched from hook, middle, and closing beats across the full ${input.sourceDurationSec.toFixed(0)}s reference — not just the opening.`
    : `@Video1 is the reference reel (${input.referenceClipSec.toFixed(0)}s).`;

  return [
    "Adapt this reference REEL structure for the user's product video (Seedance reference-to-video).",
    "Return ONE JSON object only.",
    "",
    "Required JSON:",
    '{"visualDirection":"","motionSummary":"","seedancePrompt":"","productionNotesZh":"","shots":[{"index":1,"timeSec":0,"sceneSummary":"","layoutStyle":"","motionHint":"","subjects":"","visibleText":""}]}',
    "",
    "Rules:",
    "- Frames above span the FULL source timeline — use the whole story arc (hook, product demo, payoff/CTA), not only the first seconds.",
    "- seedancePrompt: English for Seedance R2V. The OUTPUT must feel like a COMPLETE standalone ad in the target duration — clear opening hook, product hero moment, and satisfying close (even if subtle).",
    "- Compress the reference's narrative arc into the output duration; do NOT produce a fragment that feels like it cuts off mid-intro.",
    "- Match reference pacing, cut rhythm, camera language, and VISUAL STYLE FAMILY (render medium, palette, meme/cinematic energy) — NOT reference faces, brands, unrelated topics, or on-video text.",
    "- All hero CONTENT = user's product/topic — keep reference LOOK and edit grammar.",
    "- If the reference is tutorial, how-to, authenticity test, or educational demo: do NOT copy literal test steps or props (flashlight, fire, tools). Repurpose the same edit energy and visual style as a showcase starring the user's product/topic.",
    refNote,
    `- OUTPUT length: ${input.outputDurationSec}s (Seedance). Map the full reference story into this short ad.`,
    "",
    "Analyzed frames (full source timeline):",
    frameBlock,
    "",
    input.product ? `User product: ${input.product}` : "",
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
  referenceVideoUrl: string;
  referenceDigestMontage: boolean;
  sourceDurationSec: number;
  referenceDurationSec: number;
  /** First extracted MP4 frame — better style ref than search-list cover. */
  styleReferenceFrameUrl?: string;
};

export async function analyzeResearchReelFromVideo(
  input: AnalyzeResearchReelInput,
): Promise<AnalyzeResearchReelResult> {
  await ensureFfmpeg();
  const workDir = await mkdtemp(path.join(tmpdir(), "reel-analyze-"));
  const videoPath = path.join(workDir, "input.mp4");

  try {
    await writeFile(videoPath, input.videoBytes);
    const sourceDurationSec = await getMediaDurationSeconds(videoPath);
    const outputDurationSec = input.outputDurationSec ?? 8;

    const { paths, timesSec } = await extractVideoFrames(videoPath, workDir, {
      maxFrames: MAX_FRAMES,
      minFrames: MIN_FRAMES,
    });

    const clip = await buildSeedanceReferenceClip(input.videoBytes);
    const refFile = new File([new Uint8Array(clip.buffer)], "reference-clip.mp4", {
      type: "video/mp4",
    });
    const referenceVideoUrl = await fal.storage.upload(refFile);

    const frameUrls: string[] = [];
    for (const framePath of paths) {
      const buf = await readFile(framePath);
      const file = new File([buf], path.basename(framePath), { type: "image/jpeg" });
      frameUrls.push(await fal.storage.upload(file));
    }

    const frameVision = await visionAnalyzeReelFrames(frameUrls, timesSec);

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
            referenceClipSec: clip.durationSec,
            outputDurationSec,
            digestMontage: clip.digestMontage,
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
      referenceVideoUrl,
      referenceDigestMontage: clip.digestMontage,
      sourceDurationSec,
      referenceDurationSec: clip.durationSec,
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
