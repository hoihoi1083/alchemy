import type { BrandProfile } from "@/lib/brand-profile";
import { brandProfilePromptBlock } from "@/lib/brand-profile";
import { callDeepSeekChat } from "@/lib/deepseek-client";
import { isContentResearchStyleExtra } from "@/lib/content-research-promote";
import { parseLlmJsonObject } from "@/lib/parse-llm-json";
import { inferProductSceneCategory } from "@/lib/product-scene-hints";
import type { SubjectFraming } from "@/lib/prompt-variables";
import { VIDEO_BGM_HINT } from "@/lib/templates";
import type {
  StoryboardScenePlan,
  VideoStoryboardPlan,
} from "@/lib/video-storyboard-types";
import type { StoryboardSceneCount } from "@/lib/ad-pack-preferences";
import { artStylePlannerHint, resolveArtStyleId, type ArtStyleId } from "@/lib/art-style";
import {
  MAX_STORYBOARD_SCENES,
  MIN_STORYBOARD_SCENES,
} from "@/lib/video-storyboard-types";

function sceneCountForDuration(durationSec: number): { min: number; max: number } {
  if (durationSec <= 6) return { min: 3, max: 5 };
  if (durationSec <= 10) return { min: 4, max: 7 };
  return { min: 5, max: MAX_STORYBOARD_SCENES };
}

function finishSeedancePrompt(prompt: string): string {
  const p = prompt.trim();
  if (!/hard cut/i.test(p)) {
    return `${p}\n\nRules: HARD CUTS between every scene — never blend or morph one reference into another. No on-screen text, logos, or watermarks. Photorealistic throughout. No face distortion, no finger morphing, no plastic skin.${VIDEO_BGM_HINT}`;
  }
  if (!p.includes("instrumental")) {
    return `${p}${VIDEO_BGM_HINT}`;
  }
  return p;
}

function normalizeScene(raw: Partial<StoryboardScenePlan>, fallbackIndex: number): StoryboardScenePlan {
  return {
    imageIndex: Math.max(1, Number(raw.imageIndex) || fallbackIndex),
    role: String(raw.role ?? `scene-${fallbackIndex}`).trim() || `scene-${fallbackIndex}`,
    startSec: Math.max(0, Number(raw.startSec) || 0),
    endSec: Math.max(1, Number(raw.endSec) || 1),
    sceneDescriptionZh: String(raw.sceneDescriptionZh ?? raw.role ?? "").trim(),
    imagePrompt: String(raw.imagePrompt ?? "").trim(),
  };
}

function enforceSceneCount(
  scenes: StoryboardScenePlan[],
  target: StoryboardSceneCount | undefined,
  durationSec: number,
): StoryboardScenePlan[] {
  if (!target || target === "auto") return scenes;
  const n = Number(target);
  if (!Number.isFinite(n) || n < MIN_STORYBOARD_SCENES) return scenes;

  if (scenes.length === n) return scenes;
  if (scenes.length > n) {
    const trimmed = scenes.slice(0, n);
    const span = durationSec / n;
    return trimmed.map((s, i) => ({
      ...s,
      imageIndex: i + 1,
      startSec: i * span,
      endSec: (i + 1) * span,
    }));
  }

  const padded = [...scenes];
  const span = durationSec / n;
  while (padded.length < n) {
    const i = padded.length;
    const last = padded[padded.length - 1];
    padded.push({
      imageIndex: i + 1,
      role: `scene-${i + 1}`,
      startSec: i * span,
      endSec: (i + 1) * span,
      sceneDescriptionZh: last?.sceneDescriptionZh ?? `場景 ${i + 1}`,
      imagePrompt: last?.imagePrompt ?? "Product hero still, photorealistic 9:16.",
    });
  }
  return padded.map((s, i) => ({
    ...s,
    imageIndex: i + 1,
    startSec: i * span,
    endSec: (i + 1) * span,
  }));
}

