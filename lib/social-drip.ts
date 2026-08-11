/**
 * Social drip (三分屏) — product/service hero + fake social chrome + character
 * reaction, with a category-aware "crossing" metaphor (pour, glow, sparkle…).
 *
 * Not a motion-poster dialect: layout is a fixed 3-band contract; DeepSeek picks
 * the metaphor (or user overrides). Reference reels are forbidden for this path.
 */

import { callDeepSeekChat } from "@/lib/deepseek-client";

export const SOCIAL_DRIP_METAPHOR_IDS = [
  "pour",
  "glow",
  "sparkle",
  "steam",
  "confetti",
  "light-streak",
  "fabric",
  "petals",
] as const;

export type SocialDripMetaphorId = (typeof SOCIAL_DRIP_METAPHOR_IDS)[number];
export type SocialDripMetaphorPick = SocialDripMetaphorId | "auto";

export type SocialDripCategory =
  | "fnb"
  | "beauty"
  | "fashion"
  | "jewelry"
  | "electronics"
  | "wellness"
  | "home"
  | "general"
  | "concept";

export type SocialDripPlan = {
  metaphorId: SocialDripMetaphorId;
  category: SocialDripCategory;
  /** Short EN label for UI / notes */
  metaphorLabel: string;
  /** What crosses the middle social bar into the character band */
  crossingDescription: string;
  /** Bottom-band character action / pose */
  characterBeat: string;
  /** Where the crossing lands (metaphor-specific — not always mouth) */
  landingDescription: string;
  /** Fake IG handle (no @ required) */
  igHandle: string;
  /** Fake IG caption under the chrome */
  igCaption: string;
  /** Why this metaphor was chosen */
  reason: string;
  source: "deepseek" | "heuristic" | "user";
};

/**
 * Format contract — what Social drip can / cannot do.
 * Shown up front so users don’t expect TVC, photoreal drinking, or reference clones.
 */
export const SOCIAL_DRIP_FORMAT_CONTRACT = {
  /** Shared layout that stays locked for every category */
  always: [
    "three_bands",
    "cross_chrome",
    "doodle_character",
    "no_reference_reel",
  ] as const,
  /** Categories / metaphors that usually work */
  goodFits: [
    "fnb_pour",
    "beauty_skin_drip",
    "jewelry_sparkle",
    "fashion_confetti",
    "tech_beam",
    "wellness_steam_petals",
  ] as const,
  /** Explicit non-goals — redirect to another video path */
  notSupported: [
    "photoreal_drinking",
    "under_table_lifestyle",
    "multi_shot_tvc",
    "reference_clone",
    "real_instagram_ui",
    "no_falling_story",
  ] as const,
} as const;

export type SocialDripFitLevel = "good" | "caution" | "mismatch";

export type SocialDripFitReasonId =
  | "good_fnb"
  | "good_beauty_skin"
  | "good_sparkle"
  | "good_fashion"
  | "good_tech"
  | "good_wellness"
  | "good_general"
  | "caution_mouth_nonfood"
  | "caution_beauty_pour"
  | "caution_concept_pour"
  | "caution_no_product_photo"
  | "mismatch_no_falling"
  | "mismatch_wrong_metaphor";

export type SocialDripFitAssessment = {
  level: SocialDripFitLevel;
  category: SocialDripCategory;
  /** i18n reason ids — UI resolves copy */
  reasons: SocialDripFitReasonId[];
  /** Suggested metaphor when current pick is a mismatch */
  suggestedMetaphor?: SocialDripMetaphorId;
};

/**
 * Bottom-band character lock — cute polished cartoon only.
 * Photoreal people make the gag feel creepy; rough stick figures look cheap.
 */
