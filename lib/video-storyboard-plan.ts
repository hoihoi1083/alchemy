import type { BrandProfile } from "@/lib/brand-profile";
import { brandProfilePromptBlock } from "@/lib/brand-profile";
import { callDeepSeekChat } from "@/lib/deepseek-client";
import {
  coerceCopyScript,
  plannerCopyLanguageRule,
  resolveCopyLocale,
  rewriteCopyToScript,
} from "@/lib/copy-locale";
import type { PromptMarket } from "@/lib/prompt-variables";
import { isContentResearchStyleExtra } from "@/lib/content-research-promote";
import { isLayoutTransferReferenceExtra } from "@/lib/user-reference-brief";
import type { ReferenceStrategyKind } from "@/lib/reference-strategy";
import { parseLlmJsonObject } from "@/lib/parse-llm-json";
import { productIdentityContractLines } from "@/lib/prompt-balance-contract";
import { isStoryboardStructureLabel } from "@/lib/prompt-variables";
import type { ResearchReelAnalysis } from "@/lib/reel-analysis-types";
import { pinStoryboardPlanToReelAnalysis } from "@/lib/reel-reference-brief";
import type { SubjectFraming } from "@/lib/prompt-variables";
import type { StoryboardSceneCount } from "@/lib/ad-pack-preferences";
import { artStylePlannerHint, resolveArtStyleId, type ArtStyleId } from "@/lib/art-style";
import type {
  StoryboardScenePlan,
  VideoStoryboardPlan,
} from "@/lib/video-storyboard-types";
import {
  MAX_STORYBOARD_SCENES,
  MIN_STORYBOARD_SCENES,
} from "@/lib/video-storyboard-types";
import { parseSceneMotionHintsFromPlan } from "@/lib/kling-motion-from-plan";
import { seedanceSafePlannerRules, softenStoryboardStillPromptForModeration } from "@/lib/seedance-moderation";
import type { ImageTextMode } from "@/lib/image-text-mode";
import { videoDurationPlannerBlock } from "@/lib/video-duration-planner";
import {
  DEFAULT_STORYBOARD_SCENE_COUNT,
  assignTvcRolesToScenes,
  coerceTvcShotRole,
  normalizeLookBible,
  storyboardLookBiblePlannerLines,
  storyboardTvcRolesPlannerLines,
  tvcRolesForSceneCount,
} from "@/lib/shot-recipes";
import {
  effectiveStoryboardSceneCount,
  resolveStoryboardRecipeId,
  storyboardRecipeForbidsReference,
  storyboardRecipePlannerLines,
  type StoryboardRecipeId,
} from "@/lib/storyboard-recipes";

function sceneCountForDuration(durationSec: number): { min: number; max: number } {
  // Prefer 4-beat TVC (九宫格 review) for typical Reel lengths.
  if (durationSec <= 6) return { min: 3, max: 4 };
  if (durationSec <= 10) return { min: 4, max: 5 };
  return { min: 4, max: 6 };
}

function finishMotionPlanPrompt(prompt: string): string {
  const p = prompt.trim();
  if (!/textless|no on-screen text/i.test(p)) {
    return `${p}\n\nRules: Textless video frames — captions burn later via /captions. English camera motion only per scene. Hard cuts between clips (no morph).`;
  }
  return p;
}

function ensureMotionPlanCoversScenes(
  motionPlan: string,
  scenes: StoryboardScenePlan[],
): string {
  let prompt = motionPlan.trim();
  if (!prompt) return prompt;

  for (let i = 1; i <= scenes.length; i++) {
    if (new RegExp(`Scene\\s*${i}\\b`, "i").test(prompt)) continue;
    const scene = scenes[i - 1];
    const role = scene.role?.trim() || `scene ${i}`;
    const start = Number.isFinite(scene.startSec) ? scene.startSec : i - 1;
    const end = Number.isFinite(scene.endSec) ? scene.endSec : i;
    prompt = `${prompt}\nScene ${i} [${start}-${end}s]: ${role} — subtle camera motion matching role; textless frame.`;
  }
  return prompt;
}

