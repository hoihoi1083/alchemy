/**
 * Impact poster — motion-poster cousin with stronger product thrust + particle punch.
 * 大透视 / high-impact product poster → start (textless) → end (typed) → MiniMax H3 morph.
 * User picks tone (palette/vibe) + effect (VFX grammar). Auto resolves from product copy.
 */

export const IMPACT_POSTER_DURATION_SEC = 6;

export const IMPACT_POSTER_TONE_IDS = [
  "fiery",
  "rugged",
  "premium",
  "cyber",
] as const;

export type ImpactPosterToneId = (typeof IMPACT_POSTER_TONE_IDS)[number];
export type ImpactPosterTonePick = ImpactPosterToneId | "auto";

export const IMPACT_POSTER_EFFECT_IDS = [
  "shatter-burst",
  "energy-rays",
  "debris-splash",
  "lightning-pulse",
] as const;

export type ImpactPosterEffectId = (typeof IMPACT_POSTER_EFFECT_IDS)[number];
export type ImpactPosterEffectPick = ImpactPosterEffectId | "auto";

export type ImpactPosterFrame = "start" | "end";

export function impactPosterTonePreviewSrc(id: ImpactPosterToneId): string {
  return `/images/studio/schemes/impact-poster/tone-${id}.png?v=2`;
}

export function impactPosterEffectPreviewSrc(id: ImpactPosterEffectId): string {
  return `/images/studio/schemes/impact-poster/effect-${id}.png?v=2`;
}

/** UI color chips so tone cards read as palette worlds, not product photos. */
export const IMPACT_POSTER_TONE_SWATCHES: Record<
  ImpactPosterToneId,
  readonly string[]
> = {
  fiery: ["#ff6a00", "#ff2d2d", "#1a0500"],
  rugged: ["#6b7c3a", "#8b5a2b", "#1c1917"],
  premium: ["#d4af37", "#f5e6c8", "#0a0a0a"],
  cyber: ["#a855f7", "#22d3ee", "#020617"],
};

export type ImpactPosterToneDef = {
  id: ImpactPosterToneId;
  /** Palette + atmosphere for stills/video */
  look: string;
  keywords: readonly string[];
  defaultEffect: ImpactPosterEffectId;
};

export type ImpactPosterEffectDef = {
  id: ImpactPosterEffectId;
  startVfx: string;
  endVfx: string;
  videoLead: string;
  motionStrength: number;
};

export const IMPACT_POSTER_TONES: Record<ImpactPosterToneId, ImpactPosterToneDef> =
  {
    fiery: {
      id: "fiery",
      look:
        "FIERY palette LOCK — molten ORANGE / RED / ember rim light only on a deep black void. Heat haze, chili energy, snack-ad saturation. " +
        "FORBIDDEN in this tone: champagne gold luxury, cool blue, purple neon cyber, muted earth dust.",
      keywords: [
        "chip",
        "chips",
        "snack",
        "spicy",
        "chili",
        "pepper",
        "crunch",
        "hot",
        "flame",
        "fire",
        "辣",
        "脆",
        "薯片",
        "零食",
      ],
      defaultEffect: "shatter-burst",
    },
    rugged: {
      id: "rugged",
      look:
        "RUGGED palette LOCK — earthy OLIVE / BROWN / charcoal, dust and grit, low dramatic angle. Outdoor / bike / gear power. " +
        "FORBIDDEN: orange fire snack look, gold jewelry polish, purple neon.",
      keywords: [
        "bike",
        "bicycle",
        "mtb",
        "trail",
        "ride",
        "dirt",
        "outdoor",
        "adventure",
        "suv",
        "truck",
        "靴",
        "山地",
        "越野",
      ],
      defaultEffect: "debris-splash",
    },
    premium: {
      id: "premium",
      look:
        "PREMIUM palette LOCK — deep BLACK + soft GOLD / champagne speculars only, elegant glitter dust. Hi-fi / jewelry polish. " +
        "FORBIDDEN: orange/red fire, chili snack energy, purple/cyan cyber neon, dusty outdoor grit.",
      keywords: [
        "headphone",
        "earbud",
        "airpod",
        "audio",
        "gold",
        "luxury",
        "premium",
        "watch",
        "jewelry",
        "香水",
        "耳机",
        "奢",
      ],
      defaultEffect: "energy-rays",
    },
    cyber: {
      id: "cyber",
      look:
        "CYBER palette LOCK — black void + electric PURPLE + CYAN neon only, iridescent metal, UI glow rings. Tech / sound-future. " +
        "FORBIDDEN: warm gold luxury, orange fire, olive outdoor grit.",
      keywords: [
        "tech",
        "neon",
        "cyber",
        "gaming",
        "sound",
        "future",
        "led",
        "digital",
        "vr",
        "科幻",
        "霓虹",
        "电竞",
      ],
      defaultEffect: "lightning-pulse",
    },
  };

