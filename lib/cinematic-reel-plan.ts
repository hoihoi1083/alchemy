import { callDeepSeekChat } from "@/lib/deepseek-client";
import {
  artStylePlannerHint,
  guardCinematicImagePrompt,
  resolveArtStyleId,
  type ArtStyleId,
} from "@/lib/art-style";
import {
  CINEMATIC_CLIP_SEC,
  clampCinematicSceneCount,
  cinematicTimingRanges,
  type CinematicSceneCount,
} from "@/lib/cinematic-scene-config";
import {
  CINEMATIC_MOTION_FALLBACKS,
  CINEMATIC_MOTION_PLANNER_RULES,
  defaultCinematicSceneMotionPrompt,
} from "@/lib/cinematic-motion-prompt";
import { parseLlmJsonObject } from "@/lib/parse-llm-json";
import type { PromptMarket } from "@/lib/prompt-variables";
import type { CinematicReelPlan, CinematicScenePlan } from "@/lib/cinematic-reel-types";

export type { CinematicSceneCount } from "@/lib/cinematic-scene-config";

function localeHint(market: PromptMarket): string {
  if (market === "hk" || market === "tw") {
    return "sceneDescriptionZh in Traditional Chinese; imagePrompt and videoMotionPrompt in English.";
  }
  if (market === "cn") {
    return "sceneDescriptionZh in Simplified Chinese; imagePrompt and videoMotionPrompt in English.";
  }
  return "sceneDescriptionZh in English; imagePrompt and videoMotionPrompt in English.";
}

function ensureCinematicImagePrompt(prompt: string, artStyleId: ArtStyleId = "realistic"): string {
  return guardCinematicImagePrompt(prompt, artStyleId);
}

function normalizeScene(
  raw: Partial<CinematicScenePlan>,
  i: number,
  artStyleId: ArtStyleId = "realistic",
): CinematicScenePlan {
  const startSec = Math.max(0, Number(raw.startSec) || i * CINEMATIC_CLIP_SEC);
  const endSec = Math.max(startSec + 2, Number(raw.endSec) || startSec + CINEMATIC_CLIP_SEC);
  return {
    sceneIndex: Number(raw.sceneIndex) || i + 1,
    role: String(raw.role ?? `scene-${i + 1}`).trim() || `scene-${i + 1}`,
    startSec,
    endSec,
    sceneDescriptionZh: String(raw.sceneDescriptionZh ?? "").trim() || `Scene ${i + 1}`,
    imagePrompt: ensureCinematicImagePrompt(String(raw.imagePrompt ?? ""), artStyleId),
    videoMotionPrompt:
      String(raw.videoMotionPrompt ?? "").trim() ||
      defaultCinematicSceneMotionPrompt(Number(raw.sceneIndex) || i + 1),
  };
}

export function normalizeCinematicReelPlan(
  parsed: Partial<CinematicReelPlan>,
  sceneCount = 3,
  artStyleId: ArtStyleId = "realistic",
): CinematicReelPlan {
  const n = clampCinematicSceneCount(sceneCount);
  const scenes = (Array.isArray(parsed.scenes) ? parsed.scenes : [])
    .slice(0, n)
    .map((s, i) => normalizeScene(s as Partial<CinematicScenePlan>, i, artStyleId));

  while (scenes.length < n) {
    const i = scenes.length;
    scenes.push(normalizeScene({}, i, artStyleId));
  }

  return {
    title: String(parsed.title ?? "Concept cinematic reel").trim(),
    theme: String(parsed.theme ?? "").trim(),
    totalDurationSec: n * CINEMATIC_CLIP_SEC,
    scenes,
    productionNotes: String(parsed.productionNotes ?? "").trim(),
  };
}

