/**
 * Storyboard narrative recipes — distinct from Social drip / motion poster.
 * Classic TVC = flexible scene count. Luxury birth = product birth arc (3 or 5 scenes).
 */

import type { StoryboardSceneCount } from "@/lib/ad-pack-preferences";
import type { TvcShotRole } from "@/lib/shot-recipes";

export const STORYBOARD_RECIPE_IDS = ["classic-tvc", "luxury-birth"] as const;

export type StoryboardRecipeId = (typeof STORYBOARD_RECIPE_IDS)[number];

/** Luxury birth allows 3 (tight) or 5 (recommended) scenes only. */
export const LUXURY_BIRTH_SCENE_COUNTS = ["3", "5"] as const;

/** Coupled durations: 3 scenes → 10 s, 5 scenes → 15 s. */
export const LUXURY_BIRTH_SCENE_DURATION: Record<"3" | "5", number> = {
  "3": 10,
  "5": 15,
};

export function luxuryBirthDurationForSceneCount(count: "3" | "5"): number {
  return LUXURY_BIRTH_SCENE_DURATION[count];
}

export type LuxuryBirthSceneCount = (typeof LUXURY_BIRTH_SCENE_COUNTS)[number];

export type StoryboardRecipeDef = {
  id: StoryboardRecipeId;
  defaultDurationSec: number;
  defaultSceneCount?: StoryboardSceneCount;
  roles: readonly TvcShotRole[];
};

export const STORYBOARD_RECIPES: Record<StoryboardRecipeId, StoryboardRecipeDef> = {
  "classic-tvc": {
    id: "classic-tvc",
    defaultDurationSec: 12,
    roles: ["establish", "macro", "orbit", "payoff"],
  },
  "luxury-birth": {
    id: "luxury-birth",
    defaultDurationSec: 12,
    defaultSceneCount: "5",
    roles: ["establish", "macro", "orbit", "payoff"],
  },
};

export function isStoryboardRecipeId(
  value: string | null | undefined,
): value is StoryboardRecipeId {
  return (STORYBOARD_RECIPE_IDS as readonly string[]).includes(value ?? "");
}

export function resolveStoryboardRecipeId(
  value: string | null | undefined,
): StoryboardRecipeId {
  return isStoryboardRecipeId(value) ? value : "classic-tvc";
}

export function isLuxuryBirthRecipe(recipe: StoryboardRecipeId): boolean {
  return recipe === "luxury-birth";
}

/** Luxury birth never uses a reference reel — planner + UI must ignore uploads. */
export function storyboardRecipeForbidsReference(recipe: StoryboardRecipeId): boolean {
  return isLuxuryBirthRecipe(recipe);
}

export function luxuryBirthSceneCountOptions(): readonly LuxuryBirthSceneCount[] {
  return LUXURY_BIRTH_SCENE_COUNTS;
}

export function coerceLuxuryBirthSceneCount(
  uiCount: StoryboardSceneCount,
): LuxuryBirthSceneCount {
  return uiCount === "3" ? "3" : "5";
}

export function effectiveStoryboardSceneCount(
  recipe: StoryboardRecipeId,
  uiCount: StoryboardSceneCount,
): StoryboardSceneCount {
  if (isLuxuryBirthRecipe(recipe)) {
    return coerceLuxuryBirthSceneCount(uiCount);
  }
  return uiCount;
}

