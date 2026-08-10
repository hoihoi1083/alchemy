/**
 * Shot recipes — Look stays in art-style; Recipe owns shot grammar + motion type.
 * Motion poster = 1 designed poster still (with type) + micro graphic motion — not 九宫格.
 */

import { MOTION_POSTER_DIALECTS, type MotionPosterDialectId } from "@/lib/motion-poster-dialects";

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
      "3D paper/card warp: the whole poster (product + type) rides the same surface",
      "headline letters fade in or slide into their layout positions in the first 1–2s",
      "type tracks the card — never a floating title bar that ignores the warp",
      "soft light sweep / sparkle on the poster surface after type has landed",
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
      "即梦 首尾帧: interpolate Image 1 (textless start) into Image 2 (typed end poster)",
      "camera + hero must visibly travel (push-in, orbit, or product turn) — not a freeze",
      "on-screen type blooms/slides into Image 2 masthead pixels — no invented letters",
      "smooth continuous interpolate, no hard cut, no second location",
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
  /** Resolved dialect — wizard always passes one; default card-warp for tests. */
  dialect?: MotionPosterDialectId;
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

/** Seedance I2V prompt for motion poster — subject locked, dialect micro-motions only. */
export function buildMotionPosterPrompt(input: MotionPosterPromptInput): string {
  const product = input.product.trim() || (input.conceptMode ? "the service scene" : "the product");
  const claim = input.headline?.trim();
  const sec = Math.min(8, Math.max(4, Math.round(input.durationSec) || 6));
  const dialect = MOTION_POSTER_DIALECTS[input.dialect ?? "card-warp"];
  const concept = Boolean(input.conceptMode);
  const startEnd =
    input.mode === "start-end" ? SHOT_RECIPES["motion-poster-start-end"].microMotions : [];
  const dialectMotions =
    concept && dialect.microMotionsConcept ? dialect.microMotionsConcept : dialect.microMotions;
  const motionList = [...startEnd, ...dialectMotions].map((m) => `- ${m}`).join("\n");

  const heroMotionRule =
    "HERO MOTION REQUIRED (visible in the first 2 seconds): the main subject must clearly turn, float, settle, or the camera must push/orbit so the silhouette changes. Frozen still + only smoke/bokeh is a FAIL.";
  const startEndType =
    "即梦 3.0 首尾帧: Image 1 = textless START poster. Image 2 = finished END poster with the exact headline already painted as a large masthead. ONE continuous interpolate Image 1 → Image 2. Type must bloom/slide into Image 2 pixels only — do not invent different letters or gibberish.";

  if (concept) {
    return [
      `Designed motion poster (動態海報), CONCEPT / SERVICE, ${sec}s, 9:16. Dialect: ${dialect.id}. Scene: ${product}. Not a live-action TVC.`,
      input.mode === "start-end"
        ? `@Image1 is the textless start plate. End frame is Image 2 (typed poster). ${startEndType}`
        : `@Image1 is the textless poster scene plate. Keep the same subjects and mood. Do not invent on-screen text.`,
      claim && input.mode !== "start-end"
        ? `Campaign claim (NOT on-screen — overlay later): ${claim}.`
        : claim
          ? `Campaign claim on Image 2 masthead (match those exact characters): ${claim}.`
          : "",
      input.mode === "start-end"
        ? `Start frame = @Image1; end frame = end_image_url. ${dialect.endBeatConcept} Interpolate camera + subject + type appearing.`
        : dialect.videoLeadConcept,
      input.mode === "start-end" ? "" : dialect.kineticTypeLine,
      heroMotionRule,
      "Dialect motions (do these, visibly):",
      motionList,
      "FORBIDDEN: freeze-frame, second location, tutorial steps, HOOK→DEMO→CTA rewrite, fake SKU packaging hero, new gibberish text, fake logos, watermarks, speech.",
      "Silent commercial loop energy — feel complete at the end.",
    ].join(" ");
  }

  return [
    `Designed motion poster (動態海報), ${sec}s, 9:16. Dialect: ${dialect.id}. Hero: ${product}. Not a live-action TVC.`,
    input.mode === "start-end"
      ? `@Image1 is the textless start plate (same SKU). Image 2 is the typed end poster. ${startEndType} Product MAY rotate or resettle.`
      : `@Image1 is the textless poster scene plate: same product identity (shape, cap, color). The product MAY rotate, tilt, or float — do not morph into a different SKU. Do not invent on-screen text.`,
    claim && input.mode !== "start-end"
      ? `Campaign claim (NOT on-screen — overlay later): ${claim}.`
      : claim
        ? `Campaign claim on Image 2 masthead (match those exact characters): ${claim}.`
        : "",
    input.mode === "start-end"
      ? `Start frame = @Image1; end frame = end_image_url. ${dialect.endBeat} Interpolate product motion AND type appearing.`
      : dialect.videoLead,
    input.mode === "start-end" ? "" : dialect.kineticTypeLine,
    heroMotionRule,
    "Dialect motions (do these, visibly):",
    motionList,
    "FORBIDDEN: freeze-frame, second location, tutorial steps, HOOK→DEMO→CTA rewrite, new props that change the SKU, new gibberish text, fake logos, watermarks, speech, only background bokeh with a locked bottle.",
    "Silent commercial loop energy — feel complete at the end.",
  ].join(" ");
}
