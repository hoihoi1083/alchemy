/**
 * 動態海報 motion dialects — distinct H3-attemptable looks (not one card-warp forever).
 * Auto pick = product/tone fit, not SKU identity. IMAGE 1 pixels still win.
 */

export const MOTION_POSTER_DIALECT_IDS = [
  "card-warp",
  "kinetic-type",
  "parallax",
  "light-sweep",
  "liquid-reveal",
  "scene-breathe",
  "designed-poster",
] as const;

export type MotionPosterDialectId = (typeof MOTION_POSTER_DIALECT_IDS)[number];
export type MotionPosterDialectPick = MotionPosterDialectId | "auto";

export function motionPosterDialectPreviewSrc(
  id: MotionPosterDialectId,
): string {
  return `/images/studio/schemes/motion-poster/${id}.png?v=1`;
}

export type MotionPosterTone =
  | "fnb"
  | "dessert"
  | "beauty"
  | "jewelry"
  | "fashion"
  | "wellness"
  | "estate"
  | "general"
  | "concept";

export type MotionPosterDialectDef = {
  id: MotionPosterDialectId;
  tones: readonly MotionPosterTone[];
  motionStrength: number;
  stillLayout: string;
  /** Concept/service still — no SKU packshot language. */
  stillLayoutConcept: string;
  /** 即梦 首帧 — one clear start state vs the typed end frame. */
  startBeat: string;
  startBeatConcept: string;
  /** 即梦 尾帧 — payoff pose + designed masthead. */
  endBeat: string;
  endBeatConcept: string;
  videoLead: string;
  videoLeadConcept: string;
  kineticTypeLine: string;
  microMotions: readonly string[];
  microMotionsConcept?: readonly string[];
};

/** Loop-mode H3: never write letters (type is not on the still). */
export const MOTION_POSTER_H3_TEXTLESS_LINE =
  "TEXTLESS FRAME: do not invent on-screen text, logos, captions, or watermarks. Typography is burned after video.";

