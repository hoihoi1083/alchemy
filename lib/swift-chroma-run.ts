/**
 * Swift chroma run / 疾行幻彩 — MiniMax H3 start→end (Seedance fallback).
 *
 * DNA (XHS 「AI × 新人类图鉴 | 疾行幻彩」): person running / vaulting in wet city +
 * neon geometric collage overlays (pink/orange/yellow triangles & circles, halftone).
 * Dual-frame identity recipe — Product (runner + SKU) or Concept (figure energy).
 *
 * NOT type-behind (no giant word sandwich). NOT torn paper. NOT wet glass.
 *
 * ─── Generate contract ───────────────────────────────────────────────────────
 * Required
 *   · Hero still (IMAGE 1) — identity lock
 *       Product: SKU / person+SKU — invent runner holding EXACT SKU if SKU-only
 *       Concept: person / brand figure still (figure is the runner)
 * Optional
 *   · Dialect — auto | street-chase | vault-punch | graphic-lockup
 *   · Duration — 8 | 10 (default 8); no "auto"
 * Locked
 *   · Engine MiniMax H3 · still AR 3:4 · video AR 9:16 · keep H3 native audio (no library BGM)
 * Pipeline
 *   1) Start still — mid-run / energy pose + chroma graphic DNA
 *   2) End still — advanced run / vault / graphic lockup beat
 *   3) H3 morph — continuous locomotion + graphic energy; identity locked
 */

import type { VideoDuration } from "@/lib/video-settings";
import { nameIsClaimImage1IsObjectLine } from "@/lib/prompt-balance-contract";

export const SWIFT_CHROMA_RUN_DURATION_OPTIONS = ["8", "10"] as const;
export const SWIFT_CHROMA_RUN_DURATION_SEC = 8;

export function clampSwiftChromaRunDurationSec(
  raw: string | number | null | undefined,
): number {
  if (raw === "auto" || raw == null || raw === "") return 8;
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return 8;
  return Math.round(n) <= 8 ? 8 : 10;
}

export function swiftChromaRunDurationOptions(): VideoDuration[] {
  return [...SWIFT_CHROMA_RUN_DURATION_OPTIONS];
}

export const SWIFT_CHROMA_RUN_DIALECT_IDS = [
  "street-chase",
  "vault-punch",
  "graphic-lockup",
] as const;

export type SwiftChromaRunDialectId =
  (typeof SWIFT_CHROMA_RUN_DIALECT_IDS)[number];
export type SwiftChromaRunDialectPick = SwiftChromaRunDialectId | "auto";

export function swiftChromaRunDialectPreviewSrc(
  id: SwiftChromaRunDialectId,
): string {
  return `/images/studio/schemes/swift-chroma-run/${id}.png?v=3`;
}

export function isSwiftChromaRunDialectId(
  value: string | null | undefined,
): value is SwiftChromaRunDialectId {
  return (SWIFT_CHROMA_RUN_DIALECT_IDS as readonly string[]).includes(
    value ?? "",
  );
}

export function parseSwiftChromaRunDialectPick(
  raw: unknown,
): SwiftChromaRunDialectPick {
  const s = String(raw ?? "").trim();
  if (s === "auto" || !s) return "auto";
  return isSwiftChromaRunDialectId(s) ? s : "auto";
}

export function resolveSwiftChromaRunDialect(input: {
  pick: SwiftChromaRunDialectPick;
  product?: string;
  headline?: string;
  conceptIdea?: string;
}): SwiftChromaRunDialectId {
  if (input.pick !== "auto") return input.pick;
  const text =
    `${input.product ?? ""} ${input.headline ?? ""} ${input.conceptIdea ?? ""}`.toLowerCase();
  if (/vault|jump|leap|翻|跳|跃|躍/.test(text)) return "vault-punch";
  if (/lockup|poster|graphic.?end|定格|海报|海報/.test(text)) {
    return "graphic-lockup";
  }
  if (/chase|run|street|疾行|跑|街/.test(text)) return "street-chase";
  return "street-chase";
}

export type SwiftChromaRunFrame = "start" | "end";

