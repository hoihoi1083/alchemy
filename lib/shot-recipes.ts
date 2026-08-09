/**
 * Shot recipes — Look stays in art-style; Recipe owns shot grammar + motion type.
 * Motion poster is a VIDEO recipe (1 still + micro-motion), not a storyboard path.
 */

export const TVC_SHOT_ROLES = [
  "establish",
  "macro",
  "logo-trace",
  "orbit",
  "lifestyle",
  "payoff",
] as const;

export type TvcShotRole = (typeof TVC_SHOT_ROLES)[number];

export function tvcShotJobLine(
  role: string | undefined,
  jobs: Partial<Record<string, string>>,
): string | undefined {
  const key = String(role ?? "").trim();
  const line = jobs[key]?.trim();
  return line || undefined;
}

/** Default storyboard scene count for product TVC (九宫格 review uses this). */
export const DEFAULT_STORYBOARD_SCENE_COUNT = 4;

export type ShotRecipeId =
  | "product-tvc-12s"
  | "motion-poster-loop"
  | "motion-poster-start-end";

export type ShotRecipe = {
  id: ShotRecipeId;
  /** Human label key hint */
  label: string;
  motionType: "stitch" | "single-i2v" | "start-end";
  defaultDurationSec: number;
  defaultSceneCount: number;
  roles: readonly TvcShotRole[];
  microMotions: readonly string[];
};

export const SHOT_RECIPES: Record<ShotRecipeId, ShotRecipe> = {
  "product-tvc-12s": {
    id: "product-tvc-12s",
    label: "Product TVC",
    motionType: "stitch",
    defaultDurationSec: 12,
    defaultSceneCount: DEFAULT_STORYBOARD_SCENE_COUNT,
    roles: ["establish", "macro", "logo-trace", "orbit", "lifestyle", "payoff"],
    microMotions: [],
  },
  "motion-poster-loop": {
    id: "motion-poster-loop",
    label: "Motion poster (loop)",
    motionType: "single-i2v",
    defaultDurationSec: 6,
    defaultSceneCount: 1,
    roles: ["establish"],
    microMotions: [
      "slow camera rotate around locked product",
      "subtle ambient particles or moss/light drift",
      "soft parallax on background only",
      "gentle light shimmer on product surface",
    ],
  },
  "motion-poster-start-end": {
    id: "motion-poster-start-end",
    label: "Motion poster (start→end)",
    motionType: "start-end",
    defaultDurationSec: 6,
    defaultSceneCount: 1,
    roles: ["establish", "payoff"],
    microMotions: [
      "morph environment from start frame to end frame",
      "product identity locked — only surroundings transform",
      "smooth continuous interpolate, no hard cut",
    ],
  },
};

export type StoryboardLookBible = {
  palette: string;
  lighting: string;
  materials: string;
  negatives: string;
};

export function emptyLookBible(): StoryboardLookBible {
  return { palette: "", lighting: "", materials: "", negatives: "" };
}

export function normalizeLookBible(
  raw: Partial<StoryboardLookBible> | string | null | undefined,
  visualDirectionFallback = "",
): StoryboardLookBible {
  if (raw && typeof raw === "object") {
    return {
      palette: String(raw.palette ?? "").trim(),
      lighting: String(raw.lighting ?? "").trim(),
      materials: String(raw.materials ?? "").trim(),
      negatives: String(raw.negatives ?? "").trim(),
    };
  }
  const vd = String(raw ?? visualDirectionFallback).trim();
  return {
    palette: "",
    lighting: vd,
    materials: "",
    negatives: "no plastic CG, no extra buttons, no morphing logo, no readable on-screen text",
  };
}

export function lookBibleSummaryLine(bible: StoryboardLookBible): string {
  const parts = [
    bible.palette && `Palette: ${bible.palette}`,
    bible.lighting && `Light: ${bible.lighting}`,
    bible.materials && `Materials: ${bible.materials}`,
    bible.negatives && `Avoid: ${bible.negatives}`,
  ].filter(Boolean);
  return parts.join(" · ");
}