export const MOTION_POSTER_DIALECTS: Record<MotionPosterDialectId, MotionPosterDialectDef> = {
  "card-warp": {
    id: "card-warp",
    tones: ["general", "fashion", "beauty"],
    motionStrength: 62,
    stillLayout:
      "Designed 9:16 poster plate: one hero on a studio/C4D surface, cream or solid backdrop. Top ~20% empty masthead sky. ZERO readable marketing text.",
    stillLayoutConcept:
      "Designed 9:16 concept poster: service/idea scene mid-frame, top masthead empty. No fake SKU. ZERO readable marketing text.",
    startBeat:
      "START: hero almost frontal, graphic-card flat on the surface — not yet warped.",
    startBeatConcept:
      "START: scene almost frontal, graphic-card flat — not yet warped.",
    endBeat:
      "END: same card yawed ~20° with a paper warp; oversized masthead type sits ON the card surface.",
    endBeatConcept:
      "END: same scene yawed ~20° with a paper warp; oversized masthead type sits ON the card.",
    videoLead:
      "Animate the poster as a physical 3D graphic card: the hero turns with a paper warp / gentle rotate — motion must be obvious. Textless scene only.",
    videoLeadConcept:
      "Animate the concept poster as a physical 3D graphic card: the scene turns with a paper warp / gentle rotate — motion must be obvious. Textless scene only.",
    kineticTypeLine: MOTION_POSTER_H3_TEXTLESS_LINE,
    microMotions: [
      "3D paper/card warp PLUS a visible slow yaw of the hero product (same bottle/object, new angle)",
      "masthead type lands on the warping card by matching Image 2 pixels",
      "same SKU identity — no morph into a different product",
      "no second location",
    ],
  },
  "kinetic-type": {
    id: "kinetic-type",
    tones: ["general", "beauty", "fnb", "concept"],
    motionStrength: 64,
    stillLayout:
      "Designed 9:16 commercial poster: product hero mid-frame, oversized empty top masthead band. Soft studio or shallow-DOF set. ZERO readable marketing text.",
    stillLayoutConcept:
      "Designed 9:16 concept poster: scene mid-frame, oversized empty top masthead. Not a fake product bottle. ZERO readable marketing text.",
    startBeat:
      "START: slightly wider / more distant hero, empty top masthead — classic 即梦 type-reveal first frame.",
    startBeatConcept:
      "START: slightly wider scene, empty top masthead — type-reveal first frame.",
    endBeat:
      "END: camera closer or hero turned 15–25°; LARGE designed masthead headline painted in the top band (not a tiny caption).",
    endBeatConcept:
      "END: camera push-in or subject turned; LARGE designed masthead headline in the top band.",
    videoLead:
      "Animate as a designed poster: hero slowly turns or floats while light drifts. Typography is added after — do not invent letters.",
    videoLeadConcept:
      "Animate as a designed concept poster: subject slowly turns or the camera pushes in. Typography is added after — do not invent letters.",
    kineticTypeLine: MOTION_POSTER_H3_TEXTLESS_LINE,
    microMotions: [
      "visible hero motion: slow 15–25° turn, float, or settle onto the surface",
      "camera ease-in so the product silhouette changes while type blooms into Image 2 layout",
      "same product identity — no morph",
      "no second location, no live-action walkthrough",
    ],
    microMotionsConcept: [
      "visible subject motion: turn, fabric/hair drift, or a clear camera push-in",
      "type blooms into Image 2 masthead — camera ease so the frame is not a freeze",
      "same scene identity — no fake SKU morph",
      "no second location, no live-action walkthrough, no fake SKU hero",
    ],
  },
  parallax: {
    id: "parallax",
    tones: ["general", "jewelry", "fashion", "estate"],
    motionStrength: 58,
    stillLayout:
      "Designed 9:16 layered poster: clear depth planes, empty top masthead; product on a nearer plane. ZERO readable marketing text.",
    stillLayoutConcept:
      "Designed 9:16 layered concept poster: lifestyle/service forward, backdrop deep, empty top masthead. No SKU packshot. ZERO readable marketing text.",
    startBeat:
      "START: wider establishing — backdrop + props dominate, product smaller/farther, no type.",
    startBeatConcept:
      "START: wider establishing of the venue/idea — subject smaller/farther, no type.",
    endBeat:
      "END: closer hero, layers compressed; oversized masthead type in the top band.",
    endBeatConcept:
      "END: closer scene, layers compressed; oversized masthead type in the top band.",
    videoLead:
      "Animate as a layered poster: product nearer and drifting vs a deeper backdrop. Parallax must be obvious. Textless.",
    videoLeadConcept:
      "Animate as a layered concept poster: subject nearer, backdrop deeper. Parallax must be obvious. Textless.",
    kineticTypeLine: MOTION_POSTER_H3_TEXTLESS_LINE,
    microMotions: [
      "foreground product slides/drifts opposite the background (clear parallax, not a 1px nudge)",
      "slow camera push from wide start to close end while type appears from Image 2",
      "same SKU identity — no morph",
      "no invented captions",
    ],
    microMotionsConcept: [
      "foreground scene drifts opposite the background (clear parallax)",
      "slow camera push or lateral truck while type appears from Image 2",
      "same scene identity — no fake SKU morph",
      "no invented captions",
    ],
  },
  "light-sweep": {
    id: "light-sweep",
    tones: ["beauty", "jewelry"],
    motionStrength: 60,
    stillLayout:
      "Designed 9:16 premium poster: rim-light edge, dark-to-light contrast, empty top masthead. Product unobstructed. ZERO readable marketing text.",
    stillLayoutConcept:
      "Designed 9:16 premium concept poster: rim-light, dark-to-light, empty top masthead. Scene unobstructed. ZERO readable marketing text.",
    startBeat:
      "START: dimmer, product more silhouette — rim barely started.",
    startBeatConcept:
      "START: dimmer scene, rim barely started.",
    endBeat:
      "END: hero fully lit with caustic/sparkle; LARGE masthead type in the top band.",
    endBeatConcept:
      "END: scene fully lit with a light sweep; LARGE masthead type in the top band.",
    videoLead:
      "Animate as a premium product turntable: slow hero rotate while a caustic / sparkle sweep traces edges. Textless — type is added after.",
    videoLeadConcept:
      "Animate as a premium concept poster: subject turns or camera orbits while light sweeps. Textless — type is added after.",
    kineticTypeLine: MOTION_POSTER_H3_TEXTLESS_LINE,
    microMotions: [
      "slow product rotate / tilt so glass, liquid, and cap catch new highlights",
      "rim / caustic / sparkle sweep across the moving product while type blooms from Image 2",
      "same SKU — no foam explosion, no new props that change the product",
      "no invented captions",
    ],
    microMotionsConcept: [
      "subject turns or camera orbits while a light sweep traces the scene",
      "highlights travel — not a frozen still with only bokeh",
      "no fake SKU packaging, no second location",
      "no invented captions",
    ],
  },
  "liquid-reveal": {
    id: "liquid-reveal",
    tones: ["fnb", "concept"],
    motionStrength: 66,
    stillLayout:
      "Designed 9:16 F&B poster: leave a wipe path across the middle; top masthead empty. Splash-safe lower band. ZERO readable marketing text.",
    stillLayoutConcept:
      "Designed 9:16 sensory poster: wipe path across the middle; top/bottom clear. Cafe/spa mood, not a product catalog. ZERO readable marketing text.",
    startBeat:
      "START: vessel calm/dry — no pour yet, empty masthead.",
    startBeatConcept:
      "START: still air / dry scene — mist not yet peaked, empty masthead.",
    endBeat:
      "END: pour/steam/cream peak, vessel slightly turned; LARGE masthead type landed.",
    endBeatConcept:
      "END: mist/wash peak, subject shifted; LARGE masthead type landed.",
    videoLead:
      "Animate as a F&B motion poster: steam/pour/mist PLUS the hero cup or bottle shifting, liquid inside moving. Fluid and product both move. Do not invent letters.",
    videoLeadConcept:
      "Animate as a sensory motion poster: mist / wash / soft wipe AND the hero subject shifts. Not a tutorial. Do not invent letters.",
    kineticTypeLine: MOTION_POSTER_H3_TEXTLESS_LINE,
    microMotions: [
      "pour / steam / mist / cream wipe across the scene",
      "hero vessel turns or liquid inside sloshes / bubbles — product is not frozen",
      "type blooms from Image 2 after the wipe, not as a floating caption bar",
      "no second kitchen, no hands cooking a recipe",
      "no invented captions",
    ],
  },
  "scene-breathe": {
    id: "scene-breathe",
    tones: ["wellness", "concept", "fnb"],
    motionStrength: 56,
    stillLayout:
      "Designed 9:16 magazine poster: airy negative space in the top masthead. Soft scene, not a busy promo grid. ZERO readable marketing text.",
    stillLayoutConcept:
      "Designed 9:16 magazine concept poster: airy top masthead. Soft class/spa/idea scene — not a fake SKU. ZERO readable marketing text.",
    startBeat:
      "START: still air, talent/product held — particles not yet drifting.",
    startBeatConcept:
      "START: still air, subject held — ambient not yet drifting.",
    endBeat:
      "END: petals/fabric/dust settled into a stronger pose; LARGE masthead type in the airy band.",
    endBeatConcept:
      "END: ambient breathe settled; LARGE masthead type in the airy band.",
    videoLead:
      "Animate as a living poster: hero or talent has a visible breathe/settle plus ambient particles. Not a freeze-frame. Textless.",
    videoLeadConcept:
      "Animate as a living concept poster: subject breathes or camera pushes in. Not a multi-scene TVC. Textless.",
    kineticTypeLine: MOTION_POSTER_H3_TEXTLESS_LINE,
    microMotions: [
      "visible body/product settle or slow turn — not only steam",
      "ambient breathe: steam, petals, fabric, dust motes, or soft foliage",
      "type fades into Image 2 masthead as the scene settles",
      "no location change, no tutorial steps",
      "no invented captions",
    ],
  },
  "designed-poster": {
    id: "designed-poster",
    tones: ["dessert", "fnb", "beauty", "concept", "general"],
    motionStrength: 60,
    stillLayout:
      "Designed 9:16 commercial feed poster plate: appetite/product hero mid-lower frame, soft upper-left key light, reserved zones for bilingual masthead + circular seal + brush category word. ZERO readable marketing text on START.",
    stillLayoutConcept:
      "Designed 9:16 commercial concept poster: scene hero mid-lower frame, soft upper-left light, reserved zones for bilingual masthead + seal + brush category. Not a fake SKU. ZERO readable marketing text on START.",
    startBeat:
      "START: hero almost frontal on the set — empty type zones (masthead / seal / brush word not yet painted).",
    startBeatConcept:
      "START: scene almost frontal — empty type zones (masthead / seal / brush not yet painted).",
    endBeat:
      "END: hero turned 10–20° or slightly closer; bilingual CN+EN masthead stack, circular seal, and large brush category word all painted in reserved zones — finished XHS/IG designed poster.",
    endBeatConcept:
      "END: subject shifted; bilingual masthead stack, circular seal, and brush category word painted — finished designed poster (not a white flyer).",
    videoLead:
      "Animate as a designed commercial poster: hero slowly turns or steam/sauce drifts while type blooms into Image 2 pixels (bilingual stack + seal + brush word). Do not invent different letters.",
    videoLeadConcept:
      "Animate as a designed commercial concept poster: subject shifts while bilingual type + seal + brush word bloom into Image 2. Do not invent different letters.",
    kineticTypeLine: MOTION_POSTER_H3_TEXTLESS_LINE,
    microMotions: [
      "visible hero turn / float / settle — silhouette changes in the first 2s",
      "bilingual masthead + circular seal + brush category word bloom into Image 2 layout only",
      "same SKU identity — no morph into a different product",
      "no blank catalog cutout, no second kitchen/tutorial",
      "no invented captions or post-burn subtitle bars",
    ],
    microMotionsConcept: [
      "visible subject motion or camera push-in",
      "bilingual masthead + seal + brush category bloom into Image 2",
      "same scene identity — no fake SKU morph",
      "no white info-flyer look, no tutorial steps",
      "no invented captions",
    ],
  },
};