function normalizeStoryboardPlan(
  parsed: Partial<VideoStoryboardPlan>,
  durationSec: number,
  sceneCountTarget?: StoryboardSceneCount,
): VideoStoryboardPlan {
  const rawScenes = Array.isArray(parsed.scenes) ? parsed.scenes : [];
  let scenes = rawScenes
    .slice(0, MAX_STORYBOARD_SCENES)
    .map((s, i) => normalizeScene(s, i + 1));

  scenes = enforceSceneCount(scenes, sceneCountTarget, durationSec);

  if (scenes.length < MIN_STORYBOARD_SCENES) {
    throw new Error(`Storyboard needs at least ${MIN_STORYBOARD_SCENES} scenes.`);
  }

  for (let i = 0; i < scenes.length; i++) {
    scenes[i].imageIndex = i + 1;
    if (!scenes[i].imagePrompt) {
      throw new Error(`Scene ${i + 1} is missing imagePrompt.`);
    }
    if (!scenes[i].sceneDescriptionZh) {
      scenes[i].sceneDescriptionZh = scenes[i].role;
    }
  }

  const seedancePrompt = String(parsed.seedancePrompt ?? "").trim();
  if (!seedancePrompt) {
    throw new Error("DeepSeek returned an empty Seedance prompt.");
  }

  for (let i = 1; i <= scenes.length; i++) {
    if (!new RegExp(`@\\s*Image\\s*${i}\\b`, "i").test(seedancePrompt)) {
      throw new Error(`Seedance prompt must reference @Image${i}.`);
    }
  }

  return {
    title: String(parsed.title ?? "").trim() || "Product story reel",
    theme: String(parsed.theme ?? "").trim(),
    visualDirection: String(parsed.visualDirection ?? "").trim(),
    totalDurationSec: Math.max(
      durationSec,
      Number(parsed.totalDurationSec) || durationSec,
    ),
    scenes,
    seedancePrompt: finishSeedancePrompt(seedancePrompt),
    productionNotes: String(parsed.productionNotes ?? "").trim(),
  };
}

function buildPlanPrompt(input: {
  product: string;
  business: string;
  headline: string;
  subline: string;
  offer: string;
  storyboardBrief: string;
  durationSec: number;
  sceneCountTarget?: StoryboardSceneCount;
  market: string;
  framing: SubjectFraming;
  brandProfile?: BrandProfile | null;
  styleHint: string;
  promptExtra?: string;
  artStyleId?: ArtStyleId;
}): string {
  const category = inferProductSceneCategory(input.product);
  const { min, max } = sceneCountForDuration(input.durationSec);
  const sceneCountLine =
    input.sceneCountTarget && input.sceneCountTarget !== "auto"
      ? `Scene count: EXACTLY ${input.sceneCountTarget} scenes for ~${input.durationSec}s total.`
      : `Scene count: ${min}–${max} scenes for ~${input.durationSec}s total. Max ${MAX_STORYBOARD_SCENES} images.`;
  const brandBlock = input.brandProfile?.businessName
    ? brandProfilePromptBlock(input.brandProfile)
    : "";

  const artStyleId = resolveArtStyleId(input.artStyleId);
  const artHint = artStylePlannerHint(artStyleId);

  return [
    `Plan a ${artStyleId === "realistic" ? "photorealistic" : "stylized"} product VIDEO STORYBOARD for a single Seedance reference-to-video call.`,
    "Return ONE JSON object only — no markdown fences.",
    "",
    "Required JSON shape:",
    '{"title":"","theme":"","visualDirection":"","totalDurationSec":0,"scenes":[{"imageIndex":1,"role":"","startSec":0,"endSec":2,"sceneDescriptionZh":"","imagePrompt":""}],"seedancePrompt":"","productionNotes":""}',
    "",
    "PRODUCT ADAPTATION (critical):",
    `- Infer product category from name and IMAGE 1 (current guess: ${category}).`,
    "- Scenes MUST match how this product is actually shown/used:",
    "  · wearables → wrist/on-body, macro detail, lifestyle context",
    "  · personal-care devices → bathroom/counter demo, hands showing use — NOT worn like jewelry",
    "  · footwear → on feet or paired flat lay",
    "  · food/consumables → kitchen/table context, packaging hero",
    "  · generic → studio hero, macro texture, lifestyle surface — never default to jewelry/cheongsam unless product implies it",
    "",
    sceneCountLine,
    "- Each scene gets ONE still (imageIndex 1…N in timeline order).",
    "- imagePrompt: English, for Nano Banana edit from user's product photo — 9:16 still matching the art direction, subject upright (head at top), correct vertical orientation, no readable text.",
    "- sceneDescriptionZh: one line for the user (繁體中文 if HK/TW).",
    "",
    "seedancePrompt (English, for Seedance API):",
    `- Opening line: 9:16 commercial for THIS product category in the chosen art direction.`,
    "- One block per scene: Scene N [start-end s]: hard cut — @ImageK … static or very subtle motion only.",
    "- Each @ImageK must match scenes[K-1].imageIndex exactly.",
    "- Prefer locked/static camera, hard cuts, minimal morphing.",
    "- People only when category-appropriate; no celebrity faces; hands-only OK.",
    "- NO on-screen text, prices, or discounts unless user brief includes them.",
    input.offer
      ? `- User offer (may appear in CTA scene only): ${input.offer}`
      : "- User did NOT provide pricing — do NOT invent prices or discount % in prompts.",
    "",
    "productionNotes: brief user note in 繁體中文 (HK) or English — what to expect, limits of one Seedance call.",
    "",
    `Target duration: ${input.durationSec} seconds.`,
    artHint,
    input.styleHint ? `Visual mood hint: ${input.styleHint}` : "",
    input.promptExtra ? `Style / reference notes: ${input.promptExtra}` : "",
    isContentResearchStyleExtra(input.promptExtra)
      ? "- Reference is STYLE ONLY from content research — scenes and copy must promote the user's product, not the viral post topic."
      : "",
    input.storyboardBrief ? `User story request: ${input.storyboardBrief}` : "",
    input.product ? `Product: ${input.product}` : "",
    input.business ? `Business: ${input.business}` : "",
    input.headline ? `Headline: ${input.headline}` : "",
    input.subline ? `Selling points: ${input.subline}` : "",
    input.framing !== "auto" ? `Subject framing preference: ${input.framing}` : "",
    brandBlock,
  ]
    .filter(Boolean)
    .join("\n");
}

