/**
 * Product creative motion (产品创意动效) — MiniMax H3 start→end with scheme cards
 * (Seedance fallback). Pick a gag → auto stills (start + end) → ~4s morph (H3 floor 5s).
 */

export const CREATIVE_MOTION_DURATION_SEC = 4;

export const CREATIVE_MOTION_SCHEME_IDS = [
  "juice-burst",
  "label-peel",
  "squeeze-reveal",
  "cap-rays",
  "body-breathe",
  "shredder-restore",
] as const;

export type CreativeMotionSchemeId = (typeof CREATIVE_MOTION_SCHEME_IDS)[number];
export type CreativeMotionSchemePick = CreativeMotionSchemeId | "auto";

export function creativeMotionSchemePreviewSrc(
  id: CreativeMotionSchemeId,
): string {
  return `/images/studio/schemes/creative-motion/${id}.png?v=1`;
}

export type CreativeMotionFrame = "start" | "end";

export type CreativeMotionSchemeDef = {
  id: CreativeMotionSchemeId;
  /** EN label for notes / heuristics */
  label: string;
  startStill: string;
  endStill: string;
  videoLead: string;
};

export const CREATIVE_MOTION_SCHEMES: Record<
  CreativeMotionSchemeId,
  CreativeMotionSchemeDef
> = {
  "juice-burst": {
    id: "juice-burst",
    label: "Juice burst open",
    startStill:
      "Product hero closed and dry on a clean surface — citrus/liquid energy implied only by color accents, no splash yet.",
    endStill:
      "Same product mid juice/liquid BURST: bright citrus pulp, droplets, and spray frozen around the hero; product still sharp and identity-locked.",
    videoLead:
      "Animate a citrus/liquid explosion opening: droplets erupt outward while the product stays locked; settle into the splash end frame.",
  },
  "label-peel": {
    id: "label-peel",
    label: "Retro label peel",
    startStill:
      "Product with a vintage paper label fully sealed / unpeeled, centered, graphic packaging readable.",
    endStill:
      "Same product with the retro label partially PEELING/tearing away like a sticker reveal — curled paper edge, same bottle/tube underneath.",
    videoLead:
      "Animate the retro label peeling and curling off the product in one continuous motion into the end pose.",
  },
  "squeeze-reveal": {
    id: "squeeze-reveal",
    label: "Squeeze into scene",
    startStill:
      "Product tube/bottle mid-squeeze with a small bead of paste/cream just emerging from the nozzle — plain studio backdrop.",
    endStill:
      "Same squeeze becomes a miniature magical scene: paste transforms into a tiny garden / landscape / flavor world continuing from the nozzle, product still locked.",
    videoLead:
      "Animate the squeeze transforming into a miniature reveal world growing from the nozzle into the end frame.",
  },
  "cap-rays": {
    id: "cap-rays",
    label: "Cap unscrew rays",
    startStill:
      "Product with cap fully closed, dark/moody rim light, no beams yet.",
    endStill:
      "Same product with cap half-unscrewed; bright god-rays / light shafts shoot from the opening; product identity unchanged.",
    videoLead:
      "Animate the cap unscrewing while radiant light beams erupt from the mouth into the end frame.",
  },
  "body-breathe": {
    id: "body-breathe",
    label: "Body breathe",
    startStill:
      "Product package at a slightly compressed / inhale-ready state, soft studio light.",
    endStill:
      "Same package at a slightly EXPANDED / exhale-plump state — subtle volume change only, same silhouette family.",
    videoLead:
      "Animate a smooth breathing rhythm: package gently expands then settles into the plump end pose — no morph to another SKU.",
  },
  "shredder-restore": {
    id: "shredder-restore",
    label: "Shredder restore",
    startStill:
      "Product appears as shredded strips / confetti pieces arranged loosely in frame — colors match the real product.",
    endStill:
      "Same strips fully reassembled into the complete sharp product hero — packshot restored.",
    videoLead:
      "Animate shredded pieces flying and locking back into the complete product (reverse shredder) into the end frame.",
  },
};

export function isCreativeMotionSchemeId(
  value: string | null | undefined,
): value is CreativeMotionSchemeId {
  return (CREATIVE_MOTION_SCHEME_IDS as readonly string[]).includes(value ?? "");
}

export function parseCreativeMotionSchemePick(
  raw: unknown,
): CreativeMotionSchemePick {
  const s = String(raw ?? "").trim();
  if (s === "auto" || !s) return "auto";
  return isCreativeMotionSchemeId(s) ? s : "auto";
}

export function resolveCreativeMotionScheme(input: {
  pick: CreativeMotionSchemePick;
  product?: string;
  headline?: string;
  excludeId?: CreativeMotionSchemeId | null;
}): CreativeMotionSchemeId {
  if (input.pick !== "auto") return input.pick;
  const text = `${input.product ?? ""} ${input.headline ?? ""}`.toLowerCase();
  let pick: CreativeMotionSchemeId = "body-breathe";
  if (/lemon|citrus|juice|茶|汁|柠檬|飲料|饮料|drink/.test(text)) {
    pick = "juice-burst";
  } else if (/label|贴纸|標籤|标签|vintage|retro/.test(text)) {
    pick = "label-peel";
  } else if (/toothpaste|cream|tube|挤|膏|sauce/.test(text)) {
    pick = "squeeze-reveal";
  } else if (/cap|盖|瓶|serum|dropper/.test(text)) {
    pick = "cap-rays";
  } else if (/shred|碎|纸|紙|restore|还原/.test(text)) {
    pick = "shredder-restore";
  }
  if (input.excludeId && pick === input.excludeId) {
    const alt = CREATIVE_MOTION_SCHEME_IDS.find((id) => id !== pick);
    if (alt) pick = alt;
  }
  return pick;
}

const NO_TEXT =
  "TEXTLESS: no captions, no watermarks, no UI, no invented marketing slogans. Keep real product logo if present on upload.";

export function buildCreativeMotionStillPrompt(input: {
  scheme: CreativeMotionSchemeId;
  product: string;
  conceptMode?: boolean;
  aspectRatio?: string;
  frame: CreativeMotionFrame;
}): string {
  const def = CREATIVE_MOTION_SCHEMES[input.scheme];
  const hero =
    input.product.trim() ||
    (input.conceptMode ? "brand mark / mascot" : "the product");
  const ar = input.aspectRatio?.trim() || "9:16";
  const beat = input.frame === "end" ? def.endStill : def.startStill;
  return [
    `Photoreal commercial still, ${ar}, designed product creative-motion plate.`,
    `Identity lock: ${hero} — same shape, logo, colors, materials as the uploaded subject.`,
    `${input.frame.toUpperCase()} frame (${def.label}): ${beat}`,
    NO_TEXT,
    "Single hero, sharp, studio-grade, ready for start→end morph.",
  ].join(" ");
}

export function buildCreativeMotionVideoPrompt(input: {
  scheme: CreativeMotionSchemeId;
  product: string;
  conceptMode?: boolean;
  durationSec?: number;
}): string {
  const def = CREATIVE_MOTION_SCHEMES[input.scheme];
  const hero =
    input.product.trim() ||
    (input.conceptMode ? "brand mark" : "the product");
  const sec = input.durationSec ?? CREATIVE_MOTION_DURATION_SEC;
  return [
    `Product creative motion, ${sec}s, continuous morph from Image 1 (start) to Image 2 (end).`,
    `Scheme: ${def.label}. ${def.videoLead}`,
    `Keep ${hero} identity locked — do not swap SKU, do not invent competitor brands.`,
    "No hard cuts, no slideshow, no on-screen text overlays.",
  ].join(" ");
}