function normalizeScene(raw: Partial<StoryboardScenePlan>, fallbackIndex: number): StoryboardScenePlan {
  return {
    imageIndex: Math.max(1, Number(raw.imageIndex) || fallbackIndex),
    role: String(raw.role ?? "").trim() || `scene-${fallbackIndex}`,
    startSec: Math.max(0, Number(raw.startSec) || 0),
    endSec: Math.max(1, Number(raw.endSec) || 1),
    sceneDescriptionZh: String(raw.sceneDescriptionZh ?? raw.role ?? "").trim(),
    onImageCopyZh: String(raw.onImageCopyZh ?? "").trim() || undefined,
    imagePrompt: softenStoryboardStillPromptForModeration(String(raw.imagePrompt ?? "").trim()),
    cameraMotionEn: String(raw.cameraMotionEn ?? "").trim() || undefined,
    lightingEn: String(raw.lightingEn ?? "").trim() || undefined,
    productPlacementZh: String(raw.productPlacementZh ?? "").trim() || undefined,
    punchLineZh: String(raw.punchLineZh ?? "").trim() || undefined,
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
  const roles = tvcRolesForSceneCount(n);
  while (padded.length < n) {
    const i = padded.length;
    const last = padded[padded.length - 1];
    padded.push({
      imageIndex: i + 1,
      role: roles[i] ?? coerceTvcShotRole(undefined, i, n),
      startSec: i * span,
      endSec: (i + 1) * span,
      sceneDescriptionZh: last?.sceneDescriptionZh ?? `場景 ${i + 1}`,
      onImageCopyZh: last?.onImageCopyZh ?? last?.sceneDescriptionZh ?? `場景 ${i + 1}`,
      imagePrompt: last?.imagePrompt ?? "Product hero still, photorealistic 9:16.",
      lightingEn: last?.lightingEn,
      cameraMotionEn: last?.cameraMotionEn,
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
  scenes = assignTvcRolesToScenes(scenes);

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

  let seedancePrompt = String(parsed.seedancePrompt ?? "").trim();
  if (!seedancePrompt) {
    throw new Error("AI planning returned an empty video prompt.");
  }
  // Keep field name seedancePrompt for API compat; content is H3/Kling motion plan notes.
  // Pad missing Scene N lines when scene_count forces more scenes.
  seedancePrompt = ensureMotionPlanCoversScenes(seedancePrompt, scenes);

  // Backfill cameraMotionEn from Scene N blocks when the model omitted the field.
  const hints = parseSceneMotionHintsFromPlan(seedancePrompt);
  scenes = scenes.map((s) =>
    s.cameraMotionEn
      ? s
      : { ...s, cameraMotionEn: hints.get(s.imageIndex) || s.cameraMotionEn },
  );

  return {
    title: String(parsed.title ?? "").trim() || "Product story reel",
    theme: String(parsed.theme ?? "").trim(),
    visualDirection: String(parsed.visualDirection ?? "").trim(),
    lookBible: normalizeLookBible(
      (parsed as { lookBible?: Parameters<typeof normalizeLookBible>[0] }).lookBible,
      String(parsed.visualDirection ?? "").trim(),
    ),
    totalDurationSec: Math.max(
      durationSec,
      Number(parsed.totalDurationSec) || durationSec,
    ),
    scenes,
    seedancePrompt: finishMotionPlanPrompt(seedancePrompt),
    productionNotes: String(parsed.productionNotes ?? "").trim(),
  };
}

function endCardLogoPlannerRules(useBrandLogo?: boolean): string[] {
  if (useBrandLogo) {
    return [
      "BRAND LOGO (user opted in — real logo composited after stills via Mode A):",
      "- Do NOT invent logos or wordmarks in any imagePrompt — the Brand kit PNG is added in a second pass.",
      "- EVERY scene (including the last) is a normal product/story beat — never plan a blank end-card or logo-hero last frame.",
      "- Leave a little clear margin somewhere in each still so a small logo can sit cleanly (placement is chosen later).",
    ];
  }
  return [
    "BRAND LOGO: user did NOT opt in. Never invent brand logos, wordmarks, or Alchemy AI Lab marks in imagePrompt or sceneDescriptionZh. Stills stay textless.",
  ];
}

function storyboardTypePlannerLines(
  integrated: boolean,
  copyRule: string,
): string[] {
  if (integrated) {
    return [
      "- imagePrompt: English 9:16 still. MUST render exact readable on-image headline/CTA for THIS scene — same words as onImageCopyZh. Integrated typography in the art, not a white flyer or production label. Open with lookBible echo.",
      `- onImageCopyZh: exact consumer words printed on the still (optional captions later). ${copyRule}`,
      "- sceneDescriptionZh: one line for the user UI — same language as onImageCopyZh.",
      "- Do NOT leave the still textless when on-image type is requested.",
    ];
  }
  return [
    "- imagePrompt: English 9:16 still. NEVER describe on-image text, titles, captions, logos, or slogans (stills are textless; captions burn after video). Open with lookBible echo.",
    `- onImageCopyZh (burned caption after video) AND sceneDescriptionZh (UI note): ${copyRule}`,
    "- sceneDescriptionZh: one line for the user UI — same language as onImageCopyZh.",
    "- Do NOT put marketing headlines into imagePrompt — those belong only in onImageCopyZh for caption burn.",
  ];
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
  conceptMode?: boolean;
  useBrandLogo?: boolean;
  imageTextMode?: ImageTextMode;
  storyboardRecipeId?: StoryboardRecipeId;
}): string {
  const recipeId = resolveStoryboardRecipeId(input.storyboardRecipeId);
  const forbidRef = storyboardRecipeForbidsReference(recipeId);
  const effectiveCount = effectiveStoryboardSceneCount(
    recipeId,
    input.sceneCountTarget ?? "auto",
  );
  const recipeLines = storyboardRecipePlannerLines(
    recipeId,
    Boolean(input.conceptMode),
    effectiveCount,
  );
  const { min, max } = sceneCountForDuration(input.durationSec);
  const sceneCountLine =
    effectiveCount !== "auto"
      ? `Scene count: EXACTLY ${effectiveCount} scenes for ~${input.durationSec}s total.`
      : `Scene count: prefer EXACTLY ${DEFAULT_STORYBOARD_SCENE_COUNT} scenes for ~${input.durationSec}s (allowed ${min}–${max}). Max ${MAX_STORYBOARD_SCENES} images.`;
  const sceneJsonShape =
    '{"imageIndex":1,"role":"establish","startSec":0,"endSec":2,"sceneDescriptionZh":"","onImageCopyZh":"","imagePrompt":"","cameraMotionEn":"","lightingEn":"","productPlacementZh":"","punchLineZh":""}';
  const planJsonShape = `{"title":"","theme":"","visualDirection":"","lookBible":{"palette":"","lighting":"","materials":"","negatives":""},"totalDurationSec":0,"scenes":[${sceneJsonShape}],"seedancePrompt":"","productionNotes":""}`;
  const bibleAndRoles = [
    ...storyboardLookBiblePlannerLines(),
    ...storyboardTvcRolesPlannerLines(
      effectiveCount !== "auto"
        ? Number(effectiveCount)
        : DEFAULT_STORYBOARD_SCENE_COUNT,
    ),
    ...recipeLines,
  ];
  const brandBlock = input.brandProfile?.businessName
    ? brandProfilePromptBlock(input.brandProfile)
    : "";

  const artStyleId = resolveArtStyleId(input.artStyleId);
  const artHint = artStylePlannerHint(artStyleId);
  const conceptMode = Boolean(input.conceptMode);
  const layoutTransferRef =
    !forbidRef &&
    !conceptMode &&
    (input.referenceStrategyKind === "layout-transfer" ||
      isLayoutTransferReferenceExtra(input.promptExtra));
  const contentResearchRef =
    !forbidRef && isContentResearchStyleExtra(input.promptExtra);

  if (conceptMode) {
    return [
      `Plan a ${artStyleId === "realistic" ? "photorealistic" : "stylized"} CONCEPT VIDEO STORYBOARD (service / idea short — product photo optional) for per-still clips then stitch.`,
      "Return ONE JSON object only — no markdown fences.",
      "",
      "Required JSON shape:",
      planJsonShape,
      "",
      "CONCEPT ADAPTATION:",
      `- Campaign topic: ${input.product}.`,
      "- Scenes show the SERVICE / EXPERIENCE / IDEA — atmosphere, hands, tools, room, silhouette — not a SKU product catalog.",
      "- If the user brief asks for extreme face close-ups or mask-on-skin macros: use tasteful MID-SHOTS of guest + therapist instead (faces OK soft/partial).",
      "- Spa facial demo scenes MAY show people (guest + therapist) — do not plan empty rooms for 'treatment in progress' beats.",
      "",
      ...productIdentityContractLines({ conceptMode: true }),
      "",
      ...seedanceSafePlannerRules().map((line) =>
        line.includes("NO photorealistic human faces")
          ? "Prefer tasteful mid-shots; avoid extreme photoreal face fill-frame / skin macros that fail content filters. Soft faces OK for spa beauty ads."
          : line,
      ),
      "",
      sceneCountLine,
      ...bibleAndRoles,
      "- Each scene gets ONE still (imageIndex 1…N in timeline order).",
      ...storyboardTypePlannerLines(
        input.imageTextMode === "integrated",
        plannerCopyLanguageRule(resolveCopyLocale((input.market as PromptMarket) || "hk")),
      ),
      "- cameraMotionEn: English camera motion ONLY for this scene — no Chinese, no prices, no on-screen text.",
      "- lightingEn: English lighting ONLY for this scene.",
      "- productPlacementZh: where the product/concept sits in frame (market language).",
      "- punchLineZh: optional spoken/caption line for this beat (burn later via /captions).",
      "",
      ...endCardLogoPlannerRules(input.useBrandLogo),
      "",
      "seedancePrompt (English — per-scene motion plan notes; JSON key kept for API compat):",
      `- Opening line: 9:16 concept short for this campaign (~${input.durationSec}s). Runtime animates EACH still then stitches.`,
      "- One block per scene: Scene N [start-end s]: <role> — English camera motion only (push-in, orbit, handheld drift).",
      "- Do NOT use @Image / hard-cut reference-video grammar — stitch never sees that blob as marketing copy.",
      input.imageTextMode === "integrated"
        ? "- Keep still typography in motion notes; do not invent new on-screen text, prices, or discounts."
        : "- NO on-screen text, prices, or discounts in motion notes (captions burn later via /captions).",
      input.offer
        ? `- User offer (may appear in CTA caption only): ${input.offer}`
        : "- User did NOT provide pricing — do NOT invent prices or discount % in prompts.",
      "",
      "productionNotes: brief user note — expect stitched multi-clip token cost.",
      "",
      `Target duration: ${input.durationSec} seconds.`,
      ...videoDurationPlannerBlock(input.durationSec, { storyboardTvc: true }),
      artHint,
      input.styleHint ? `Visual mood hint: ${input.styleHint}` : "",
      input.promptExtra ? `Style / reference notes: ${input.promptExtra}` : "",
      input.storyboardBrief ? `User story request: ${input.storyboardBrief}` : "",
      input.headline ? `Headline: ${input.headline}` : "",
      input.subline ? `Selling points: ${input.subline}` : "",
      brandBlock,
    ]
      .filter(Boolean)
      .join("\n");
  }

  const layoutTransferRules = layoutTransferRef
    ? [
        "LAYOUT TRANSFER (reference ad + user product photo):",
        "- Every scene still uses the SAME ad design grammar as IMAGE 1 — same layout family (text band positions, hero placement, graphic components, typography hierarchy, staging pose type).",
        "- visualDirection MUST describe reference layout grid, palette, and typography bands from the USER REFERENCE block — not a generic natural-light product reel.",
        "- Do NOT plan a stock product-photography sequence (macro → wrist → flat lay) unless IMAGE 1 is clearly that style.",
        "- Scene 1 = opening hook in reference cover layout; middle scenes = same template shell with new copy/angle; final scene = CTA/recap band matching reference style.",
        "- imagePrompt per scene: English still for dual-image edit — IMAGE 1 = product hero, IMAGE 2 = layout shell; keep IMAGE 2 LAYER A layout, IMAGE 1 product as hero, scene-specific action within that shell.",
        "- All on-image copy promotes the user's product only — never zodiac/星座 hooks or wording from the reference post.",
      ]
    : [];

  const productAdaptationBlock =     layoutTransferRef
    ? [
        "PRODUCT ADAPTATION (layout-transfer):",
        "- IMAGE 1 = user product hero (pixels). IMAGE 2 = layout shell only.",
        "- Match how IMAGE 2 stages the hero (hands, wrist, flat lay, centered hero) — swap in the IMAGE 1 object. Do not infer SKU from the product name.",
        "- Scene variety comes from copy and subtle angle changes inside the SAME ad template, not unrelated compositions.",
      ]
    : [
        "PRODUCT ADAPTATION (critical):",
        "- You do NOT see IMAGE 1 pixels. Never guess SKU from the product NAME, headline, or research topic.",
        "- Every imagePrompt must stage the exact object visible in IMAGE 1 — camera, lighting, and context only. Do not rename the object into a different product type.",
        "- Name / headline / research = CLAIM + tone for captions. They must not introduce a substitute hero item.",
        "- Scene variety = angle, lighting, scale, and setting AROUND IMAGE 1 — not a new SKU.",
      ];

  return [
    layoutTransferRef
      ? "Plan a reference-layout VIDEO STORYBOARD: same ad design family as IMAGE 1 on every still, user's product and copy — per-still clips then stitch (captions via /captions)."
      : `Plan a ${artStyleId === "realistic" ? "photorealistic" : "stylized"} product VIDEO STORYBOARD for per-still clips then stitch (not one continuous reference-reel call).`,
    "Return ONE JSON object only — no markdown fences.",
    "",
    "Required JSON shape:",
    planJsonShape,
    "",
    ...productAdaptationBlock,
    "",
    ...productIdentityContractLines({ hasReferenceVideo: false }),
    "",
    ...layoutTransferRules,
    ...(layoutTransferRules.length ? [""] : []),
    ...bibleAndRoles,
    sceneCountLine,
    "- Each scene gets ONE still (imageIndex 1…N in timeline order).",
    ...(layoutTransferRef
      ? [
          "- Dual-image edit: IMAGE 1 product hero identity, IMAGE 2 layout shell, subject upright (head at top).",
        ]
      : [
          "- Image edit from user's product photo — 9:16 still matching lookBible, subject upright (head at top).",
        ]),
    ...storyboardTypePlannerLines(
      input.imageTextMode === "integrated",
      plannerCopyLanguageRule(resolveCopyLocale((input.market as PromptMarket) || "hk")),
    ),
    "- onImageCopyZh: consumer headline/CTA for THIS scene only. NEVER use production labels: 開場亮點, 行動呼籲, 中段, arrows (→), or storyboard role names.",
      "- cameraMotionEn: English camera motion ONLY for this scene — match TVC role, not a generic slow push-in for every beat.",
      "- lightingEn: English lighting ONLY for this scene (side key, rim, backlight, etc.).",
      "- productPlacementZh: where the product/concept sits in frame (market language).",
      "- punchLineZh: optional spoken/caption line for this beat (burn later via /captions).",
    "- Phone/laptop/tablet scenes: describe blank or abstract UI chrome only — never invent readable Chinese/English on screens (it becomes gibberish).",
    "",
    ...endCardLogoPlannerRules(input.useBrandLogo),
    "",
    "seedancePrompt (English — per-scene motion plan notes; JSON key kept for API compat):",
    `- Opening line: 9:16 commercial for the IMAGE 1 object; echo lookBible lighting/palette.`,
    "- One block per scene: Scene N [start-end s]: <role> — English camera + lighting for that beat.",
    "- Do NOT use @Image / hard-cut reference-video grammar — runtime is per-still clip then stitch.",
    "- People only when IMAGE 1 staging needs hands/lifestyle; never invent a different SKU; no celebrity faces; hands-only OK.",
    input.imageTextMode === "integrated"
      ? "- Keep still typography in motion notes; do not invent new on-screen text, prices, or discounts."
      : "- NO on-screen text, prices, or discounts in motion notes (captions burn later via /captions).",
    input.offer
      ? `- User offer (may appear in CTA caption only): ${input.offer}`
      : "- User did NOT provide pricing — do NOT invent prices or discount % in prompts.",
    "",
    "productionNotes: brief user note in 繁體中文 (HK) or English — expect stitched multi-clip tokens.",
    "",
    `Target duration: ${input.durationSec} seconds.`,
    ...videoDurationPlannerBlock(input.durationSec, { storyboardTvc: true }),
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
  /** Concept / service short — no product photo required; different planner rules. */
  conceptMode?: boolean;
  /** User opted into Brand kit logo stamps on storyboard stills. */
  useBrandLogo?: boolean;
  /** Default textless; integrated bakes onImageCopyZh into each still. */
  imageTextMode?: ImageTextMode;
  /** classic-tvc (default) or luxury-birth (locked 3-beat, no reference). */
  storyboardRecipeId?: StoryboardRecipeId;
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
  const conceptMode = Boolean(input.conceptMode);
  const recipeId = resolveStoryboardRecipeId(input.storyboardRecipeId);
  const sceneCountTarget = effectiveStoryboardSceneCount(
    recipeId,
    input.sceneCountTarget ?? "auto",
  );
  const layoutTransfer =
    !storyboardRecipeForbidsReference(recipeId) &&
    !conceptMode &&
    (input.referenceStrategyKind === "layout-transfer" ||
      isLayoutTransferReferenceExtra(input.promptExtra));

  const systemContent =
    recipeId === "luxury-birth"
      ? conceptMode
        ? "You are a luxury 3-beat CONCEPT birth storyboard director. Output valid JSON only. Arc: abstract mood → metaphor → service payoff. No fake SKU. No reference-reel matching."
        : "You are a luxury 3-beat PRODUCT birth storyboard director. Output valid JSON only. Arc: abstract mood → metaphor → product reveal from IMAGE 1. No Social drip. No reference-reel matching."
      : conceptMode
        ? "You are a concept/service video storyboard director for SMB Reels. Output valid JSON only. Prefer hands, rooms, props, and silhouettes — avoid extreme photoreal face close-ups that fail content filters."
        : layoutTransfer
          ? "You are a layout-transfer video storyboard director for HK/TW/CN SMB Reels. Output valid JSON only. Every scene still must share the same ad design grammar as the user's reference — not a generic product photo reel."
          : stylized
            ? "You are a stylized product video storyboard director for HK/TW/CN SMB Reels. Output valid JSON only. Match the user's art direction in every scene still."
            : "You are a photorealistic product video storyboard director for HK/TW/CN SMB Reels. Output valid JSON only. Adapt every scene to the IMAGE 1 object — never invent a SKU from the product name.";

  const outputText = await callDeepSeekChat(
    [
      {
        role: "system",
        content: systemContent,
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
          sceneCountTarget,
          market: input.market || "hk",
          framing: input.framing || "auto",
          brandProfile: input.brandProfile,
          styleHint: input.styleHint?.trim() || "",
          promptExtra: input.promptExtra?.trim() || "",
          artStyleId,
          referenceStrategyKind: storyboardRecipeForbidsReference(recipeId)
            ? undefined
            : input.referenceStrategyKind,
          conceptMode,
          useBrandLogo: input.useBrandLogo,
          imageTextMode: input.imageTextMode,
          storyboardRecipeId: recipeId,
        }),
      },
    ],
    { temperature: 0.5, max_tokens: 4000, jsonObject: true },
  );

  const plan = normalizeStoryboardPlan(
    parseLlmJsonObject<Partial<VideoStoryboardPlan>>(outputText, "Video storyboard plan"),
    durationSec,
    sceneCountTarget,
  );

  return alignStoryboardPlanCopyLanguage(plan, (input.market as PromptMarket) || "hk");
}

async function alignStoryboardPlanCopyLanguage(
  plan: VideoStoryboardPlan,
  market: PromptMarket,
): Promise<VideoStoryboardPlan> {
  const locale = resolveCopyLocale(market);
  const fields: Record<string, string> = {};
  plan.scenes.forEach((s, i) => {
    if (s.onImageCopyZh?.trim()) fields[`s${i}.copy`] = s.onImageCopyZh;
    if (s.sceneDescriptionZh?.trim()) fields[`s${i}.desc`] = s.sceneDescriptionZh;
  });
  if (!Object.keys(fields).length) return plan;
  const rewritten = await rewriteCopyToScript(fields, locale);
  return {
    ...plan,
    scenes: plan.scenes.map((s, i) => ({
      ...s,
      onImageCopyZh:
        coerceCopyScript(rewritten[`s${i}.copy`] ?? s.onImageCopyZh ?? "", locale).trim() ||
        s.onImageCopyZh,
      sceneDescriptionZh:
        coerceCopyScript(rewritten[`s${i}.desc`] ?? s.sceneDescriptionZh ?? "", locale).trim() ||
        s.sceneDescriptionZh,
    })),
  };
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
  useBrandLogo?: boolean;
  imageTextMode?: ImageTextMode;
}): string {
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
        "LAYOUT TRANSFER: IMAGE 1 = user product hero; IMAGE 2 = style/layout shell from research cover.",
        "- Each scene imagePrompt: dual-image edit — keep IMAGE 1 product identity; borrow IMAGE 2 ad layout family.",
      ]
    : input.conceptMode
      ? [
          "- visualDirection JSON field: echo Reference visual direction above (render medium, palette, meme/cinematic energy) — locked aesthetic for ALL scenes.",
          "- theme JSON field: user's campaign message/topic ONLY — never the reference post topic.",
          "- imagePrompt: English 9:16 still. MATCH reference reel visual style family and layout grammar for this beat; REPLACE hero subject and props with imagery for the USER topic.",
          "- Do NOT default to generic photorealistic RedNote lifestyle if reference is cartoon/3D/meme/illustrated.",
        ]
      : input.imageTextMode === "integrated"
        ? [
            "- imagePrompt: English still from user's product photo — 9:16, photorealistic. MUST render exact on-image headline/CTA matching onImageCopyZh.",
          ]
        : [
            "- imagePrompt: English still from user's product photo — 9:16, photorealistic, no readable text.",
          ];

  const adaptLine = input.conceptMode
    ? "Plan a VIDEO STORYBOARD that mirrors the REFERENCE REEL structure below, adapted for the user's concept/message short."
    : "Plan a VIDEO STORYBOARD that mirrors the REFERENCE REEL structure below, adapted for the user's product.";

  const heroLine = input.conceptMode
    ? "- Scene CONTENT (what is promoted, on-image copy) = user's headline/concept — reference post topic is irrelevant."
    : "- All hero content = the exact object in IMAGE 1 (uploaded photo). Name is claim only.";

  const seedanceLead = input.conceptMode
    ? `- 9:16 concept short, ~${input.durationSec}s total.`
    : `- 9:16 product commercial, ~${input.durationSec}s total.`;

  const preferCount =
    input.sceneCountTarget && input.sceneCountTarget !== "auto"
      ? Number(input.sceneCountTarget)
      : DEFAULT_STORYBOARD_SCENE_COUNT;

  const sceneJsonShape =
    '{"imageIndex":1,"role":"establish","startSec":0,"endSec":2,"sceneDescriptionZh":"","onImageCopyZh":"","imagePrompt":"","cameraMotionEn":"","lightingEn":"","productPlacementZh":"","punchLineZh":""}';
  const planJsonShape = `{"title":"","theme":"","visualDirection":"","lookBible":{"palette":"","lighting":"","materials":"","negatives":""},"totalDurationSec":0,"scenes":[${sceneJsonShape}],"seedancePrompt":"","productionNotes":""}`;

  return [
    adaptLine,
    "Return ONE JSON object only — no markdown fences.",
    "",
    planJsonShape,
    "",
    "Rules:",
    "- Map reference shot beats to storyboard scenes in timeline order (opening → mid → close from the reference — do NOT invent a new HOOK→DEMO→CTA plot).",
    "- Match reference pacing, cut rhythm, camera language, and VISUAL STYLE FAMILY — NOT reference faces, brands, unrelated topics, or on-video text.",
    "- visualDirection in JSON must describe the REFERENCE reel look (from Reference visual direction above), not a generic stock aesthetic.",
    ...storyboardLookBiblePlannerLines(),
    "- lookBible should echo Reference visual direction (palette/light/materials) — grade lock for ALL stills; do not invent a new medium.",
    ...storyboardTvcRolesPlannerLines(preferCount),
    heroLine,
    input.conceptMode
      ? ""
      : "- Never infer SKU from the product name — stage IMAGE 1's object in every scene.",
    sceneCountLine,
    "- Each scene = ONE still (imageIndex 1…N).",
    ...layoutRules,
    ...storyboardTypePlannerLines(
      input.imageTextMode === "integrated",
      plannerCopyLanguageRule(resolveCopyLocale((input.market as PromptMarket) || "hk")),
    ),
    "- sceneDescriptionZh: one line for the user UI — same language as onImageCopyZh.",
    "- cameraMotionEn: English camera motion ONLY for this scene — echo the reference beat's camera, not a generic slow push-in.",
    "- lightingEn: English lighting ONLY for this scene (side key, rim, backlight, etc.).",
    "- productPlacementZh: where the product/concept sits in frame (market language).",
    "- punchLineZh: optional spoken/caption line for this beat (burn later via /captions).",
    `- onImageCopyZh: consumer ad copy for THIS scene. ${plannerCopyLanguageRule(resolveCopyLocale((input.market as PromptMarket) || "hk"))} Real headline/CTA only — NEVER 開場亮點, 行動呼籲, → arrows, or role names.`,
    "",
    ...productIdentityContractLines({
      hasReferenceVideo: true,
      conceptMode: Boolean(input.conceptMode),
    }),
    "",
    ...endCardLogoPlannerRules(input.useBrandLogo),
    "",
    "seedancePrompt (English — motion plan notes for single-clip first, stitched fallback; JSON key kept for API compat):",
    seedanceLead,
    "- One block per scene: Scene N [start-end s]: <role> — English camera + lighting for that beat.",
    "- Do NOT use @Image / hard-cut reference-video grammar — runtime prefers one continuous clip from all stills, else per-still clips then stitch.",
    input.imageTextMode === "integrated"
      ? "- Keep planned on-image type on stills; motion must not rewrite letters or invent new slogans."
      : "- Textless frames; captions burn later via /captions.",
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
    ...videoDurationPlannerBlock(input.durationSec, { hasReferenceVideo: true }),
    // Look follows the reference reel — do not inject a conflicting art-style plot.
    "Look/grade: match Reference visual direction + lookBible; do not invent a new art medium.",
    "productionNotes: expect single-clip (preferred) or stitched multi-clip cost; match reference pacing without cloning topic.",
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
  useBrandLogo?: boolean;
  imageTextMode?: ImageTextMode;
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
          ? `You are a performance marketing storyboard director. Adapt a viral reference reel into a concept/message storyboard for single-clip video (preferred) or per-still clips then stitch (${input.imageTextMode === "integrated" ? "on-image type on stills" : "textless frames; captions via /captions"}). Output valid JSON only.`
          : `You are a performance marketing storyboard director. Adapt a viral reference reel into a product storyboard for single-clip video (preferred) or per-still clips then stitch (${input.imageTextMode === "integrated" ? "on-image type on stills" : "textless frames; captions via /captions"}). Output valid JSON only.`,
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
          useBrandLogo: input.useBrandLogo,
          imageTextMode: input.imageTextMode,
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
