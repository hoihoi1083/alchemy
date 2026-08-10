/**
 * Automatic Seedance → MiniMax H3 → Kling fallback must rewrite the SAME
 * DeepSeek script into each model's prompt grammar. Users never pick the engine.
 */

import {
  extractKlingMotionFromSeedancePrompt,
  planKlingFallbackScenesFromSeedancePrompt,
  type KlingBeatFromScript,
} from "@/lib/kling-motion-from-plan";
import type { KlingSceneMeta } from "@/lib/kling-storyboard-fallback";
import { seedancePromptToMinimaxH3 } from "@/lib/minimax-h3-run";

function hasAtTag(prompt: string, kind: "Image" | "Video" | "Audio", index: number): boolean {
  return new RegExp(`@\\s*${kind}\\s*${index}\\b`, "i").test(prompt);
}

function hasMinimaxTag(prompt: string, kind: "Image" | "Video" | "Audio", index: number): boolean {
  return new RegExp(`\\b${kind}\\s+${index}\\b`, "i").test(prompt);
}

/** Prepend missing @ImageN / @VideoN for Seedance reference-to-video. */
export function ensureSeedanceReferenceTags(
  prompt: string,
  imageCount: number,
  videoCount: number,
  audioCount = 0,
): { prompt: string; added: string[] } {
  const added: string[] = [];
  let result = prompt.trim();

  for (let i = 1; i <= imageCount; i++) {
    if (!hasAtTag(result, "Image", i)) added.push(`@Image${i}`);
  }
  for (let i = 1; i <= videoCount; i++) {
    if (!hasAtTag(result, "Video", i)) added.push(`@Video${i}`);
  }
  for (let i = 1; i <= audioCount; i++) {
    if (!hasAtTag(result, "Audio", i)) added.push(`@Audio${i}`);
  }

  if (added.length > 0) {
    result = `${added.join(" ")} ${result}`.trim();
  }
  return { prompt: result, added };
}

/**
 * DeepSeek / Seedance script → MiniMax H3 reference-to-video prompt.
 * Converts @Image1 → Image 1 and ensures media slots are named.
 */
export function adaptScriptForMinimaxH3(opts: {
  seedancePrompt: string;
  imageCount: number;
  videoCount: number;
  /** Storyboard 有字 stills — keep baked type. Poster type is ffmpeg overlay (false). */
  preserveOnScreenType?: boolean;
}): string {
  const { prompt: tagged } = ensureSeedanceReferenceTags(
    opts.seedancePrompt,
    opts.imageCount,
    opts.videoCount,
    0,
  );
  let result = seedancePromptToMinimaxH3(tagged).trim();

  const missing: string[] = [];
  for (let i = 1; i <= opts.imageCount; i++) {
    if (!hasMinimaxTag(result, "Image", i)) missing.push(`Image ${i}`);
  }
  for (let i = 1; i <= opts.videoCount; i++) {
    if (!hasMinimaxTag(result, "Video", i)) missing.push(`Video ${i}`);
  }
  if (missing.length > 0) {
    result = `${missing.join(" ")} ${result}`.trim();
  }

  if (opts.preserveOnScreenType) {
    if (!/KINETIC TYPE|type may fade|ride the card/i.test(result)) {
      result = `${result} Silent video: no speech. Keep poster wording identical. Type may fade in, slide, or track a 3D paper/card warp. Do not change letters or invent new logos.`;
    }
  } else if (!/no (?:on-?screen )?text|silent video|no speech/i.test(result)) {
    // H3 is quieter about invented captions when we keep the silent/textless intent.
    result = `${result} Silent video: no speech. Do not invent on-screen text or logos.`;
  }

  return result;
}

export type KlingFallbackPromptPlan = {
  theme: string;
  motionPrompt: string;
  imageUrls: string[];
  scenesMeta: KlingSceneMeta[];
  beats: KlingBeatFromScript[];
};

/**
 * DeepSeek / Seedance script → Kling I2V plan (English motion only).
 * Expands one product still into multi-beat clips when the script has timing.
 */
export function adaptScriptForKlingFallback(opts: {
  seedancePrompt: string;
  totalDurationSec: number;
  imageUrls: string[];
  clientScenesMeta?: KlingSceneMeta[];
  conceptMode?: boolean;
}): KlingFallbackPromptPlan {
  const clientMeta = opts.clientScenesMeta ?? [];
  const existingSceneCount = Math.max(opts.imageUrls.length, clientMeta.length);
  const beats = planKlingFallbackScenesFromSeedancePrompt({
    prompt: opts.seedancePrompt,
    totalDurationSec: opts.totalDurationSec,
    existingSceneCount,
  });

  const motionPrompt = extractKlingMotionFromSeedancePrompt(opts.seedancePrompt) ?? "";
  const theme = opts.conceptMode ? "concept promo" : "product promo";

  if (opts.imageUrls.length === 1 && beats.length >= 2) {
    const imageUrls = Array.from({ length: beats.length }, () => opts.imageUrls[0]!);
    return {
      theme,
      motionPrompt,
      imageUrls,
      scenesMeta: beats.map((b) => ({
        startSec: b.startSec,
        endSec: b.endSec,
        role: b.role,
        cameraMotionEn: b.cameraMotionEn,
      })),
      beats,
    };
  }

  if (beats.length === 1 && opts.imageUrls.length === 1) {
    return {
      theme,
      motionPrompt,
      imageUrls: opts.imageUrls,
      scenesMeta: [
        {
          startSec: beats[0]!.startSec,
          endSec: beats[0]!.endSec,
          role: beats[0]!.role,
          cameraMotionEn: beats[0]!.cameraMotionEn,
        },
      ],
      beats,
    };
  }

  // Multi-still storyboard already supplied — keep client meta / image list.
  return {
    theme,
    motionPrompt,
    imageUrls: opts.imageUrls,
    scenesMeta:
      clientMeta.length > 0
        ? clientMeta
        : beats.map((b) => ({
            startSec: b.startSec,
            endSec: b.endSec,
            role: b.role,
            cameraMotionEn: b.cameraMotionEn,
          })),
    beats,
  };
}

/** User-facing note — no engine jargon required; generationMode stays in API for debug. */
export function friendlyAutoFallbackNote(engine: "minimax-h3" | "kling", clipCount?: number): string {
  if (engine === "minimax-h3") {
    return "Video ready (alternate engine kept your script + reference motion).";
  }
  if (clipCount && clipCount > 1) {
    return "Video ready (script beats animated per scene, then combined).";
  }
  return "Video ready (script motion applied to your product still).";
}
