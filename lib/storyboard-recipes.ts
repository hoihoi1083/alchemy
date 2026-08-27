/**
 * Storyboard narrative recipes — distinct from Social drip / motion poster.
 * Classic TVC = flexible scene count. Luxury birth = product birth arc (3 or 5 scenes).
 * Premium punch = punchy commercial TVC with float-hero / frontal-punch payoff (6 scenes).
 * Cinematic assemble = step-by-step product build (pizza / tech / auto).
 * Studio type = monochrome studio + integrated 3D type brand vibe.
 * Brand warp = neon warp → type → icon field → chrome logo endcard.
 */

import type { StoryboardSceneCount } from "@/lib/ad-pack-preferences";
import type { TvcShotRole } from "@/lib/shot-recipes";

export const STORYBOARD_RECIPE_IDS = [
  "classic-tvc",
  "luxury-birth",
  "premium-punch",
  "cinematic-assemble",
  "studio-type",
  "brand-warp",
] as const;

export type StoryboardRecipeId = (typeof STORYBOARD_RECIPE_IDS)[number];

export function storyboardRecipePreviewSrc(id: StoryboardRecipeId): string {
  return `/images/studio/schemes/storyboard/${id}.png?v=1`;
}

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

/** Punch / assemble / studio-type / brand-warp: 4 (tight) or 6 (recommended). */
export const PREMIUM_PUNCH_SCENE_COUNTS = ["4", "6"] as const;
export type PremiumPunchSceneCount = (typeof PREMIUM_PUNCH_SCENE_COUNTS)[number];

/** Coupled: 4 scenes → 12 s, 6 scenes → 15 s. */
export const PREMIUM_PUNCH_SCENE_DURATION: Record<"4" | "6", number> = {
  "4": 12,
  "6": 15,
};

export function premiumPunchDurationForSceneCount(
  count: "4" | "6",
): number {
  return PREMIUM_PUNCH_SCENE_DURATION[count];
}

/** Same 4/6 ↔ 12/15 coupling as premium punch. */
export type FourOrSixSceneCount = PremiumPunchSceneCount;