export async function planCinematicReel(
  input: {
    product: string;
    headline: string;
    subline: string;
    business: string;
    offer: string;
    creativeBrief: string;
    promptExtra: string;
    market: PromptMarket;
    referenceImageNote?: string;
    artStyleId?: ArtStyleId;
  },
  sceneCount: CinematicSceneCount | number = 3,
): Promise<CinematicReelPlan> {
  const n = clampCinematicSceneCount(sceneCount);
  const artStyleId = resolveArtStyleId(input.artStyleId);
  const artHint = artStylePlannerHint(artStyleId);
  const userBlock = [
    `Market: ${input.market}`,
    `Concept: ${input.product || input.headline || "(not set)"}`,
    `Headline: ${input.headline || "(not set)"}`,
    `Subline: ${input.subline || "(not set)"}`,
    `Business: ${input.business || "(not set)"}`,
    `Offer: ${input.offer || "(not set)"}`,
    `Creative brief: ${input.creativeBrief || "(not set)"}`,
    input.promptExtra ? `Extra direction: ${input.promptExtra}` : "",
    input.referenceImageNote ? `Reference image note: ${input.referenceImageNote}` : "",
    artHint,
  ]
    .filter(Boolean)
    .join("\n");

  const sceneRules =
    n === 1
      ? `Rules: exactly 1 scene, ${CINEMATIC_CLIP_SEC}s, timing 0-${CINEMATIC_CLIP_SEC}. imagePrompt example: "Hong Kong sports bar at night, fans in red jerseys watching World Cup on TV, young man smiles at loan approval on phone, warm cinematic rim light, shallow DOF" — NOT a poster with Chinese text.`
      : `Rules: exactly ${n} scenes, each ${CINEMATIC_CLIP_SEC}s, sequential timing ${cinematicTimingRanges(n)}. Each scene = distinct story beat (hook → development → payoff). imagePrompts are cinematic stills only — no posters or infographics.`;

  const raw = await callDeepSeekChat(
    [
      {
        role: "system",
        content: [
          n === 1
            ? "You plan a single-scene cinematic social reel hook (8 seconds)."
            : `You plan a ${n}-scene cinematic social reel (${CINEMATIC_CLIP_SEC}s per scene, stitched to ~${n * CINEMATIC_CLIP_SEC}s).`,
          "Return JSON only.",
          localeHint(input.market),
          "Each scene needs a still image prompt (Nano Banana) and a motion-only Seedance prompt.",
          artHint,
          ...CINEMATIC_MOTION_PLANNER_RULES,
          input.referenceImageNote
            ? `User reference note (match topic + motion energy for videoMotionPrompt): ${input.referenceImageNote.slice(0, 800)}`
            : "",
          "imagePrompt must describe a cinematic scene still matching the art direction above — never a marketing poster, infographic, or slide with written copy.",
          "Marketing headlines and offers are for captions/voiceover later — do NOT put ad copy inside imagePrompt.",
          "sceneDescriptionZh should describe the story beat for that scene (used for script/voiceover planning).",
          "No on-screen text, logos, or watermarks in visuals.",
          "Avoid real celebrity likenesses — use original characters only.",
        ].join(" "),
      },
      {
        role: "user",
        content: [
          userBlock,
          "",
          "Return JSON:",
          JSON.stringify({
            title: "short title",
            theme: "one line theme",
            totalDurationSec: n * CINEMATIC_CLIP_SEC,
            scenes: [
              {
                sceneIndex: 1,
                role: "hook",
                startSec: 0,
                endSec: CINEMATIC_CLIP_SEC,
                sceneDescriptionZh: "scene beat",
                imagePrompt: "English still image prompt",
                videoMotionPrompt:
                  CINEMATIC_MOTION_FALLBACKS[0],
              },
            ],
            productionNotes: "editor note",
          }),
          "",
          sceneRules,
        ].join("\n"),
      },
    ],
    { temperature: 0.55 },
  );

  return normalizeCinematicReelPlan(
    parseLlmJsonObject(raw) as Partial<CinematicReelPlan>,
    n,
    artStyleId,
  );
}

/** @deprecated use CINEMATIC_CLIP_SEC from cinematic-scene-config */
export const CINEMATIC_CLIP_SEC_LEGACY = CINEMATIC_CLIP_SEC;
export const CINEMATIC_SCENE_COUNT = 3;