/** Canonical TVC role order for a given scene count (hard-enforced on normalize). */
export function tvcRolesForSceneCount(sceneCount: number): TvcShotRole[] {
  const n = Math.max(1, Math.min(9, Math.floor(sceneCount) || 1));
  if (n === 1) return ["establish"];
  if (n === 2) return ["establish", "payoff"];
  if (n === 3) return ["establish", "macro", "payoff"];
  if (n === 4) return ["establish", "macro", "orbit", "payoff"];
  if (n === 5) return ["establish", "macro", "logo-trace", "orbit", "payoff"];
  if (n === 6) return ["establish", "macro", "logo-trace", "orbit", "lifestyle", "payoff"];
  // 7–9: pad with lifestyle / payoff repeats after the 6-beat spine
  const base: TvcShotRole[] = [
    "establish",
    "macro",
    "logo-trace",
    "orbit",
    "lifestyle",
    "payoff",
  ];
  while (base.length < n) {
    base.push(base.length % 2 === 0 ? "lifestyle" : "orbit");
  }
  return base.slice(0, n);
}

export function isTvcShotRole(value: string | null | undefined): value is TvcShotRole {
  return (TVC_SHOT_ROLES as readonly string[]).includes(String(value ?? "").trim());
}

/** UI label for a TVC role slug — falls back to the raw string if unknown. */
export function localizeTvcShotRole(
  role: string | undefined,
  labels: Partial<Record<TvcShotRole, string>>,
): string {
  const cleaned = String(role ?? "").trim();
  if (!cleaned) return "";
  if (isTvcShotRole(cleaned) && labels[cleaned]?.trim()) return labels[cleaned]!.trim();
  return cleaned;
}

/** Map free-form / padded roles onto the TVC vocabulary for this beat index. */
export function coerceTvcShotRole(
  raw: string | undefined,
  index0: number,
  sceneCount: number,
): TvcShotRole {
  const preferred = tvcRolesForSceneCount(sceneCount)[index0] ?? "establish";
  const cleaned = String(raw ?? "").trim().toLowerCase();
  if (isTvcShotRole(cleaned)) return cleaned;
  if (/establish|open|wide|hero|intro/.test(cleaned)) return "establish";
  if (/macro|detail|close|texture|logo.?macro/.test(cleaned)) return "macro";
  if (/logo|wordmark|badge|trace/.test(cleaned)) return "logo-trace";
  if (/orbit|turntable|spin|rotate/.test(cleaned)) return "orbit";
  if (/life|wear|use|hand|ugc|social/.test(cleaned)) return "lifestyle";
  if (/payoff|cta|end|close|final/.test(cleaned)) return "payoff";
  if (/^scene[-\s]?\d+$/i.test(cleaned)) return preferred;
  return preferred;
}

export function assignTvcRolesToScenes<T extends { role: string }>(scenes: T[]): T[] {
  const n = scenes.length;
  return scenes.map((s, i) => ({
    ...s,
    role: coerceTvcShotRole(s.role, i, n),
  }));
}

/** DeepSeek planner block — global look bible for every still + clip. */
export function storyboardLookBiblePlannerLines(): string[] {
  return [
    "lookBible (JSON object, mandatory — lock for ALL scenes):",
    '{"palette":"2-4 color words","lighting":"global key/fill/rim","materials":"product surface feel","negatives":"no plastic CG, no extra buttons, no morphing logo"}',
    "- Copy the SAME lookBible into every imagePrompt opening (palette + lighting + materials + negatives).",
    "- visualDirection may summarize lookBible in one sentence for the UI.",
  ];
}

/** DeepSeek planner block — TVC roles + lightingEn. */
export function storyboardTvcRolesPlannerLines(preferSceneCount: number): string[] {
  return [
    `Prefer EXACTLY ${preferSceneCount} scenes unless the user forced another count (九宫格 review defaults to ${preferSceneCount}).`,
    `Shot roles — use TVC grammar (not generic scene-1): ${TVC_SHOT_ROLES.join(", ")}.`,
    `Typical ${preferSceneCount}-beat order: establish → macro → logo-trace or orbit → lifestyle/payoff.`,
    "- lightingEn (required): English lighting for THIS beat only (e.g. soft side key, rim edge on logo, silhouette backlight).",
    "- cameraMotionEn (required): English camera for THIS beat — match the role, not a generic slow push-in for every scene.",
    "- role field MUST be one of the TVC roles above when possible.",
  ];
}