export function fourOrSixDurationForSceneCount(count: "4" | "6"): number {
  return PREMIUM_PUNCH_SCENE_DURATION[count];
}

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
  "premium-punch": {
    id: "premium-punch",
    defaultDurationSec: 15,
    defaultSceneCount: "6",
    roles: ["establish", "macro", "logo-trace", "orbit", "lifestyle", "payoff"],
  },
  "cinematic-assemble": {
    id: "cinematic-assemble",
    defaultDurationSec: 15,
    defaultSceneCount: "6",
    roles: ["establish", "macro", "orbit", "lifestyle", "payoff"],
  },
  "studio-type": {
    id: "studio-type",
    defaultDurationSec: 15,
    defaultSceneCount: "6",
    roles: ["establish", "macro", "logo-trace", "orbit", "lifestyle", "payoff"],
  },
  "brand-warp": {
    id: "brand-warp",
    defaultDurationSec: 12,
    defaultSceneCount: "4",
    roles: ["establish", "logo-trace", "orbit", "payoff"],
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

export function isPremiumPunchRecipe(recipe: StoryboardRecipeId): boolean {
  return recipe === "premium-punch";
}

export function isCinematicAssembleRecipe(recipe: StoryboardRecipeId): boolean {
  return recipe === "cinematic-assemble";
}

export function isStudioTypeRecipe(recipe: StoryboardRecipeId): boolean {
  return recipe === "studio-type";
}

export function isBrandWarpRecipe(recipe: StoryboardRecipeId): boolean {
  return recipe === "brand-warp";
}

/** Recipes that share premium-punch 4/6 ↔ 12/15 scene–duration coupling. */
export function isFourOrSixCoupledRecipe(recipe: StoryboardRecipeId): boolean {
  return (
    isPremiumPunchRecipe(recipe) ||
    isCinematicAssembleRecipe(recipe) ||
    isStudioTypeRecipe(recipe) ||
    isBrandWarpRecipe(recipe)
  );
}

/** Product-first recipes — hide or weaken in concept workflows. */
export function isProductFirstStoryboardRecipe(
  recipe: StoryboardRecipeId,
): boolean {
  return (
    isLuxuryBirthRecipe(recipe) ||
    isPremiumPunchRecipe(recipe) ||
    isCinematicAssembleRecipe(recipe)
  );
}

/** Luxury birth never uses a reference reel — planner + UI must ignore uploads. */
export function storyboardRecipeForbidsReference(recipe: StoryboardRecipeId): boolean {
  return isLuxuryBirthRecipe(recipe);
}

export function luxuryBirthSceneCountOptions(): readonly LuxuryBirthSceneCount[] {
  return LUXURY_BIRTH_SCENE_COUNTS;
}

export function premiumPunchSceneCountOptions(): readonly PremiumPunchSceneCount[] {
  return PREMIUM_PUNCH_SCENE_COUNTS;
}

export function coerceLuxuryBirthSceneCount(
  uiCount: StoryboardSceneCount,
): LuxuryBirthSceneCount {
  return uiCount === "3" ? "3" : "5";
}

export function coercePremiumPunchSceneCount(
  uiCount: StoryboardSceneCount,
): PremiumPunchSceneCount {
  return uiCount === "4" ? "4" : "6";
}

export function coerceFourOrSixSceneCount(
  uiCount: StoryboardSceneCount,
): FourOrSixSceneCount {
  return uiCount === "4" ? "4" : "6";
}

/** Brand warp prefers 4 scenes when UI is auto / odd counts. */
export function coerceBrandWarpSceneCount(
  uiCount: StoryboardSceneCount,
): FourOrSixSceneCount {
  return uiCount === "6" ? "6" : "4";
}

export function effectiveStoryboardSceneCount(
  recipe: StoryboardRecipeId,
  uiCount: StoryboardSceneCount,
): StoryboardSceneCount {
  if (isLuxuryBirthRecipe(recipe)) {
    return coerceLuxuryBirthSceneCount(uiCount);
  }
  if (isBrandWarpRecipe(recipe)) {
    return coerceBrandWarpSceneCount(uiCount);
  }
  if (isFourOrSixCoupledRecipe(recipe)) {
    return coerceFourOrSixSceneCount(uiCount);
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

/**
 * Punch commercial TVC — multi-beat with a clear PUNCH scene (not a single soft orbit).
 * Category-adaptive: earbuds/float packshots vs car frontal studio punch.
 */
function premiumPunchPlannerLinesProduct(sceneCount: number): string[] {
  const shared = [
    "NARRATIVE RECIPE: PREMIUM PUNCH commercial TVC. Multi-beat storyboard with a clear PUNCH / hero climax — not one soft orbit.",
    "IMAGE 1 pixels ARE the only product identity (shape, materials, colors, logos on the object). Product name is a claim label only — never invent a different SKU.",
    "Each scene MUST have a distinct camera angle, scale, and lighting beat. Hard cuts between stills are OK and preferred for punch rhythm.",
    "CATEGORY ADAPT (read IMAGE 1 + product name):",
    "• Small electronics / earbuds / wearables / bottles: float-hero punch — product(s) hover in clean studio void, open case / multi-angle float OK if already on IMAGE 1.",
    "• Cars / SUVs / vehicles: frontal-punch — low-angle head-on studio hero, headlights on, dramatic rim light, dark gradient void.",
    "• Other SKUs: use the closest of float-hero vs frontal-punch; keep IMAGE 1 exact.",
    "FORBIDDEN: Social drip 三分屏, Instagram chrome, confetti meme, single push-in only, inventing a different car/earbud/bottle, celebrity faces unless on IMAGE 1.",
    "Motion notes: punchy commercial rhythm; punchLineZh may be short spoken/caption beats burned later.",
  ];

  if (sceneCount >= 6) {
    return [
      ...shared,
      "EXACTLY 6 scenes. Arc: tease → macro detail → light/energy → orbit build → PUNCH hero → CTA payoff.",
      "Scene 1 (establish): dark/clean studio void tease — silhouette or partial product, mystery. Not the full catalog shot yet.",
      "Scene 2 (macro): extreme detail of IMAGE 1 (mesh, tip, grille, headlight, material) — identity still locked.",
      "Scene 3 (logo-trace / light): light streak / DRL glow / LED pulse / soft specular sweep across IMAGE 1 materials.",
      "Scene 4 (orbit): dynamic orbit or multi-angle float BUILD — energy rising toward the punch.",
      "Scene 5 (lifestyle as PUNCH): THE PUNCH SCENE — full hero reveal. Earbuds: floating AirPods-style float above case (exact IMAGE 1). Cars: low frontal head-on punch with lights (exact IMAGE 1). Hold impact.",
      "Scene 6 (payoff): CTA / brand lockup — clean hero hold or slight pullback; optional designed type from user headline only.",
    ];
  }

  return [
    ...shared,
    "EXACTLY 4 scenes. Arc: tease → macro → PUNCH hero → CTA payoff.",
    "Scene 1 (establish): dark/clean void tease — partial product / mystery light.",
    "Scene 2 (macro): extreme detail of IMAGE 1 materials / sensors / grille / lights.",
    "Scene 3 (orbit as PUNCH): THE PUNCH — float-hero OR frontal head-on studio punch of exact IMAGE 1.",
    "Scene 4 (payoff): CTA / brand lockup hold.",
  ];
}

function premiumPunchPlannerLinesConcept(sceneCount: number): string[] {
  return [
    "NARRATIVE RECIPE: premium-punch CONCEPT (weaker fit — prefer product mode with a packshot).",
    `Target about ${sceneCount >= 6 ? 6 : 4} scenes with a clear punch climax, but do NOT invent a fake physical SKU.`,
    "Sell the service/idea with dramatic lighting beats and a punch payoff moment — room, gesture, outcome.",
    "FORBIDDEN: inventing earbuds, cars, or bottles as heroes; Social drip 三分屏.",
  ];
}

/**
 * Cinematic assemble — pizza-style step-by-step product BUILD (not explode-apart as the story).
 * One finished packshot → infer assembly stages → climax finished hero.
 */
function cinematicAssemblePlannerLinesProduct(sceneCount: number): string[] {
  const shared = [
    "NARRATIVE RECIPE: CINEMATIC ASSEMBLE — action-movie PRODUCT BUILD storyboard (like a pizza commercial: step-by-step make → finished hero).",
    "IMAGE 1 is the FINISHED product identity. Still generation invents cinematic BUILD stages that clearly lead TO that exact finished object — never a different SKU.",
    "Tone: dark void or dramatic kitchen/studio; high contrast; slow-mo ingredient/parts rain; flour/spark/particle bursts; hard cuts. Not soft lifestyle montage.",
    "CATEGORY ADAPT (read IMAGE 1 + product name):",
    "• Food / pizza / burger: dough or base → sauce → toppings rain → heat/bake → cheese-pull or plated hero (exact IMAGE 1 finish).",
    "• Small electronics / earbuds / wearables: component macros → material/mesh → parts float-assemble → open-case / float hero matching IMAGE 1.",
    "• Cars / vehicles: chassis/wheel/light macros → panel settle → headlights punch → frontal or 3/4 hero matching IMAGE 1.",
    "• Other SKUs: choose the closest assemble grammar; final scenes must lock IMAGE 1 pixels.",
    "FORBIDDEN: stopping mid-build with no finished hero; Social drip 三分屏; inventing a different product; confusing this with product-explode (explode is optional ONE beat only, never the whole arc).",
    "Motion notes: action-commercial rhythm; each still a clear BUILD STEP toward the finished product.",
  ];

  if (sceneCount >= 6) {
    return [
      ...shared,
      "EXACTLY 6 scenes. Arc: raw start → first layer → parts rain → heat/energy → assemble climax → finished hero CTA.",
      "Scene 1 (establish): RAW START — dough ball / empty chassis / case closed / base plate. Dark dramatic void. Mystery of what will be built.",
      "Scene 2 (macro): FIRST LAYER — sauce smear / material grain / undercarriage detail — still incomplete.",
      "Scene 3 (orbit): PARTS RAIN — cheese/toppings OR component parts OR light streaks falling toward the build, frozen-action commercial energy.",
      "Scene 4 (lifestyle / heat): ENERGY — oven heat / weld sparks / LED wake / steam — transformation beat.",
      "Scene 5 (macro as ASSEMBLE CLIMAX): almost-complete product snapping into place; cheese pull / lid open / doors settle — toward IMAGE 1.",
      "Scene 6 (payoff): FINISHED HERO — exact IMAGE 1 product, plated / float / frontal, clean CTA hold.",
    ];
  }

  return [
    ...shared,
    "EXACTLY 4 scenes. Arc: raw start → parts rain → assemble climax → finished hero.",
    "Scene 1 (establish): raw start / incomplete base in dramatic void.",
    "Scene 2 (macro): parts/ingredients rain toward the build.",
    "Scene 3 (orbit): assemble climax — nearly finished, energy peak.",
    "Scene 4 (payoff): exact IMAGE 1 finished hero CTA.",
  ];
}

function cinematicAssemblePlannerLinesConcept(sceneCount: number): string[] {
  return [
    "NARRATIVE RECIPE: cinematic-assemble CONCEPT (weak fit — prefer physical product packshot).",
    `About ${sceneCount >= 6 ? 6 : 4} scenes of building an experience metaphor — do NOT invent a fake SKU bottle.`,
    "FORBIDDEN: fake pizza/earbuds/cars as product heroes without IMAGE 1.",
  ];
}

/**
 * Studio type — monochrome fashion/editorial studio + large integrated 3D typography.
 * Good for brand, logo wordmarks, shop name, or product as hero with type cards.
 */
function studioTypePlannerLines(sceneCount: number, conceptMode: boolean): string[] {
  const shared = [
    "NARRATIVE RECIPE: STUDIO TYPE — premium monochrome studio commercial with LARGE integrated 3D typography (fashion-editorial / brand bumper energy).",
    "Look: light grey seamless studio, black/white/silver palette, prism / shattered-glass / chrome accents OK. Tall condensed sans type living IN the 3D space (not flat UI stickers).",
    "Each scene pairs a strong subject pose OR product hero with a short TYPE CARD from user headline / brand / shop name (2–4 words max per card). Vary the type phrases across scenes.",
    conceptMode
      ? "CONCEPT / brand / shop: figure or abstract glass form + type can carry the brand; do NOT invent a fake packaged SKU."
      : "PRODUCT mode: IMAGE 1 locks product identity when the product appears; type cards from headline/brand only. Product may share frame with type like a fashion ad.",
    "FORBIDDEN: Social drip 三分屏, neon cyber rainbow (save that for brand-warp), pizza assemble grammar, confetti meme.",
    "Motion notes: punchy one-take editorial cuts; figure motion / type shatter / prism flashes between cards.",
  ];

  if (sceneCount >= 6) {
    return [
      ...shared,
      "EXACTLY 6 scenes. Arc: type tease → subject/product enter → prism impact → speed beat → manifesto type → brand lockup.",
      "Scene 1 (establish): empty or near-empty grey studio + first TYPE CARD (e.g. brand word) as 3D glass/chrome.",
      "Scene 2 (macro): subject or product detail with second type phrase; monochrome fashion light.",
      "Scene 3 (logo-trace): PRISM / shatter impact — shards + type edge refraction.",
      "Scene 4 (orbit): speed / stride / orbit energy past oversized 3D type blocks.",
      "Scene 5 (lifestyle): manifesto type (MAKE IT YOURS style) with hero pose or product hold.",
      "Scene 6 (payoff): clean brand / shop / product lockup — type + hero settle.",
    ];
  }

  return [
    ...shared,
    "EXACTLY 4 scenes. Arc: type tease → prism impact → manifesto → lockup.",
    "Scene 1 (establish): studio + first 3D type card.",
    "Scene 2 (logo-trace): prism/shatter impact with subject or product.",
    "Scene 3 (orbit): manifesto type + hero energy.",
    "Scene 4 (payoff): brand/shop/product lockup.",
  ];
}

/**
 * Brand warp — neon warp tunnel → glowing type → glass icon field → chrome logo endcard.
 * Best for brand, logo, shop, AIGC studio identity.
 */
function brandWarpPlannerLines(sceneCount: number, conceptMode: boolean): string[] {
  const shared = [
    "NARRATIVE RECIPE: BRAND WARP — high-energy logo/brand motion-graphics storyboard (warp tunnel → neon type → glass icons → chrome logo).",
    "Look: black void, metallic chrome + electric blue/orange/green light trails, glass-UI icons on soft white plane for mid beats, chrome/molten logo endcard on light grey studio.",
    "Typography: brand / shop / product NAME as the hero type — glowing multi-color or chrome; short English subtitle from user headline if provided (e.g. GENERATE | TRANSFORM).",
    conceptMode
      ? "CONCEPT / brand / shop primary: logo wordmark and glass icons sell the identity. No fake product bottle required."
      : "PRODUCT mode: endcard may include exact IMAGE 1 product beside or behind chrome brand type; mid scenes can be abstract MG.",
    "FORBIDDEN: pizza assemble food grammar; Social drip 三分屏; fashion figure shatter unless user brief asks; inventing unrelated celebrity faces.",
    "Motion notes: warp speed into camera; light streaks; icon field settle; logo punch hold.",
  ];

  if (sceneCount >= 6) {
    return [
      ...shared,
      "EXACTLY 6 scenes. Arc: void spark → warp tunnel → neon brand type → glass icon field → chrome material → logo endcard.",
      "Scene 1 (establish): black void with spark / portal forming.",
      "Scene 2 (macro): WARP TUNNEL — chrome/blue/orange swirl rushing toward camera.",
      "Scene 3 (logo-trace): oversized glowing brand TYPE with light trails (AIGC-style energy).",
      "Scene 4 (orbit): glass / frosted acrylic ICON FIELD on undulating white plane (content seeds / services metaphors).",
      "Scene 5 (lifestyle): chrome letters warming with inner molten light — brand material hero.",
      "Scene 6 (payoff): chrome logo + short slogan lockup; optional IMAGE 1 product if physical mode.",
    ];
  }

  return [
    ...shared,
    "EXACTLY 4 scenes. Arc: warp tunnel → neon type → glass icons → chrome logo endcard.",
    "Scene 1 (establish): warp / vortex tunnel on black.",
    "Scene 2 (logo-trace): glowing brand TYPE + light streaks.",
    "Scene 3 (orbit): glass icon field on soft white plane.",
    "Scene 4 (payoff): chrome logo + slogan endcard (optional product if IMAGE 1).",
  ];
}

export function storyboardRecipePlannerLines(
  recipe: StoryboardRecipeId,
  conceptMode: boolean,
  sceneCountTarget?: StoryboardSceneCount,
): string[] {
  if (isLuxuryBirthRecipe(recipe)) {
    const n = Number(coerceLuxuryBirthSceneCount(sceneCountTarget ?? "5"));
    return conceptMode
      ? luxuryBirthPlannerLinesConcept(n)
      : luxuryBirthPlannerLinesProduct(n);
  }
  if (isPremiumPunchRecipe(recipe)) {
    const n = Number(coercePremiumPunchSceneCount(sceneCountTarget ?? "6"));
    return conceptMode
      ? premiumPunchPlannerLinesConcept(n)
      : premiumPunchPlannerLinesProduct(n);
  }
  if (isCinematicAssembleRecipe(recipe)) {
    const n = Number(coerceFourOrSixSceneCount(sceneCountTarget ?? "6"));
    return conceptMode
      ? cinematicAssemblePlannerLinesConcept(n)
      : cinematicAssemblePlannerLinesProduct(n);
  }
  if (isStudioTypeRecipe(recipe)) {
    const n = Number(coerceFourOrSixSceneCount(sceneCountTarget ?? "6"));
    return studioTypePlannerLines(n, conceptMode);
  }
  if (isBrandWarpRecipe(recipe)) {
    const n = Number(coerceBrandWarpSceneCount(sceneCountTarget ?? "4"));
    return brandWarpPlannerLines(n, conceptMode);
  }
  return [];
}