const TONE_PATTERNS: readonly [MotionPosterTone, RegExp][] = [
  [
    "dessert",
    /dessert|cake|souffl[eé]|bagel|bakery|pastry|tart|mousse|pudding|macaron|croissant|bun|面包|麵包|甜品|蛋糕|贝果|貝果|软欧|軟歐|挞|撻|布丁|慕斯|舒芙蕾|马卡龙|馬卡龍/i,
  ],
  [
    "fnb",
    /coffee|latte|cafe|café|tea|drink|wine|beer|juice|soda|cocktail|matcha|dirty\s*coffee|咖啡|拿铁|拿鐵|茶|酒|飲|饮|果汁|汽水|美食|甜品/i,
  ],
  [
    "beauty",
    /serum|cream|skin|beauty|makeup|lotion|sunscreen|toner|mask|美|护肤|護膚|妆|妝|面膜|精华|精華|防晒|防曬/i,
  ],
  [
    "jewelry",
    /jade|gold|bead|crystal|pearl|bracelet|ring|necklace|gem|珠|石|金|銀|银|手串|手链|手鍊|玉|水晶/i,
  ],
  ["fashion", /bag|shoe|dress|fashion|apparel|jacket|衣|包|鞋|裙|帽|时装|時裝/i],
  [
    "wellness",
    /yoga|spa|salon|massage|coach|fitness|pilates|class|course|workshop|lesson|瑜|按摩|課程|课程|班|課|培訓|培训|教育|補習|健身|咨詢|諮詢|冥想|芳療/i,
  ],
  [
    "estate",
    /property|apartment|estate|interior|realty|樓|房|地產|地产|家居|樓盤|楼盘/i,
  ],
];

