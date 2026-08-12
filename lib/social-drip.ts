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
  | "good_concept_falling"
  | "caution_mouth_nonfood"
  | "caution_beauty_pour"
  | "caution_concept_pour"
  | "caution_concept_abstract"
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
 * Bottom-band character — match viral 三分屏 (AIGC-洋咩咩 / KFC cheese gag):
 * simple line-art PERSON lying on their back, not a standing chibi or product mascot.
 */
export const SOCIAL_DRIP_CARTOON_CHARACTER_LOCK = [
  "BOTTOM character: a SIMPLE cute 2D LINE-ART person (thin blue or black outline on white, chef/kid/office doodle style).",
  "Pose: lying on their BACK on the floor, face looking UP, under the fall centerline — joyful, meme-like.",
  "NOT a standing 3D chibi, NOT a photoreal person, NOT a cartoon of the product (no burger-mascot under a burger).",
  "Same doodle identity from start→end. Clean white floor, no table, no furniture overhead.",
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
      "thick melted cheese / sauce / syrup column falls from the PRODUCT itself (not from an extra squeeze bottle unless the hero IS a bottle) — one opaque vertical stream, readable over the middle chrome",
    characterDefault:
      "simple line-art person lying on their BACK, mouth wide open under the stream, looking up joyfully (viral 三分屏 chef-doodle pose)",
    landingDefault:
      "stream hits the OPEN MOUTH then puddles on the white floor beside the doodle",
    allowMouthCatch: true,
  },
  glow: {
    label: "Serum drip",
    categories: ["beauty", "wellness", "general"],
    crossingDefault:
      "a thin-to-medium amber SERUM stream falls from the dropper TIP only (same liquid as the bottle) — readable vertical drip, NOT a syrup hose, NOT a decorative light ribbon looping the bottle",
    characterDefault:
      "simple line-art person lying on their BACK looking UP, mouth closed / soft smile, cheeks under the drip (not drinking)",
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
      "simple line-art person lying on their BACK, hands open under the cascade",
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
      "simple line-art person lying on their BACK under the plume, cozy inhale",
    landingDefault:
      "plume reaches the cartoon face; soft mist gathers near the bottom panel floor — no syrup puddle",
    allowMouthCatch: false,
  },
  confetti: {
    label: "Confetti fall",
    categories: ["fashion", "general", "concept"],
    crossingDefault:
      "5–8 LARGE poster/phone/color cards fall in ONE vertical column (readable pieces) — never a swarm of 30+ tiny shards",
    characterDefault:
      "simple line-art person lying on their BACK, arms open under the fall",
    landingDefault:
      "a small pile of the same large cards around the doodle on the white floor",
    allowMouthCatch: false,
  },
  "light-streak": {
    label: "Energy beam",
    categories: ["electronics", "general", "concept"],
    crossingDefault:
      "a thick bright ENERGY BEAM / liquid-light column shoots straight down from the device (solid readable beam, not a thin decorative ribbon looping the product)",
    characterDefault:
      "simple line-art person lying on their BACK looking up under the beam, eyes wide",
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
      "simple line-art person lying on their BACK catching the ribbon with open hands",
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
      "simple line-art person lying on their BACK under the cascade, face/hands open",
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
      // Abstract services → dense confetti/cards falling (= materials arriving), not liquid pour.
      return "confetti";
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

  // Concept needs a visual “falling materials” gag — abstract slogans alone are weak.
  if (input.conceptMode) {
    const idea = [
      input.conceptIdea,
      input.headline,
      input.product,
    ]
      .filter(Boolean)
      .join(" ");
    const hasFallingCue =
      /素材|素材包|卡片|海报|海報|輪播|轮播|模板|creative|asset|template|carousel|confetti|fall|到手|下載|下载|deliver|drop/i.test(
        idea,
      );
    if (!hasFallingCue) {
      reasons.push("caution_concept_abstract");
      suggestedMetaphor = suggestedMetaphor ?? "confetti";
      level = "caution";
    } else if (reasons.length === 0) {
      reasons.push("good_concept_falling");
    }
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
      case "concept":
        if (!reasons.includes("good_concept_falling")) {
          reasons.push("good_concept_falling");
        }
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

export function socialDripHandleFromName(name: string): string {
  return (
    name
      .replace(/[^\w\u4e00-\u9fff]+/g, "_")
      .replace(/^_|_$/g, "")
      .slice(0, 18)
      .toLowerCase() || "brand"
  );
}

export function heuristicSocialDripPlan(input: {
  product?: string;
  conceptIdea?: string;
  headline?: string;
  business?: string;
  /** Preferred IG handle source (Brand profile / kit name). */
  brandName?: string;
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
  // Handle = brand/business, never the product SKU (avoids “漢堡” under a burger).
  const handleSource =
    input.brandName?.trim() ||
    input.business?.trim() ||
    (input.conceptMode ? input.conceptIdea?.trim() : "") ||
    "brand";
  const handle = socialDripHandleFromName(handleSource);
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
  brandName?: string;
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
  const preferredHandle = socialDripHandleFromName(
    input.brandName?.trim() ||
      input.business?.trim() ||
      subject,
  );

  const system = `You plan a viral vertical 3-band “social drip / 三分屏” ad for Alchemy AI Lab.
Layout contract (ALWAYS, match viral 三分屏): photoreal product TOP → thin Instagram chrome MIDDLE (real brand handle + logo) → simple LINE-ART person lying on their BACK at BOTTOM. Something readable crosses IN FRONT OF the chrome on one vertical centerline.
Bottom character: 2D outline doodle person (chef/kid), not photoreal, not standing chibi, not a cartoon of the product.

Pick ONE metaphor id from: ${SOCIAL_DRIP_METAPHOR_IDS.join(", ")}.
Hard rules by category:
- F&B → "pour" with open-mouth catch + floor puddle (edible gag OK) onto a cartoon PERSON.
- Beauty / skincare → "glow" as a thin serum drip from the dropper TIP onto CHEEKS/skin — mouth CLOSED, NEVER drinking serum, NO furniture blocking the face.
- Jewelry → sparkle cascade onto hands. Fashion → confetti/fabric. Electronics → energy beam. Wellness → steam/petals.
- Crossing MUST be a dense vertical fall — FORBIDDEN: wispy light ribbons, soft decorative glow swirls that never cross chrome.
- Concept/service: NEVER invent a fake SKU bottle. Hero must show falling creative assets (posters/cards/mockups). Prefer metaphor "confetti". igCaption MUST reuse the user's headline/topic wording — do not invent a different slogan.
- igHandle: prefer “${preferredHandle}” unless empty.
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
    brandName: input.brandName ?? "",
    preferredIgHandle: preferredHandle,
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
  /** 1-based fal IMAGE index for Brand kit logo (avatar lock). */
  brandLogoImageIndex?: number;
}): string {
  const aspect =
    input.aspectRatio === "4:5" || input.aspectRatio === "1:1"
      ? input.aspectRatio
      : "9:16";
  const hero = input.conceptMode
    ? joinParts(
        `TOP: concept scene for “${input.product}”.`,
        "Show a SMALL stack of creative assets at top-center (phone mockups / poster cards / color chips) as the fall origin.",
        `Headline once only in clean white type: “${input.plan.igCaption || input.product}”.`,
        "FORBIDDEN: empty light beams, fake product bottles, repeating the headline a second time as giant bottom typography.",
      )
    : `TOP: photoreal “${input.product}” (keep IMAGE 1 identity). Liquid/fall comes FROM the product itself — do not invent an extra squeeze bottle or pitcher unless the product is that bottle.`;

  const logoIdx = input.brandLogoImageIndex;
  const avatarLock =
    typeof logoIdx === "number" && logoIdx >= 1
      ? `Avatar = IMAGE ${logoIdx} brand logo cropped in a circle (exact mark). Do not invent a different logo.`
      : `Avatar = plain grey/beige circle only. Do not invent a letter-A or fake brand mark.`;

  // Short caption on chrome — long slogans warp under H3.
  const chromeCaption = (input.plan.igCaption || input.product)
    .trim()
    .slice(0, 28);

  const chrome = joinParts(
    "MIDDLE: one thin white Instagram bar (icons sharp, not garbled):",
    avatarLock,
    `handle “${input.plan.igHandle}” + verified badge, heart/comment/share/bookmark, short caption “${chromeCaption}”.`,
    "The fall must go IN FRONT OF this bar (covering the icon row). Not behind the card.",
  );

  const character = joinParts(
    "BOTTOM: white floor panel.",
    SOCIAL_DRIP_CARTOON_CHARACTER_LOCK,
    input.plan.characterBeat,
  );

  const noAnnotations =
    "Finished ad only — never paint TOP/MIDDLE/BOTTOM, percentages, arrows, or layout labels. No phone status bar.";

  if (input.conceptMode) {
    // Concept motion fails when start≈end with 30+ cards already mid-stream.
    // Keep a burger-like progressive gag: few large pieces, clear incomplete→complete.
    if (input.frame === "start") {
      return joinParts(
        `One ${aspect} viral 三分屏 START still on a dark subtle grid.`,
        hero,
        chrome,
        character,
        "Crossing: 3–5 LARGE creative cards only (phone/poster/swatch), readable, not a swarm of tiny shards.",
        "START (critical for motion): cards sit at the TOP cluster only — at most 1 card just leaving. Gap of empty dark space above the Instagram bar. NOTHING crossing the bar yet. Floor empty. Doodle waiting arms open.",
        "Do NOT draw a finished waterfall already. Do NOT add extra giant stylized title text at the bottom.",
        noAnnotations,
      );
    }
    return joinParts(
      `One ${aspect} viral 三分屏 END still. Same layout family as start (IMAGE 1 when attached). Same chrome pixels and same doodle identity.`,
      hero,
      chrome,
      character,
      "Crossing: ONE continuous column of 5–8 LARGE creative cards falling top→over Instagram icons→bottom (same gag as sauce pour, but cards).",
      "END: cards visibly cover the IG icon row, then pile around the doodle on the white floor. Doodle joyful.",
      "Keep card count low and large — FORBIDDEN: dozens of tiny overlapping fragments, morphing text, new giant bottom title that was not on the start plate.",
      noAnnotations,
    );
  }

  if (input.frame === "start") {
    return joinParts(
      `One ${aspect} viral 三分屏 START still on a dark subtle grid. Three stacked bands, no labels.`,
      hero,
      chrome,
      character,
      `Crossing: ${input.plan.crossingDescription}`,
      "START: only the first drip/particles leaving the hero — stream has NOT reached the Instagram bar yet. Floor dry. Doodle waiting.",
      noAnnotations,
    );
  }

  return joinParts(
    `One ${aspect} viral 三分屏 END still. Same layout as start (IMAGE 1 when attached). Same chrome pixels.`,
    hero,
    chrome,
    character,
    `Crossing: ${input.plan.crossingDescription}`,
    `Landing: ${input.plan.landingDescription}`,
    "END: one continuous thick column from product, OVER the Instagram icons, into the doodle landing. No extra props.",
    noAnnotations,
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
    `Animate ~${input.durationSec}s viral 三分屏. Fixed camera. Keep IG text/icons sharp.`,
    hero,
    `Animate ONLY the fall: ${input.plan.crossingDescription}`,
    `Payoff: ${input.plan.landingDescription}`,
    `Keep the same line-art person: ${input.plan.characterBeat}`,
    "Beat: drip leaves product → crosses IN FRONT of the IG bar → lands on the doodle. Do not hide behind the card. Do not skip the middle.",
    input.conceptMode
      ? "Concept motion: animate only a few LARGE cards sliding downward along one centerline — do not morph dozens of tiny shards or invent new text."
      : false,
    "Image 1 = start (drip just begun). Image 2 = end (column over chrome into landing).",
    "No layout labels. No extra squeeze bottle. No morphing the doodle into photoreal or a product mascot.",
  );
}