export type MotionPosterPromptInput = {
  product: string;
  headline?: string;
  durationSec: number;
  mode: "loop" | "start-end";
  /** Concept/service — lock scene mood, not SKU packaging. */
  conceptMode?: boolean;
};

/** Same identity for mode-switch + generate so Advanced leftovers cannot drift. */
export function resolveMotionPosterPromptIdentity(input: {
  product?: string;
  headline?: string;
  conceptIdea?: string;
  conceptMode?: boolean;
}): Pick<MotionPosterPromptInput, "product" | "headline" | "conceptMode"> {
  const conceptMode = Boolean(input.conceptMode);
  const product =
    (input.product ?? "").trim() ||
    (input.headline ?? "").trim() ||
    (input.conceptIdea ?? "").trim() ||
    (conceptMode ? "the service scene" : "product");
  const headline =
    (input.headline ?? "").trim() || (input.conceptIdea ?? "").trim() || undefined;
  return { product, headline, conceptMode };
}

/** Seedance I2V prompt for motion poster — subject locked, listed micro-motions only. */
export function buildMotionPosterPrompt(input: MotionPosterPromptInput): string {
  const product = input.product.trim() || (input.conceptMode ? "the service scene" : "the product");
  const claim = input.headline?.trim();
  const sec = Math.min(8, Math.max(4, Math.round(input.durationSec) || 6));
  const recipe =
    input.mode === "start-end"
      ? SHOT_RECIPES["motion-poster-start-end"]
      : SHOT_RECIPES["motion-poster-loop"];
  const concept = Boolean(input.conceptMode);

  const motionList = recipe.microMotions.map((m) => `- ${m}`).join("\n");

  if (concept) {
    return [
      `Motion poster, ${sec}s, 9:16. Single continuous micro-motion on a locked CONCEPT / SERVICE hero still.`,
      `@Image1 is the scene lock (room, hands, tools, atmosphere) — keep layout, subjects, and mood. Do not invent a product packshot catalog.`,
      claim
        ? `Claim/title only (service / idea / offer): ${claim}.`
        : `Campaign label (claim only): ${product}.`,
      input.mode === "start-end"
        ? "Start frame = @Image1 (or image_url); end frame = end_image_url. Interpolate light/atmosphere only — scene identity immutable."
        : "One keyframe image-to-video. Light/particles/camera may move; scene composition stays locked.",
      "Allowed micro-motions ONLY (pick 1–2):",
      motionList,
      "FORBIDDEN: second location, tutorial steps, HOOK→DEMO→CTA rewrite, fake SKU packaging hero, readable on-screen text, logos, watermarks, speech.",
      "Silent commercial loop energy — feel complete at the end.",
    ].join(" ");
  }

  return [
    `Motion poster, ${sec}s, 9:16. Single continuous micro-motion on a locked product hero.`,
    `@Image1 is the on-screen OBJECT — keep exact shape, colors, materials, logo geometry. Do not morph the product.`,
    claim
      ? `Claim/title only (do not change object): ${claim}.`
      : `Product label (claim only): ${product}.`,
    input.mode === "start-end"
      ? "Start frame = @Image1 (or image_url); end frame = end_image_url. Interpolate environment/mood only — product identity immutable."
      : "One keyframe image-to-video. Environment/particles/camera may move; product stays locked.",
    "Allowed micro-motions ONLY (pick 1–2):",
    motionList,
    "FORBIDDEN: second location, tutorial steps, HOOK→DEMO→CTA rewrite, new props that change the SKU, readable on-screen text, logos, watermarks, speech.",
    "Silent commercial loop energy — feel complete at the end.",
  ].join(" ");
}