export const SOCIAL_DRIP_CARTOON_CHARACTER_LOCK = [
  "BOTTOM character MUST be a polished cute cartoon / chibi-style 2D character (clean linework, soft shading, expressive big eyes, friendly smile).",
  "Quality bar: finished Instagram-meme illustration — NOT a rough stick figure, NOT scribbly MS-Paint doodle, NOT ugly deformed face.",
  "FORBIDDEN: photoreal photo of a real person, AI lifestyle model, under-table photography, uncanny semi-realistic face.",
  "Keep the same cartoon identity from start→end; open clean floor space above them (no furniture blocking the fall).",
].join(" ");

export const SOCIAL_DRIP_METAPHOR_DEFS: Record<
  SocialDripMetaphorId,
  {
    label: string;
    categories: readonly SocialDripCategory[];
    crossingDefault: string;
    characterDefault: string;
    /** Metaphor-specific landing (mouth only for edible pour). */
    landingDefault: string;
    /** Open-mouth catch is allowed only for edible / playful pour gags. */
    allowMouthCatch: boolean;
  }
> = {
  pour: {
    label: "Pour / drip",
    categories: ["fnb", "home", "general"],
    crossingDefault:
      "ONE continuous thick opaque liquid column (sauce / syrup / cream / honey) pours straight down from the hero — dense and readable, never a wispy light ribbon or soft glow swirl",
    characterDefault:
      "cute polished cartoon character lying joyfully on the clean floor, mouth wide open UNDER the pour path — playful and funny, never creepy",
    landingDefault:
      "liquid lands in the open mouth AND spills a visible puddle on the floor beside the cartoon (F&B gag only)",
    allowMouthCatch: true,
  },
  glow: {
    label: "Serum drip",
    categories: ["beauty", "wellness", "general"],
    crossingDefault:
      "a thin-to-medium amber SERUM stream falls from the dropper TIP only (same liquid as the bottle) — readable vertical drip, NOT a syrup hose, NOT a decorative light ribbon looping the bottle",
    characterDefault:
      "cute polished cartoon face looking UP with soft smile / closed mouth, cheeks under the drip path — joyful glow reaction, NOT drinking, NO furniture overhead",
    landingDefault:
      "serum dots land on cartoon cheeks / forehead (topical skincare) with at most a tiny glossy splash on the floor — NEVER pour into an open mouth",
    allowMouthCatch: false,
  },
  sparkle: {
    label: "Sparkle cascade",
    categories: ["jewelry", "fashion", "beauty", "general"],
    crossingDefault:
      "dense glitter / sparkle CASCADE falls as a clear vertical stream from the hero (packed particles, readable column) — not a faint glow halo",
    characterDefault:
      "cute polished cartoon looking up with open hands under the cascade — delighted sparkle reaction",
    landingDefault:
      "sparkles pile on cartoon hands/shoulders and scatter on the bottom panel floor — no liquid drinking",
    allowMouthCatch: false,
  },
  steam: {
    label: "Steam / mist",
    categories: ["fnb", "wellness", "home", "concept", "general"],
    crossingDefault:
      "thick visible steam / cream mist pours downward as a continuous plume from the hero (dense enough to read as a stream crossing the chrome)",
    characterDefault:
      "cute polished cartoon face under the plume path, soft inhale / cozy happy expression",
    landingDefault:
      "plume reaches the cartoon face; soft mist gathers near the bottom panel floor — no syrup puddle",
    allowMouthCatch: false,
  },
  confetti: {
    label: "Confetti fall",
    categories: ["fashion", "general", "concept"],
    crossingDefault:
      "heavy confetti FALLS in a vertical column from the hero through the middle bar (dense paper pieces, not a side swirl)",
    characterDefault:
      "cute polished cartoon sitting or leaning back, arms open under the fall path — celebratory joy",
    landingDefault:
      "confetti lands on the cartoon and covers the bottom panel floor",
    allowMouthCatch: false,
  },
  "light-streak": {
    label: "Energy beam",
    categories: ["electronics", "general", "concept"],
    crossingDefault:
      "a thick bright ENERGY BEAM / liquid-light column shoots straight down from the device (solid readable beam, not a thin decorative ribbon looping the product)",
    characterDefault:
      "cute polished cartoon looking up under the beam, eyes wide / hands open — playful power-up reaction",
    landingDefault:
      "beam hits the cartoon and leaves a bright impact mark on the bottom panel floor — not a liquid mouth pour",
    allowMouthCatch: false,
  },
  fabric: {
    label: "Fabric fall",
    categories: ["fashion", "general"],
    crossingDefault:
      "a fabric ribbon FALLS straight down from the product as a continuous hanging strip through the chrome (gravity fall, not a side drape swirl)",
    characterDefault:
      "cute polished cartoon catching the ribbon with open hands under the fall path — soft delighted pose",
    landingDefault:
      "ribbon end lands in the cartoon hands and rests on the bottom panel floor",
    allowMouthCatch: false,
  },
  petals: {
    label: "Petal fall",
    categories: ["wellness", "beauty", "concept", "fnb", "general"],
    crossingDefault:
      "petals FALL in a dense vertical cascade from the hero through the middle bar",
    characterDefault:
      "cute polished cartoon under the cascade, face/hands open — dreamy joyful reaction",
    landingDefault:
      "petals cover the cartoon and the bottom panel floor",
    allowMouthCatch: false,
  },
};