export function isMotionPosterDialectId(value: unknown): value is MotionPosterDialectId {
  return MOTION_POSTER_DIALECT_IDS.includes(String(value ?? "") as MotionPosterDialectId);
}

export function parseMotionPosterDialectPick(raw: unknown): MotionPosterDialectPick {
  const v = String(raw ?? "").trim();
  if (v === "auto" || isMotionPosterDialectId(v)) return v;
  return "auto";
}

export function inferMotionPosterTones(input: {
  product?: string;
  headline?: string;
  subline?: string;
  extra?: string;
  conceptIdea?: string;
  conceptMode?: boolean;
}): MotionPosterTone[] {
  const blob = [
    input.product,
    input.headline,
    input.subline,
    input.extra,
    input.conceptIdea,
  ]
    .map((s) => String(s ?? "").trim())
    .filter(Boolean)
    .join(" ");
  const tones = new Set<MotionPosterTone>();
  for (const [tone, re] of TONE_PATTERNS) {
    if (re.test(blob)) tones.add(tone);
  }
  if (input.conceptMode) tones.add("concept");
  if (tones.size === 0 || (tones.size === 1 && tones.has("concept"))) {
    tones.add("general");
  }
  return [...tones];
}

function scoreDialect(def: MotionPosterDialectDef, tones: MotionPosterTone[]): number {
  let score = 0;
  for (const t of tones) {
    if (def.tones.includes(t)) score += t === "general" ? 1 : 3;
  }
  return score;
}