type DialectDef = {
  id: SwiftChromaRunDialectId;
  label: string;
  look: string;
  startStill: string;
  endStill: string;
  endPlateEdit: string;
  videoLead: string;
};

const CHROMA_DNA =
  "疾行幻彩 graphic DNA (mandatory): neon geometric collage overlays — hot pink / orange / yellow triangles & circles, " +
  "halftone black dots, distressed grunge edges — layered in Z-space with the wet city plate. " +
  "High contrast: cool desaturated city vs saturated neon graphics. " +
  "Graphics accent the RUNNER — never replace the person with a floating packshot. " +
  "FORBIDDEN: giant editorial word sandwich (that is type-behind), wet glass, torn paper, cream studio void.";

const CITY_PLATE =
  "Photoreal wet urban night / dusk street — reflective asphalt, tall buildings, cinematic grit. " +
  "Inspired by 疾行幻彩 energy — do NOT copy a specific landmark or XHS frame.";

const END_EDIT_LOCK =
  "START PLATE EDIT ONLY: keep the same FULL runner body, natural SKU carry, and chroma graphic world. " +
  "Advance locomotion / graphic intensity only — no new face, no new product, no dropping to packshot-only.";

const SCHEMES: Record<SwiftChromaRunDialectId, DialectDef> = {
  "street-chase": {
    id: "street-chase",
    label: "Street chase",
    look: `${CITY_PLATE} ${CHROMA_DNA} Low / tracking camera energy toward or with the runner.`,
    startStill:
      "{LOOK} START: FULL-BODY runner MID-JOG on wet street — forward lean, legs mid-gait, both arms natural. " +
      "Neon triangles/circles float around the RUNNER (not around a lone product). NOT a static standing portrait. NOT a product-on-asphalt still.",
    endStill:
      "{LOOK} END: same continuous STREET RUN — full-body runner closer / larger, still mid-stride; " +
      "chroma shapes denser / more dynamic parallax. Same person + same natural SKU carry.",
    endPlateEdit:
      "{END_EDIT} Advance the run: full-body runner closer mid-stride; intensify neon geometric overlays; keep natural carry; identity locked.",
    videoLead:
      "STREET CHASE = FULL-BODY person jogging/running on wet city with neon geometric overlays in motion. " +
      "Legs cycle, torso advances; pink/orange/yellow shapes parallax around the runner. " +
      "0–3s establish run+chroma. 3–8s keep RUNNING closer — never freeze into a static packshot. " +
      "FORBIDDEN: product alone on street, floating SKU, disembodied hand, standing still, soft push-in only, type-behind giant words.",
  },
  "vault-punch": {
    id: "vault-punch",
    label: "Vault punch",
    look: `${CITY_PLATE} ${CHROMA_DNA} Dramatic low-angle foreshortening — vault / leap energy.`,
    startStill:
      "{LOOK} START: FULL-BODY runner winding up / approaching a vault or leap — low angle, neon shapes framing the BODY.",
    endStill:
      "{LOOK} END IMPACT: mid-vault or landing punch — full body, leg toward camera, graphic burst of triangles/circles, " +
      "same face/outfit + same natural SKU carry (strapped/hugged — not a weird floating grip).",
    endPlateEdit:
      "{END_EDIT} Punch into vault/leap peak; denser neon shards; keep full body + natural carry; identity locked.",
    videoLead:
      "Build to VAULT PUNCH: full-body approach → explosive leap / vault with neon graphic burst. " +
      "Continuous morph — no montage hard cuts. Identity locked. Chroma overlays react to the punch. " +
      "FORBIDDEN: product-only floating stills, disembodied hands.",
  },
  "graphic-lockup": {
    id: "graphic-lockup",
    label: "Graphic lockup",
    look: `${CITY_PLATE} ${CHROMA_DNA} Poster-strength end lockup — heavy collage chrome.`,
    startStill:
      "{LOOK} START: FULL-BODY runner mid-frame with moderate chroma overlays — street energy building.",
    endStill:
      "{LOOK} END LOCKUP: stronger poster composition — FULL-BODY runner hero pose + dense neon collage " +
      "(triangles, circles, halftone) in Z-space; SKU still naturally carried; face + product readable.",
    endPlateEdit:
      "{END_EDIT} Intensify graphic collage lockup; keep full-body runner + natural SKU carry; identity locked.",
    videoLead:
      "Street run energy builds into a GRAPHIC LOCKUP end — denser neon collage around the RUNNER, stronger poster beat. " +
      "One continuous morph. No giant type-behind words unless already in IMAGE (do not invent slogans). " +
      "FORBIDDEN: ending on a lone packshot on asphalt.",
  },
};