const CATEGORY_HEURISTICS: Array<[SocialDripCategory, RegExp]> = [
  [
    "fnb",
    /burger|pizza|cake|coffee|tea|drink|cocktail|sauce|food|snack|ramen|sushi|dessert|bakery|餐|汉堡|漢堡|咖啡|茶|饮|飲|蛋糕|甜|酒|奶茶|火锅|火鍋/i,
  ],
  [
    "beauty",
    /serum|cream|skincare|makeup|lotion|toner|mask|beauty|护肤|護膚|美妆|美妝|精华|精華|面膜|防晒|防曬/i,
  ],
  [
    "jewelry",
    /ring|necklace|jewelry|jewel|gold|diamond|珠宝|珠寶|项链|項鍊|戒指|金/i,
  ],
  [
    "fashion",
    /shoe|sneaker|bag|dress|fashion|apparel|衣服|鞋|包|时装|時裝|穿搭/i,
  ],
  [
    "electronics",
    /phone|earbud|laptop|gadget|tech|camera|耳机|耳機|手机|手機|电子|電子|电脑|電腦/i,
  ],
  [
    "wellness",
    /spa|yoga|sleep|wellness|massage|冥想|睡眠|养生|養生|瑜伽|按摩/i,
  ],
  ["home", /candle|mug|home|decor|香薰|蜡烛|蠟燭|家居|杯/i],
];

export function isSocialDripMetaphorId(
  value: unknown,
): value is SocialDripMetaphorId {
  return SOCIAL_DRIP_METAPHOR_IDS.includes(
    String(value ?? "") as SocialDripMetaphorId,
  );
}

export function parseSocialDripMetaphorPick(
  raw: unknown,
): SocialDripMetaphorPick {
  const v = String(raw ?? "auto").trim();
  if (v === "auto" || isSocialDripMetaphorId(v)) return v;
  return "auto";
}

/** Fill missing landing copy when older plans / partial JSON arrive. */
export function normalizeSocialDripPlan(plan: SocialDripPlan): SocialDripPlan {
  const def = SOCIAL_DRIP_METAPHOR_DEFS[plan.metaphorId] ?? SOCIAL_DRIP_METAPHOR_DEFS.pour;
  return {
    ...plan,
    metaphorLabel: plan.metaphorLabel?.trim() || def.label,
    crossingDescription: plan.crossingDescription?.trim() || def.crossingDefault,
    characterBeat: plan.characterBeat?.trim() || def.characterDefault,
    landingDescription: plan.landingDescription?.trim() || def.landingDefault,
  };
}