export function resolveMotionPosterDialect(input: {
  pick?: MotionPosterDialectPick;
  product?: string;
  headline?: string;
  subline?: string;
  extra?: string;
  conceptIdea?: string;
  conceptMode?: boolean;
  excludeId?: MotionPosterDialectId | null;
  /** Preview / tests: top fit, no shuffle. */
  stable?: boolean;
}): { id: MotionPosterDialectId; reason: "user" | "product-fit"; tones: MotionPosterTone[] } {
  const pick = parseMotionPosterDialectPick(input.pick);
  const tones = inferMotionPosterTones(input);
  if (pick !== "auto") {
    return { id: pick, reason: "user", tones };
  }
  const ranked = MOTION_POSTER_DIALECT_IDS
    .map((id) => MOTION_POSTER_DIALECTS[id])
    .map((def) => ({ def, score: scoreDialect(def, tones) }))
    .sort(
      (a, b) =>
        b.score - a.score || a.def.tones.length - b.def.tones.length,
    );
  const topScore = ranked[0]?.score ?? 0;
  let pool = ranked.filter((r) => r.score >= Math.max(1, topScore - 2)).map((r) => r.def.id);
  if (input.excludeId) {
    const without = pool.filter((id) => id !== input.excludeId);
    if (without.length) pool = without;
    else {
      pool = MOTION_POSTER_DIALECT_IDS.filter((id) => id !== input.excludeId);
    }
  }
  if (!pool.length) pool = [...MOTION_POSTER_DIALECT_IDS];
  if (input.stable) {
    return { id: pool[0]!, reason: "product-fit", tones };
  }
  const id = pool[Math.floor(Math.random() * pool.length)]!;
  return { id, reason: "product-fit", tones };
}