function luxuryBirthPlannerLinesProduct(sceneCount: number): string[] {
  if (sceneCount >= 5) {
    return [
      "NARRATIVE RECIPE: luxury 5-beat PRODUCT BIRTH (no reference reel). Best for physical SKU with packshot.",
      "EXACTLY 5 scenes. Arc: abstract mood → color pulse → metaphor grows → birth transition → hero reveal.",
      "Scene 1 (establish): abstract material / crystal / liquid void — mood BEFORE the SKU. Color hints match IMAGE 1 only.",
      "Scene 2 (macro): color pulse / energy wakes — still no full packshot.",
      "Scene 3 (orbit): metaphor object grows (gem, heart, sculpted light) — premium jewelry-ad energy.",
      "Scene 4 (macro): transition — liquid/metal/crystal forms toward the product silhouette; not a catalog flat lay yet.",
      "Scene 5 (payoff): product BIRTH / reveal — orbit into the exact IMAGE 1 object (shape, color, materials locked).",
      "User storyboard brief + headline steer the metaphor; product name gives category tone; IMAGE 1 locks the final reveal at still generation.",
      "FORBIDDEN: Social drip 三分屏, Instagram chrome, falling confetti, motion-poster masthead, reference-reel matching, inventing a different SKU.",
      "Motion notes: one continuous luxury TVC across 5 stills; hard cuts OK; textless unless integrated type requested.",
    ];
  }
  return [
    "NARRATIVE RECIPE: luxury 3-beat PRODUCT BIRTH (no reference reel). Best for physical SKU with packshot.",
    "EXACTLY 3 scenes. Arc: abstract mood → metaphor object → product born/reveal.",
    "Scene 1 (establish): abstract material / color / crystal / liquid void — mood BEFORE the SKU. No full packshot yet.",
    "Scene 2 (macro): metaphor grows (gem, heart, energy form, sculpted light) — still not a catalog packshot.",
    "Scene 3 (payoff): product BIRTH / reveal — liquid→solid or orbit into the exact IMAGE 1 object (shape, color, materials locked).",
    "User storyboard brief + headline steer the metaphor; product name gives category tone; IMAGE 1 locks the final reveal at still generation.",
    "FORBIDDEN: Social drip 三分屏, Instagram chrome, falling confetti, motion-poster masthead, reference-reel matching, inventing a different SKU.",
    "Motion notes: one continuous luxury TVC across 3 stills; hard cuts OK; textless unless integrated type requested.",
  ];
}

function luxuryBirthPlannerLinesConcept(sceneCount: number): string[] {
  if (sceneCount >= 5) {
    return [
      "NARRATIVE RECIPE: luxury 5-beat CONCEPT (weaker fit — prefer product mode). Service / idea — no reference reel, no fake SKU bottle.",
      "EXACTLY 5 scenes. Arc: abstract mood → atmosphere builds → metaphor peak → transition → service payoff.",
      "Scene 1–2: abstract color and atmosphere of the idea — no product packaging.",
      "Scene 3: metaphor visual peak for the service feeling.",
      "Scene 4: transition toward the experience moment.",
      "Scene 5: service payoff — room, gesture, outcome. Not a fake product bottle.",
      "FORBIDDEN: Social drip 三分屏, Instagram chrome, inventing a SKU hero, reference-reel matching.",
    ];
  }
  return [
    "NARRATIVE RECIPE: luxury 3-beat CONCEPT (weaker fit — prefer product mode). Service / idea — no reference reel, no fake SKU bottle.",
    "EXACTLY 3 scenes. Arc: abstract mood → metaphor scene → service/brand payoff.",
    "Scene 1 (establish): abstract color, light, atmosphere — no product packaging.",
    "Scene 2 (macro): metaphor visual that sells the FEELING of the service.",
    "Scene 3 (payoff): service experience payoff — not a fake product bottle.",
    "FORBIDDEN: Social drip 三分屏, Instagram chrome, inventing a SKU hero, reference-reel matching.",
  ];
}

export function storyboardRecipePlannerLines(
  recipe: StoryboardRecipeId,
  conceptMode: boolean,
  sceneCountTarget?: StoryboardSceneCount,
): string[] {
  if (!isLuxuryBirthRecipe(recipe)) return [];
  const n = Number(coerceLuxuryBirthSceneCount(sceneCountTarget ?? "5"));
  return conceptMode
    ? luxuryBirthPlannerLinesConcept(n)
    : luxuryBirthPlannerLinesProduct(n);
}
