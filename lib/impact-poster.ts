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
  return `/images/studio/schemes/impact-poster/tone-${id}.png?v=1`;
}

export function impactPosterEffectPreviewSrc(id: ImpactPosterEffectId): string {
  return `/images/studio/schemes/impact-poster/effect-${id}.png?v=1`;
}

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
        "Fiery maximalist commercial: deep black void, molten orange/red rim light, embers and heat haze. Spicy/snack energy — high saturation.",
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
        "Rugged action commercial: earthy greens/browns/black, dust, grit, low dramatic angle. Outdoor / bike / gear power.",
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
        "Premium luxury commercial: deep black, soft gold and warm speculars, elegant particle glitter. Hi-fi / jewelry / headphone polish.",
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
        "Cyber / neon commercial: black void, electric purple + cyan neon, iridescent metal, UI-like glow rings. Tech / sound-future energy.",
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
      "Product almost frontal, calm; sharp shard silhouettes implied but NOT yet exploded — tension before impact.",
    endVfx:
      "Same product THRUST toward camera with exaggerated 大透视 / wide-angle hero; jagged glowing shards burst radially behind and around it; strong rim light.",
    videoLead:
      "Animate a violent shatter-burst impact: product lunges toward camera with large-perspective thrust while glowing shards explode outward; settle into the typed end frame.",
    motionStrength: 86,
  },
  "energy-rays": {
    id: "energy-rays",
    startVfx:
      "Product centered, moody; faint concentric glow rings on the floor — rays not yet fired.",
    endVfx:
      "Same product closer / tilted; god-rays or sound-energy shafts erupt from behind; floating micro icons optional; bold integrated type.",
    videoLead:
      "Animate energy rays erupting behind the product while it pushes toward camera; rings pulse; settle into typed end frame.",
    motionStrength: 82,
  },
  "debris-splash": {
    id: "debris-splash",
    startVfx:
      "Product low-angle hero, environment quiet — crumbs/dirt/parts hinted only at edges.",
    endVfx:
      "Same product huge in frame (大透视); debris / crumbs / dirt / related particles fly TOWARD camera around the locked product.",
    videoLead:
      "Animate a debris splash flying toward camera around the locked product with aggressive perspective push; settle into typed end.",
    motionStrength: 84,
  },
  "lightning-pulse": {
    id: "lightning-pulse",
    startVfx:
      "Product floating; dark void; tiny spark arcs only — storm not yet peaked.",
    endVfx:
      "Same product with crackling lightning / electric pulses radiating; neon bloom; bold type layered behind or beside product.",
    videoLead:
      "Animate lightning pulses and neon bloom while the product thrusts and turns; settle into typed end frame.",
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
      ? `LARGE integrated 3D masthead type from headline “${(input.headline || input.product).trim()}”${
          input.subline?.trim() ? ` / sub “${input.subline.trim()}”` : ""
        } — bold commercial lettering layered IN the scene (often behind or beside the product), not a tiny caption.`
      : "ZERO readable marketing text, logos invented, or watermarks — textless plate.";

  const beat = input.frame === "end" ? effect.endVfx : effect.startVfx;

  return [
    `Photoreal 大透视 IMPACT POSTER still, ${ar}, high-impact commercial plate.`,
    tone.look,
    `Hero: ${subject}.`,
    beat,
    "Composition: exaggerated wide / low perspective so the product feels massive and thrusting toward camera. Dark void or moody studio. Product is the only SKU.",
    typeLine,
    "FORBIDDEN: flat catalog packshot, soft lifestyle montage, Social drip 三分屏, inventing a different product.",
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