function expandDialectTokens(
  beat: string,
  dialect: SwiftChromaRunDialectId,
): string {
  const def = SCHEMES[dialect];
  return beat
    .replace(/\{LOOK\}/g, def.look)
    .replace(/\{END_EDIT\}/g, END_EDIT_LOCK);
}

function schemeStillBeat(
  def: Pick<DialectDef, "startStill" | "endStill" | "endPlateEdit">,
  frame: SwiftChromaRunFrame,
  editingStartPlate: boolean,
): string {
  if (frame === "end" && editingStartPlate) return def.endPlateEdit;
  return frame === "end" ? def.endStill : def.startStill;
}

function subject(input: { product: string; conceptMode?: boolean }): string {
  return (
    input.product.trim() ||
    (input.conceptMode ? "brand figure" : "the product")
  );
}

/**
 * Product must ride WITH a full-body runner — never a wet-street packshot or weird disembodied hand.
 * Bulky SKUs (power stations, boxes): hug to torso / strap / handle with full arm+body visible.
 * Small SKUs: one hand while running is OK — wrist attached to visible torso.
 */
function heroStaging(input: {
  product: string;
  conceptMode?: boolean;
}): string {
  const hero = subject(input);
  if (input.conceptMode) {
    return [
      "CONCEPT STAGING: IMAGE 1 person / brand figure is the FULL-BODY runner hero.",
      "Keep exact face / figure identity. Real jog/run or vault energy — not a static lean.",
      nameIsClaimImage1IsObjectLine(hero || undefined),
    ].join(" ");
  }
  return [
    "PRODUCT STAGING (FULL-BODY RUNNER leads; SKU rides along — mandatory):",
    "PRIMARY subject = a complete person mid-jog / mid-vault on the wet street (head, torso, legs, both arms visible).",
    "SECONDARY = the EXACT IMAGE 1 product carried NATURALLY while running:",
    "• Bulky box / power station / case: hug to chest or side with BOTH arms or a strap/handle — full arm connected to torso; weight looks real.",
    "• Small bottle / device: one hand OK, but wrist + forearm must attach to a visible running body — never a floating hand.",
    "SKU readable and sharp (~12–25% of frame) but NEVER larger / more important than the runner's body.",
    "If IMAGE 1 is SKU-only, invent a plausible full-body runner carrying that EXACT SKU — never invent a different product.",
    "FORBIDDEN FAIL MODES (instant reject):",
    "• product alone sitting / floating on wet asphalt",
    "• disembodied hand or arm holding the product with no body",
    "• weird grip (fingers on wrong faces, product hovering, hand from nowhere)",
    "• packshot-with-neon-overlay posing as 疾行幻彩",
    "• campsite / tabletop / living-room demo replacing the chase",
    nameIsClaimImage1IsObjectLine(hero || undefined),
    hero
      ? `Product label "${hero}" only — never swap category.`
      : "Keep IMAGE 1 exact SKU silhouette, materials, and identity.",
  ].join(" ");
}

function optionalStyleHint(extra?: string): string {
  const t = extra?.trim().slice(0, 140);
  return t
    ? `Optional mood only (MUST keep full-body wet-city RUN + natural in-hand/strapped SKU — ignore packshot / campsite / floating-product beats): ${t}.`
    : "";
}

const PLATE_RULES =
  "Swift-chroma-run / 疾行幻彩 — FULL-BODY runner + neon geometric collage on wet city; SKU only as natural carry. " +
  "Not type-behind giant words, not wet glass, not torn paper, not product-only asphalt packshot. No gibberish captions or UI chrome.";