export type PlanStoryboardInput = {
  product?: string;
  business?: string;
  headline?: string;
  subline?: string;
  offer?: string;
  storyboardBrief?: string;
  durationSec?: number;
  market?: string;
  framing?: SubjectFraming;
  promptExtra?: string;
  styleHint?: string;
  brandProfile?: BrandProfile | null;
  sceneCountTarget?: StoryboardSceneCount;
  artStyleId?: ArtStyleId;
};

export async function planVideoStoryboard(
  input: PlanStoryboardInput,
): Promise<VideoStoryboardPlan> {
  const product = input.product?.trim() || "";
  if (!product) throw new Error("Product name is required for storyboard planning.");

  const durationSec = Math.min(
    15,
    Math.max(4, Number(input.durationSec) || 10),
  );

  const artStyleId = resolveArtStyleId(input.artStyleId);
  const stylized = artStyleId !== "realistic";

  const outputText = await callDeepSeekChat(
    [
      {
        role: "system",
        content: stylized
          ? "You are a stylized product video storyboard director for HK/TW/CN SMB Reels. Output valid JSON only. Match the user's art direction in every scene still."
          : "You are a photorealistic product video storyboard director for HK/TW/CN SMB Reels. Output valid JSON only. Adapt every scene to the actual product category — never copy a fixed template from unrelated categories.",
      },
      {
        role: "user",
        content: buildPlanPrompt({
          product,
          business: input.business?.trim() || "",
          headline: input.headline?.trim() || "",
          subline: input.subline?.trim() || "",
          offer: input.offer?.trim() || "",
          storyboardBrief: input.storyboardBrief?.trim() || "",
          durationSec,
          sceneCountTarget: input.sceneCountTarget,
          market: input.market || "hk",
          framing: input.framing || "auto",
          brandProfile: input.brandProfile,
          styleHint: input.styleHint?.trim() || "",
          promptExtra: input.promptExtra?.trim() || "",
          artStyleId,
        }),
      },
    ],
    { temperature: 0.5, max_tokens: 4000, jsonObject: true },
  );

  const plan = normalizeStoryboardPlan(
    parseLlmJsonObject<Partial<VideoStoryboardPlan>>(outputText, "Video storyboard plan"),
    durationSec,
    input.sceneCountTarget,
  );

  return plan;
}