export function inferSocialDripCategory(input: {
  product?: string;
  conceptIdea?: string;
  headline?: string;
  business?: string;
  conceptMode?: boolean;
}): SocialDripCategory {
  if (input.conceptMode) {
    const blob = [input.conceptIdea, input.headline, input.product, input.business]
      .filter(Boolean)
      .join(" ");
    for (const [cat, re] of CATEGORY_HEURISTICS) {
      if (re.test(blob)) return cat === "fnb" ? "concept" : cat;
    }
    return "concept";
  }
  const blob = [input.product, input.headline, input.business, input.conceptIdea]
    .filter(Boolean)
    .join(" ");
  for (const [cat, re] of CATEGORY_HEURISTICS) {
    if (re.test(blob)) return cat;
  }
  return "general";
}

function defaultMetaphorForCategory(
  category: SocialDripCategory,
): SocialDripMetaphorId {
  switch (category) {
    case "fnb":
      return "pour";
    case "beauty":
      // Thin serum drip onto skin — not edible mouth pour.
      return "glow";
    case "jewelry":
      return "sparkle";
    case "fashion":
      return "confetti";
    case "electronics":
      return "light-streak";
    case "wellness":
      return "steam";
    case "home":
      return "pour";
    case "concept":
      return "petals";
    default:
      return "pour";
  }
}

/**
 * Up-front fit check: can this product + metaphor work as Social drip,
 * or should we warn / suggest another path?
 */
export function assessSocialDripFit(input: {
  product?: string;
  conceptIdea?: string;
  headline?: string;
  business?: string;
  conceptMode?: boolean;
  hasProductPhoto?: boolean;
  pick?: SocialDripMetaphorPick;
}): SocialDripFitAssessment {
  const category = inferSocialDripCategory(input);
  const pick = parseSocialDripMetaphorPick(input.pick);
  const metaphorId =
    pick === "auto" ? defaultMetaphorForCategory(category) : pick;
  const def = SOCIAL_DRIP_METAPHOR_DEFS[metaphorId];
  const reasons: SocialDripFitReasonId[] = [];
  let level: SocialDripFitLevel = "good";
  let suggestedMetaphor: SocialDripMetaphorId | undefined;

  if (!input.conceptMode && !input.hasProductPhoto) {
    reasons.push("caution_no_product_photo");
    level = "caution";
  }

  // Mouth-catch pour on non-food → weird (serum drinking, phone drinking…).
  if (
    metaphorId === "pour" &&
    def.allowMouthCatch &&
    category !== "fnb" &&
    category !== "home"
  ) {
    reasons.push("caution_mouth_nonfood");
    if (category === "beauty") {
      reasons.push("caution_beauty_pour");
      suggestedMetaphor = "glow";
    } else if (category === "electronics") {
      suggestedMetaphor = "light-streak";
    } else if (category === "jewelry" || category === "fashion") {
      suggestedMetaphor = category === "jewelry" ? "sparkle" : "confetti";
    } else if (category === "concept") {
      reasons.push("caution_concept_pour");
      suggestedMetaphor = "petals";
    }
    level = "caution";
  }

  if (category === "beauty" && metaphorId === "pour") {
    if (!reasons.includes("caution_beauty_pour")) {
      reasons.push("caution_beauty_pour");
    }
    suggestedMetaphor = suggestedMetaphor ?? "glow";
    if (level === "good") level = "caution";
  }

  // Category / metaphor mismatch (user forced incompatible chip).
  if (
    pick !== "auto" &&
    def.categories.length > 0 &&
    !def.categories.includes(category) &&
    category !== "general"
  ) {
    reasons.push("mismatch_wrong_metaphor");
    suggestedMetaphor = defaultMetaphorForCategory(category);
    level = "mismatch";
  }

  if (reasons.length === 0) {
    switch (category) {
      case "fnb":
        reasons.push("good_fnb");
        break;
      case "beauty":
        reasons.push("good_beauty_skin");
        break;
      case "jewelry":
        reasons.push("good_sparkle");
        break;
      case "fashion":
        reasons.push("good_fashion");
        break;
      case "electronics":
        reasons.push("good_tech");
        break;
      case "wellness":
        reasons.push("good_wellness");
        break;
      default:
        reasons.push("good_general");
        break;
    }
  }

  return {
    level,
    category,
    reasons,
    suggestedMetaphor,
  };
}