export const IMPACT_POSTER_EFFECTS: Record<
  ImpactPosterEffectId,
  ImpactPosterEffectDef
> = {
  "shatter-burst": {
    id: "shatter-burst",
    startVfx:
      "Product almost frontal, calm; sharp glass/shard silhouettes implied but NOT yet exploded — tension before impact.",
    endVfx:
      "Same product THRUST toward camera with exaggerated 大透视; JAGGED glowing SHARDS burst radially (shatter glass look) — NOT soft god-rays, NOT dirt splash, NOT lightning arcs.",
    videoLead:
      "Animate a violent SHATTER-BURST only: product lunges toward camera while glowing shards explode outward like broken glass; do NOT morph into soft god-rays or lightning.",
    motionStrength: 86,
  },
  "energy-rays": {
    id: "energy-rays",
    startVfx:
      "Product centered, moody; faint concentric floor rings — rays not yet fired.",
    endVfx:
      "Same product closer / tilted; long GOD-RAYS / sound-energy SHAFTS erupt from behind the product — soft volumetric beams, NOT jagged shards, NOT debris, NOT lightning forks.",
    videoLead:
      "Animate ENERGY RAYS / god-ray shafts erupting behind the product while it pushes toward camera; rings pulse; do NOT use shatter shards or lightning bolts.",
    motionStrength: 82,
  },
  "debris-splash": {
    id: "debris-splash",
    startVfx:
      "Product low-angle hero, environment quiet — crumbs/dirt/parts hinted only at edges.",
    endVfx:
      "Same product huge in frame (大透视); particulate DEBRIS / crumbs / dirt / related parts fly TOWARD camera around the locked product — NOT radial glass shards, NOT god-rays, NOT neon lightning.",
    videoLead:
      "Animate a DEBRIS SPLASH flying toward camera around the locked product with aggressive perspective push; keep particles chunky (dirt/parts), not glass shards or light rays.",
    motionStrength: 84,
  },
  "lightning-pulse": {
    id: "lightning-pulse",
    startVfx:
      "Product floating; dark void; tiny spark arcs only — storm not yet peaked.",
    endVfx:
      "Same product with crackling LIGHTNING forks / electric pulses radiating; neon bloom — NOT orange fire shards, NOT soft gold god-rays, NOT dirt debris.",
    videoLead:
      "Animate LIGHTNING PULSES and neon bloom while the product thrusts and turns; forks of electricity only — no shatter shards, no dirt splash, no soft god-rays.",
    motionStrength: 88,
  },
};

export function isImpactPosterToneId(
  value: string | null | undefined,
): value is ImpactPosterToneId {
  return (IMPACT_POSTER_TONE_IDS as readonly string[]).includes(value ?? "");
}

export function isImpactPosterEffectId(
  value: string | null | undefined,
): value is ImpactPosterEffectId {
  return (IMPACT_POSTER_EFFECT_IDS as readonly string[]).includes(value ?? "");
}

export function parseImpactPosterTonePick(
  raw: FormDataEntryValue | string | null | undefined,
): ImpactPosterTonePick {
  const v = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (v === "auto" || !v) return "auto";
  return isImpactPosterToneId(v) ? v : "auto";
}

export function parseImpactPosterEffectPick(
  raw: FormDataEntryValue | string | null | undefined,
): ImpactPosterEffectPick {
  const v = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (v === "auto" || !v) return "auto";
  return isImpactPosterEffectId(v) ? v : "auto";
}

function haystack(parts: Array<string | null | undefined>): string {
  return parts
    .map((p) => (p ?? "").trim().toLowerCase())
    .filter(Boolean)
    .join(" ");
}

