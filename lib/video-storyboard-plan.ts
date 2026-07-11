import type { BrandProfile } from "@/lib/brand-profile";
import { brandProfilePromptBlock } from "@/lib/brand-profile";
import { callDeepSeekChat } from "@/lib/deepseek-client";
import { isContentResearchStyleExtra } from "@/lib/content-research-promote";
import { isLayoutTransferReferenceExtra } from "@/lib/user-reference-brief";
import type { ReferenceStrategyKind } from "@/lib/reference-strategy";
import { parseLlmJsonObject } from "@/lib/parse-llm-json";
import { inferProductSceneCategory } from "@/lib/product-scene-hints";
import { isStoryboardStructureLabel } from "@/lib/prompt-variables";
import type { ResearchReelAnalysis } from "@/lib/reel-analysis-types";
import { pinStoryboardPlanToReelAnalysis } from "@/lib/reel-reference-brief";
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
    onImageCopyZh: String(raw.onImageCopyZh ?? "").trim() || undefined,
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
      onImageCopyZh: last?.onImageCopyZh ?? last?.sceneDescriptionZh ?? `場景 ${i + 1}`,
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
    if (!scenes[i].onImageCopyZh) {
      throw new Error(`Scene ${i + 1} is missing onImageCopyZh (consumer on-image copy).`);
    }
    if (isStoryboardStructureLabel(scenes[i].onImageCopyZh)) {
      throw new Error(`Scene ${i + 1} onImageCopyZh must not use production labels (開場亮點/行動呼籲).`);
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
  referenceStrategyKind?: ReferenceStrategyKind;
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
  const layoutTransferRef =
    input.referenceStrategyKind === "layout-transfer" ||
    isLayoutTransferReferenceExtra(input.promptExtra);
  const contentResearchRef = isContentResearchStyleExtra(input.promptExtra);

  const layoutTransferRules = layoutTransferRef
    ? [
        "LAYOUT TRANSFER (reference ad + user product photo):",
        "- Every scene still uses the SAME ad design grammar as IMAGE 1 — same layout family (text band positions, hero placement, graphic components, typography hierarchy, staging pose type).",
        "- visualDirection MUST describe reference layout grid, palette, and typography bands from the USER REFERENCE block — not a generic natural-light product reel.",
        "- Do NOT plan a stock product-photography sequence (macro → wrist → flat lay) unless IMAGE 1 is clearly that style.",
        "- Scene 1 = opening hook in reference cover layout; middle scenes = same template shell with new copy/angle; final scene = CTA/recap band matching reference style.",
        "- imagePrompt per scene: English still for Nano Banana dual-image edit — same LAYER A layout shell as IMAGE 1, IMAGE 2 product as hero, scene-specific action within that shell.",
        "- All on-image copy promotes the user's product only — never zodiac/星座 hooks or wording from the reference post.",
      ]
    : [];

  const productAdaptationBlock = layoutTransferRef
    ? [
        "PRODUCT ADAPTATION (layout-transfer):",
        `- Product category from name and IMAGE 2 (guess: ${category}).`,
        "- Match how IMAGE 1 stages the hero (hands, wrist, flat lay, centered hero) — swap in IMAGE 2 product.",
        "- Scene variety comes from copy and subtle angle changes inside the SAME ad template, not unrelated compositions.",
      ]
    : [
        "PRODUCT ADAPTATION (critical):",
        `- Infer product category from name and IMAGE 1 (current guess: ${category}).`,
        "- Scenes MUST match how this product is actually shown/used:",
        "  · wearables → wrist/on-body, macro detail, lifestyle context",
        "  · personal-care devices → bathroom/counter demo, hands showing use — NOT worn like jewelry",
        "  · footwear → on feet or paired flat lay",
        "  · food/consumables → kitchen/table context, packaging hero",
        "  · generic → studio hero, macro texture, lifestyle surface — never default to jewelry/cheongsam unless product implies it",
      ];

  return [
    layoutTransferRef
      ? "Plan a reference-layout VIDEO STORYBOARD: same ad design family as IMAGE 1 on every still, user's product and copy — for one Seedance reference-to-video call."
      : `Plan a ${artStyleId === "realistic" ? "photorealistic" : "stylized"} product VIDEO STORYBOARD for a single Seedance reference-to-video call.`,
    "Return ONE JSON object only — no markdown fences.",
    "",
    "Required JSON shape:",
    '{"title":"","theme":"","visualDirection":"","totalDurationSec":0,"scenes":[{"imageIndex":1,"role":"","startSec":0,"endSec":2,"sceneDescriptionZh":"","onImageCopyZh":"","imagePrompt":""}],"seedancePrompt":"","productionNotes":""}',
    "",
    ...productAdaptationBlock,
    "",
    ...layoutTransferRules,
    ...(layoutTransferRules.length ? [""] : []),
    sceneCountLine,
    "- Each scene gets ONE still (imageIndex 1…N in timeline order).",
    layoutTransferRef
      ? "- imagePrompt: English, dual-image edit — keep IMAGE 1 layout shell, IMAGE 2 product hero, 9:16, subject upright, on-image copy from onImageCopyZh only."
      : "- imagePrompt: English, for Nano Banana edit from user's product photo — 9:16 still matching the art direction, subject upright (head at top), correct vertical orientation, no readable text unless onImageCopyZh is set.",
    "- onImageCopyZh: consumer-facing ad copy for THIS scene only (繁體中文 for HK/TW). Short headline + optional subline or CTA. NEVER use production labels: 開場亮點, 行動呼籲, 中段, arrows (→), or storyboard role names.",
    "- sceneDescriptionZh: one line for the user (繁體中文 if HK/TW) — internal note, not burned on image.",
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
    contentResearchRef && !layoutTransferRef
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
  referenceStrategyKind?: ReferenceStrategyKind;
};

/** @internal Exported for unit tests — storyboard planner prompt text. */
export function buildStoryboardPlanPromptForTest(
  input: Parameters<typeof buildPlanPrompt>[0],
): string {
  return buildPlanPrompt(input);
}

/** Validate and normalize a storyboard plan from client JSON (e.g. content-research reel analysis). */
export function parseVideoStoryboardPlan(
  parsed: Partial<VideoStoryboardPlan>,
  durationSec: number,
  sceneCountTarget?: StoryboardSceneCount,
): VideoStoryboardPlan {
  return normalizeStoryboardPlan(parsed, durationSec, sceneCountTarget);
}

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
  const layoutTransfer =
    input.referenceStrategyKind === "layout-transfer" ||
    isLayoutTransferReferenceExtra(input.promptExtra);

  const outputText = await callDeepSeekChat(
    [
      {
        role: "system",
        content: layoutTransfer
          ? "You are a layout-transfer video storyboard director for HK/TW/CN SMB Reels. Output valid JSON only. Every scene still must share the same ad design grammar as the user's reference — not a generic product photo reel."
          : stylized
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
          referenceStrategyKind: input.referenceStrategyKind,
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

function buildReelStoryboardPlanPrompt(input: {
  analysis: ResearchReelAnalysis;
  product: string;
  business: string;
  headline: string;
  subline: string;
  offer: string;
  promptExtra: string;
  durationSec: number;
  sceneCountTarget?: StoryboardSceneCount;
  market: string;
  framing: SubjectFraming;
  layoutTransfer: boolean;
  artStyleId: ArtStyleId;
  conceptMode?: boolean;
}): string {
  const category = inferProductSceneCategory(input.product);
  const { min, max } = sceneCountForDuration(input.durationSec);
  const frameBlock = input.analysis.shots
    .map(
      (s) =>
        `Ref shot ${s.index} @${s.timeSec.toFixed(1)}s of ~${input.analysis.durationSec.toFixed(0)}s reel: ${s.sceneSummary}. Layout: ${s.layoutStyle}. Motion: ${s.motionHint}. Reference subjects (DO NOT copy): ${s.subjects}.`,
    )
    .join("\n");

  const sceneCountLine =
    input.sceneCountTarget && input.sceneCountTarget !== "auto"
      ? `Scene count: EXACTLY ${input.sceneCountTarget} scenes for ~${input.durationSec}s total.`
      : `Scene count: ${min}–${max} scenes for ~${input.durationSec}s total. Prefer one scene per reference beat when possible.`;

  const layoutRules = input.layoutTransfer
    ? [
        "LAYOUT TRANSFER: user's cover still is IMAGE 1 layout shell; product photo is IMAGE 2.",
        "- Each scene imagePrompt: dual-image edit — keep IMAGE 1 ad layout family, swap IMAGE 2 product as hero.",
      ]
    : input.conceptMode
      ? [
          "- visualDirection JSON field: echo Reference visual direction above (render medium, palette, meme/cinematic energy) — locked aesthetic for ALL scenes.",
          "- theme JSON field: user's campaign message/topic ONLY — never the reference post topic.",
          "- imagePrompt: English 9:16 still. MATCH reference reel visual style family and layout grammar for this beat; REPLACE hero subject and props with imagery for the USER topic.",
          "- Do NOT default to generic photorealistic 小红书 lifestyle if reference is cartoon/3D/meme/illustrated.",
        ]
      : [
          "- imagePrompt: English still for Nano Banana edit from user's product photo — 9:16, photorealistic, no readable text.",
        ];

  const adaptLine = input.conceptMode
    ? "Plan a VIDEO STORYBOARD that mirrors the REFERENCE REEL structure below, adapted for the user's concept/message short."
    : "Plan a VIDEO STORYBOARD that mirrors the REFERENCE REEL structure below, adapted for the user's product.";

  const heroLine = input.conceptMode
    ? "- Scene CONTENT (what is promoted, on-image copy) = user's headline/concept — reference post topic is irrelevant."
    : "- All hero content = user's product category.";

  const seedanceLead = input.conceptMode
    ? `- 9:16 concept short, ~${input.durationSec}s total.`
    : `- 9:16 product commercial, ~${input.durationSec}s total.`;

  return [
    adaptLine,
    "Return ONE JSON object only — no markdown fences.",
    "",
    '{"title":"","theme":"","visualDirection":"","totalDurationSec":0,"scenes":[{"imageIndex":1,"role":"","startSec":0,"endSec":2,"sceneDescriptionZh":"","onImageCopyZh":"","imagePrompt":""}],"seedancePrompt":"","productionNotes":""}',
    "",
    "Rules:",
    "- Map reference shot beats to storyboard scenes in timeline order (hook → demo → payoff/CTA).",
    "- Match reference pacing, cut rhythm, camera language, and VISUAL STYLE FAMILY — NOT reference faces, brands, unrelated topics, or on-video text.",
    "- visualDirection in JSON must describe the REFERENCE reel look (from Reference visual direction above), not a generic stock aesthetic.",
    heroLine,
    input.conceptMode ? "" : `- Product category guess: ${category}.`,
    sceneCountLine,
    "- Each scene = ONE still (imageIndex 1…N).",
    ...layoutRules,
    "- sceneDescriptionZh: one line 繁體中文 for HK/TW user (internal).",
    "- onImageCopyZh: consumer ad copy for THIS scene (繁中). Real headline/CTA only — NEVER 開場亮點, 行動呼籲, → arrows, or role names.",
    "",
    "seedancePrompt (English):",
    seedanceLead,
    "- One block per scene: Scene N [start-end s]: hard cut — @ImageK … static or subtle motion.",
    "- Every @ImageK must match scenes[K-1].imageIndex.",
    "- HARD CUTS only — no morphing between scenes.",
    "",
    `Reference visual direction: ${input.analysis.visualDirection || "follow analyzed frames"}`,
    `Reference motion/pacing: ${input.analysis.motionSummary || "match reference reel"}`,
    "",
    "Analyzed reference reel frames:",
    frameBlock,
    "",
    input.product ? `User product: ${input.product}` : "",
    input.headline ? `Headline: ${input.headline}` : "",
    input.subline ? `Selling points: ${input.subline}` : "",
    input.offer ? `Offer/CTA: ${input.offer}` : "",
    input.promptExtra
      ? `Campaign notes (TOPIC/copy only — do NOT let Visual metaphor override Reference visual direction): ${input.promptExtra}`
      : "",
    `Target duration: ${input.durationSec}s.`,
    artStylePlannerHint(input.artStyleId),
  ]
    .filter(Boolean)
    .join("\n");
}

export type PlanReelStoryboardInput = {
  analysis: ResearchReelAnalysis;
  product: string;
  business?: string;
  headline?: string;
  subline?: string;
  offer?: string;
  promptExtra?: string;
  durationSec?: number;
  sceneCountTarget?: StoryboardSceneCount;
  market?: string;
  framing?: SubjectFraming;
  artStyleId?: ArtStyleId;
  referenceStrategyKind?: ReferenceStrategyKind;
  promotionMode?: "physical" | "concept";
};

/** @internal Exported for unit tests. */
export function buildReelStoryboardPlanPromptForTest(
  input: Parameters<typeof buildReelStoryboardPlanPrompt>[0],
): string {
  return buildReelStoryboardPlanPrompt(input);
}

/** Build a storyboard plan from analyzed reference-reel frames (content research path). */
export async function planVideoStoryboardFromReelAnalysis(
  input: PlanReelStoryboardInput,
): Promise<VideoStoryboardPlan> {
  const product = input.product?.trim() || "";
  if (!product) throw new Error("Product name is required for reel storyboard planning.");

  const durationSec = Math.min(
    15,
    Math.max(4, Number(input.durationSec) || 8),
  );
  const artStyleId = resolveArtStyleId(input.artStyleId);
  const layoutTransfer =
    input.referenceStrategyKind === "layout-transfer" ||
    isLayoutTransferReferenceExtra(input.promptExtra);
  const conceptMode = input.promotionMode === "concept";

  const outputText = await callDeepSeekChat(
    [
      {
        role: "system",
        content: conceptMode
          ? "You are a performance marketing storyboard director. Adapt a viral reference reel into a concept/message storyboard for Seedance multi-image reference-to-video. Output valid JSON only."
          : "You are a performance marketing storyboard director. Adapt a viral reference reel into a product storyboard for Seedance multi-image reference-to-video. Output valid JSON only.",
      },
      {
        role: "user",
        content: buildReelStoryboardPlanPrompt({
          analysis: input.analysis,
          product,
          business: input.business?.trim() || "",
          headline: input.headline?.trim() || "",
          subline: input.subline?.trim() || "",
          offer: input.offer?.trim() || "",
          promptExtra: input.promptExtra?.trim() || "",
          durationSec,
          sceneCountTarget: input.sceneCountTarget,
          market: input.market || "hk",
          framing: input.framing || "auto",
          layoutTransfer,
          artStyleId,
          conceptMode,
        }),
      },
    ],
    { temperature: 0.45, max_tokens: 4500, jsonObject: true },
  );

  const plan = normalizeStoryboardPlan(
    parseLlmJsonObject<Partial<VideoStoryboardPlan>>(outputText, "Reel storyboard plan"),
    durationSec,
    input.sceneCountTarget,
  );
  const topic =
    input.headline?.trim() ||
    input.product ||
    input.subline?.trim() ||
    "";
  return pinStoryboardPlanToReelAnalysis(plan, input.analysis, topic);
}