export function heuristicSocialDripPlan(input: {
  product?: string;
  conceptIdea?: string;
  headline?: string;
  business?: string;
  conceptMode?: boolean;
  pick?: SocialDripMetaphorPick;
}): SocialDripPlan {
  const category = inferSocialDripCategory(input);
  const pick = parseSocialDripMetaphorPick(input.pick);
  const metaphorId =
    pick === "auto" ? defaultMetaphorForCategory(category) : pick;
  const def = SOCIAL_DRIP_METAPHOR_DEFS[metaphorId];
  const name =
    input.product?.trim() ||
    input.conceptIdea?.trim() ||
    input.business?.trim() ||
    "brand";
  const handle = name
    .replace(/[^\w\u4e00-\u9fff]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 18)
    .toLowerCase() || "brand";
  const caption =
    input.headline?.trim() ||
    (input.conceptMode
      ? input.conceptIdea?.trim() || "New drop"
      : `${name} — try it`);

  return {
    metaphorId,
    category,
    metaphorLabel: def.label,
    crossingDescription: def.crossingDefault,
    characterBeat: def.characterDefault,
    landingDescription: def.landingDefault,
    igHandle: handle,
    igCaption: caption.slice(0, 80),
    reason:
      pick === "auto"
        ? `Heuristic fit for category “${category}”.`
        : "User-selected metaphor.",
    source: pick === "auto" ? "heuristic" : "user",
  };
}

function extractJsonObject(raw: string): Record<string, unknown> | null {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
}