export function inferImpactPosterTone(input: {
  product?: string;
  headline?: string;
  subline?: string;
  extra?: string;
  conceptIdea?: string;
}): ImpactPosterToneId {
  const h = haystack([
    input.product,
    input.headline,
    input.subline,
    input.extra,
    input.conceptIdea,
  ]);
  let best: ImpactPosterToneId = "premium";
  let bestScore = 0;
  for (const id of IMPACT_POSTER_TONE_IDS) {
    const score = IMPACT_POSTER_TONES[id].keywords.reduce(
      (n, kw) => n + (h.includes(kw.toLowerCase()) ? 1 : 0),
      0,
    );
    if (score > bestScore) {
      bestScore = score;
      best = id;
    }
  }
  return best;
}

export function resolveImpactPosterTone(input: {
  pick: ImpactPosterTonePick;
  product?: string;
  headline?: string;
  subline?: string;
  extra?: string;
  conceptIdea?: string;
}): ImpactPosterToneId {
  if (input.pick !== "auto") return input.pick;
  return inferImpactPosterTone(input);
}

export function resolveImpactPosterEffect(input: {
  pick: ImpactPosterEffectPick;
  tone: ImpactPosterToneId;
  excludeId?: ImpactPosterEffectId | null;
}): ImpactPosterEffectId {
  if (input.pick !== "auto") return input.pick;
  const preferred = IMPACT_POSTER_TONES[input.tone].defaultEffect;
  if (input.excludeId && preferred === input.excludeId) {
    const alt = IMPACT_POSTER_EFFECT_IDS.find((id) => id !== input.excludeId);
    return alt ?? preferred;
  }
  return preferred;
}

export function buildImpactPosterStillPrompt(input: {
  tone: ImpactPosterToneId;
  effect: ImpactPosterEffectId;
  product: string;
  headline?: string;
  subline?: string;
  conceptMode?: boolean;
  aspectRatio?: string;
  frame: ImpactPosterFrame;
}): string {
  const tone = IMPACT_POSTER_TONES[input.tone];
  const effect = IMPACT_POSTER_EFFECTS[input.effect];
  const ar = input.aspectRatio?.trim() || "9:16";
  const subject = input.conceptMode
    ? `concept/brand hero for “${input.product}” — no fake SKU bottle`
    : `exact uploaded product “${input.product}” — shape, materials, logos locked`;
  const typeLine =
    input.frame === "end"
      ? input.headline?.trim()
        ? `LARGE integrated 3D masthead type from headline “${input.headline.trim()}”${
            input.subline?.trim() ? ` / sub “${input.subline.trim()}”` : ""
          } — bold commercial lettering layered IN the scene (often behind or beside the product), not a tiny caption.`
        : "ZERO readable marketing text — textless hero plate (no invented brand slogans)."
      : "ZERO readable marketing text, logos invented, or watermarks — textless plate.";

  const beat = input.frame === "end" ? effect.endVfx : effect.startVfx;

  return [
    `Photoreal 大透视 IMPACT POSTER still, ${ar}, high-impact commercial plate.`,
    `TONE WORLD (must dominate the whole plate): ${tone.look}`,
    `VFX BEAT (${effect.id}): ${beat}`,
    `Hero: ${subject}.`,
    "Composition: exaggerated wide / low perspective so the product feels massive and thrusting toward camera. Dark void or moody studio. Product is the only SKU.",
    typeLine,
    "FORBIDDEN: flat catalog packshot, soft lifestyle montage, Social drip 三分屏, inventing a different product, mixing another tone's palette.",
  ].join(" ");
}

export function buildImpactPosterVideoPrompt(input: {
  tone: ImpactPosterToneId;
  effect: ImpactPosterEffectId;
  product: string;
  conceptMode?: boolean;
  durationSec?: number;
}): string {
  const tone = IMPACT_POSTER_TONES[input.tone];
  const effect = IMPACT_POSTER_EFFECTS[input.effect];
  const sec = input.durationSec ?? IMPACT_POSTER_DURATION_SEC;
  const subject = input.conceptMode
    ? `concept/brand hero for “${input.product}”`
    : `exact product “${input.product}” locked to Image 1/2 identity`;

  return [
    `MiniMax H3 start→end IMPACT POSTER (~${sec}s).`,
    effect.videoLead,
    tone.look,
    `Subject: ${subject}. Motion MUST be greater than a soft poster warp — clear product thrust, turn, or lunge toward camera plus VFX punch.`,
    "Match Image 2 typed masthead by the end. No second location. No morph into a different SKU.",
    "Hard commercial impact rhythm — not a gentle card-warp.",
  ].join(" ");
}

export function impactPosterMotionStrength(effect: ImpactPosterEffectId): number {
  return IMPACT_POSTER_EFFECTS[effect].motionStrength;
}