export function buildSwiftChromaRunStillPrompt(input: {
  dialect: SwiftChromaRunDialectId;
  product: string;
  business?: string;
  headline?: string;
  promptExtra?: string;
  conceptMode?: boolean;
  aspectRatio?: string;
  frame: SwiftChromaRunFrame;
  editingStartPlate?: boolean;
}): string {
  const def = SCHEMES[input.dialect];
  const ar = input.aspectRatio?.trim() || "3:4";
  const isEndEdit = input.frame === "end" && Boolean(input.editingStartPlate);
  const beat = expandDialectTokens(
    schemeStillBeat(def, input.frame, isEndEdit),
    input.dialect,
  );
  return [
    `Photoreal cinematic still, ${ar}, high-energy fashion/sport commercial.`,
    heroStaging(input),
    `${input.frame.toUpperCase()} frame (${def.label}): ${beat}`,
    isEndEdit
      ? "Treat IMAGE 1 / start plate as ground truth — inpaint-level run/graphic edit only; keep full-body runner."
      : "Single plate ready for continuous start→end RUN morph (person moves; product rides along).",
    optionalStyleHint(input.promptExtra),
    PLATE_RULES,
  ].join(" ");
}

export function buildSwiftChromaRunVideoPrompt(input: {
  dialect: SwiftChromaRunDialectId;
  product: string;
  business?: string;
  headline?: string;
  promptExtra?: string;
  conceptMode?: boolean;
  durationSec?: number;
}): string {
  const def = SCHEMES[input.dialect];
  const hero = subject(input);
  const sec = clampSwiftChromaRunDurationSec(input.durationSec);
  const staging = input.conceptMode
    ? "Concept: keep the same full-body runner/figure identity for the entire clip — real locomotion."
    : [
        "Product: FULL-BODY runner is the hero of every frame; EXACT SKU stays naturally carried (hug/strap/handle) — never morph into a different product.",
        "If the clip becomes a floating packshot, product-on-asphalt, or a weird disembodied hand, it FAILED.",
        "Chroma shapes follow the runner; they may accent the SKU but must not turn the shot into a product still.",
      ].join(" ");
  return [
    `Swift-chroma-run / 疾行幻彩 ad, ${sec}s. Continuous morph from Image 1 to Image 2 — runner locomotion advances, identity locked.`,
    `Dialect: ${def.label}. ${def.videoLead}`,
    staging,
    nameIsClaimImage1IsObjectLine(hero),
    "CRITICAL: same person/SKU identity — never morph face, gender, or product.",
    "CRITICAL: keep neon geometric chroma overlays — not giant type-behind words, not wet glass, not torn paper.",
    "CRITICAL (product mode): runner body must stay on screen; SKU readable while carried; no orphan hands.",
    "Locked wet-city RUN energy. No hard-cut montage into unrelated scenes (no campsite, no packshot void).",
    optionalStyleHint(input.promptExtra),
    "No gibberish letters, no social watermarks, no UI chrome.",
  ].join(" ");
}

export const SWIFT_CHROMA_RUN_NEGATIVE =
  "subtitles, captions, watermarks, hard cut montage, jump cut, freeze-frame, " +
  "product alone on asphalt, floating packshot, product hovering in air, " +
  "disembodied hand, orphan arm, weird grip, fingers on wrong product faces, " +
  "missing runner, no person, body cropped to hand-only, " +
  "blurry product, missing product, product exits frame, product behind back, " +
  "campsite packshot, tabletop demo, living-room unbox, " +
  "morphing identity, different person, gender swap, " +
  "invent competitor brands, standing still portrait, soft push-in only, " +
  "giant type-behind editorial word sandwich, wet glass condensation, torn pear paper reveal, " +
  "cream studio void, living-room packshot, " +
  "garbled text, UI chrome, social stickers";


export const SWIFT_CHROMA_RUN_MOTION_STRENGTH = 78;

export function swiftChromaRunMotionStrength(
  dialect: SwiftChromaRunDialectId,
): number {
  switch (dialect) {
    case "vault-punch":
      return 82;
    case "graphic-lockup":
      return 72;
    case "street-chase":
    default:
      return SWIFT_CHROMA_RUN_MOTION_STRENGTH;
  }
}