export async function planSocialDripMetaphor(input: {
  product?: string;
  conceptIdea?: string;
  headline?: string;
  subline?: string;
  business?: string;
  conceptMode?: boolean;
  pick?: SocialDripMetaphorPick;
  locale?: string;
}): Promise<SocialDripPlan> {
  const pick = parseSocialDripMetaphorPick(input.pick);
  if (pick !== "auto") {
    return heuristicSocialDripPlan({ ...input, pick });
  }

  const fallback = heuristicSocialDripPlan({ ...input, pick: "auto" });
  const subject = input.conceptMode
    ? input.conceptIdea?.trim() || input.product?.trim() || "the service idea"
    : input.product?.trim() || "the product";

  const system = `You plan a viral vertical 3-band “social drip / 三分屏” ad for Alchemy AI Lab.
Layout contract (ALWAYS): photoreal product OR concept scene on TOP → fake Instagram chrome in MIDDLE → CUTE polished cartoon character on BOTTOM (never a real person). Something readable crosses OVER the chrome on one vertical centerline.
Bottom character quality: finished cute meme illustration (clean lines, soft shading, joyful expression) — NOT photoreal, NOT stick-figure scribbles.

Pick ONE metaphor id from: ${SOCIAL_DRIP_METAPHOR_IDS.join(", ")}.
Hard rules by category:
- F&B → "pour" with open-mouth catch + floor puddle (edible gag OK).
- Beauty / skincare → "glow" as a thin serum drip from the dropper TIP onto CHEEKS/skin — mouth CLOSED, NEVER drinking serum, NO furniture blocking the face.
- Jewelry → sparkle cascade onto hands. Fashion → confetti/fabric. Electronics → energy beam. Wellness → steam/petals.
- Crossing MUST be a dense vertical fall — FORBIDDEN: wispy light ribbons, soft decorative glow swirls that never cross chrome.
- Concept/service: NEVER invent a fake SKU bottle; still use a readable vertical fall metaphor.
- igHandle: short brand-like handle. igCaption: punchy, ≤12 words.
Return STRICT JSON only:
{"metaphorId":"...","category":"fnb|beauty|fashion|jewelry|electronics|wellness|home|general|concept","metaphorLabel":"...","crossingDescription":"...","characterBeat":"...","landingDescription":"...","igHandle":"...","igCaption":"...","reason":"..."}`;

  const user = JSON.stringify({
    conceptMode: Boolean(input.conceptMode),
    subject,
    product: input.product ?? "",
    conceptIdea: input.conceptIdea ?? "",
    headline: input.headline ?? "",
    subline: input.subline ?? "",
    business: input.business ?? "",
    locale: input.locale ?? "en",
  });

  try {
    const raw = await callDeepSeekChat(
      [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      { temperature: 0.35, max_tokens: 700, jsonObject: true },
    );
    const parsed = extractJsonObject(raw);
    if (!parsed) return fallback;
    const metaphorId = isSocialDripMetaphorId(parsed.metaphorId)
      ? parsed.metaphorId
      : fallback.metaphorId;
    const def = SOCIAL_DRIP_METAPHOR_DEFS[metaphorId];
    const categoryRaw = String(parsed.category ?? fallback.category);
    const category = (
      [
        "fnb",
        "beauty",
        "fashion",
        "jewelry",
        "electronics",
        "wellness",
        "home",
        "general",
        "concept",
      ] as const
    ).includes(categoryRaw as SocialDripCategory)
      ? (categoryRaw as SocialDripCategory)
      : fallback.category;

    return {
      metaphorId,
      category,
      metaphorLabel:
        String(parsed.metaphorLabel ?? "").trim() || def.label,
      crossingDescription:
        String(parsed.crossingDescription ?? "").trim() ||
        def.crossingDefault,
      characterBeat:
        String(parsed.characterBeat ?? "").trim() || def.characterDefault,
      landingDescription:
        String(parsed.landingDescription ?? "").trim() || def.landingDefault,
      igHandle:
        String(parsed.igHandle ?? "")
          .replace(/^@/, "")
          .trim()
          .slice(0, 24) || fallback.igHandle,
      igCaption:
        String(parsed.igCaption ?? "").trim().slice(0, 100) ||
        fallback.igCaption,
      reason:
        String(parsed.reason ?? "").trim() ||
        "DeepSeek selected metaphor from product/concept.",
      source: "deepseek",
    };
  } catch {
    return fallback;
  }
}

function joinParts(...parts: Array<string | undefined | false>): string {
  return parts
    .map((p) => (typeof p === "string" ? p.trim() : ""))
    .filter(Boolean)
    .join(" ");
}

/** Start plate: 3 bands set, crossing just beginning. */
export function buildSocialDripStillPrompt(input: {
  plan: SocialDripPlan;
  product: string;
  conceptMode?: boolean;
  aspectRatio?: string;
  frame: "start" | "end";
}): string {
  const aspect =
    input.aspectRatio === "4:5" || input.aspectRatio === "1:1"
      ? input.aspectRatio
      : "9:16";
  const hero = input.conceptMode
    ? `CONCEPT hero (top band): service/idea scene for “${input.product}” — no fake product bottle, no packshot SKU. Leave a clear pour origin at top-center.`
    : `PRODUCT hero (top band): photoreal “${input.product}” as the clear hero (honor IMAGE 1 pixels when attached). Pour origin = product mouth / dropper tip / top center — aligned to vertical midline.`;

  const chrome = joinParts(
    "MIDDLE ~18%: fake Instagram chrome as a WHITE horizontal card (exact UI, sharp, not garbled):",
    `circular avatar, verified name “${input.plan.igHandle}”, heart / comment / share / bookmark icons in a row, caption “${input.plan.igCaption}”.`,
    "This chrome is a PHYSICAL GATE the pour must cross OVER (in front of / across the icons), not a soft glow behind it.",
  );

  const character = joinParts(
    "BOTTOM ~40%: clean light panel with visible FLOOR surface — open space above the character.",
    SOCIAL_DRIP_CARTOON_CHARACTER_LOCK,
    `Character pose / beat: ${input.plan.characterBeat}`,
    "Character catch point MUST sit on the SAME vertical centerline as the product pour origin.",
  );

  const crossingPhysics = joinParts(
    `Crossing metaphor (${input.plan.metaphorId}): ${input.plan.crossingDescription}`,
    `Landing: ${input.plan.landingDescription}`,
    "FORBIDDEN: wispy light ribbons looping the bottle, decorative lens flares, side swirls that never cross the chrome, two disconnected stickers.",
    input.plan.metaphorId !== "pour"
      ? "FORBIDDEN for this metaphor: open-mouth drinking / ingestion gag (that is F&B pour only)."
      : false,
  );

  if (input.frame === "start") {
    return joinParts(
      `Design a single ${aspect} SOCIAL-DRIP (三分屏) START keyframe — ONE image, THREE stacked bands on a dark subtle grid backdrop.`,
      "TOP ~42% / MIDDLE ~18% / BOTTOM ~40%. Fixed front orthographic camera.",
      hero,
      chrome,
      character,
      crossingPhysics,
      "START state (incomplete crossing — required for H3 motion):",
      "- The crossing has JUST begun at the hero origin (1–2 drops / first particles / short tongue) — not a finished column.",
      "- The stream has NOT reached the middle Instagram chrome yet.",
      "- Bottom floor is still clean. Character waits under the future fall path.",
      "- Do NOT draw a finished ribbon connecting top→bottom already.",
      "No phone status bar, no extra watermarks, no real Instagram app chrome outside our fake middle card.",
    );
  }

  return joinParts(
    `Design a single ${aspect} SOCIAL-DRIP (三分屏) END keyframe — SAME layout family as the start plate (IMAGE 1 when attached).`,
    "TOP ~42% / MIDDLE ~18% / BOTTOM ~40%. Fixed front orthographic camera. Keep IG chrome text/icons identical and sharp.",
    hero,
    chrome,
    character,
    crossingPhysics,
    "END state (completed crossing — required payoff):",
    "- ONE continuous readable fall from the hero origin, OVER the middle chrome (crossing the icon row), down into the bottom panel.",
    `- Landing matches metaphor: ${input.plan.landingDescription}`,
    "- Same product identity and same chrome pixels as start — only the crossing progress + landing change.",
    "No phone status bar, no extra watermarks.",
  );
}

/** H3 start→end motion prompt from plan. */
export function buildSocialDripVideoPrompt(input: {
  plan: SocialDripPlan;
  product: string;
  durationSec: number;
  conceptMode?: boolean;
}): string {
  const hero = input.conceptMode
    ? `Keep the same concept scene identity for “${input.product}”.`
    : `Keep the same product identity for “${input.product}” (IMAGE 1 → IMAGE 2).`;
  return joinParts(
    `Animate a viral social-drip 三分屏 clip (~${input.durationSec}s): FIXED camera, Instagram chrome + all text/icons must stay sharp and STABLE (no warp, no new letters).`,
    hero,
    `ONLY animate the crossing: ${input.plan.crossingDescription}`,
    `Landing payoff: ${input.plan.landingDescription}`,
    `Character: ${input.plan.characterBeat}`,
    "Keep the bottom character as the SAME cute polished cartoon — do not morph into a photoreal person, do not invent furniture over their face, do not degrade into a rough stick figure.",
    "Image 1 = START (crossing just beginning, not through chrome). Image 2 = END (continuous fall over chrome into the metaphor landing).",
    "Motion must read as gravity fall along one vertical centerline — NOT a glowing ribbon shimmering in place.",
    "Do not move the product off-center. Do not invent a second location. No hard cut. No busy TVC.",
  );
}
