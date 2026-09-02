/**
 * Web boundary break (打破网页边界) — MiniMax H3 start→end (Seedance fallback).
 * Model reaches through a fake shopping-site UI to grab the product.
 * Schemes: Shelf reach · Hold through. Duration 8/10 (default 8).
 *
 * Reference (105821): ONE locked composite — torso behind thin nav, arm+product
 * in front, row of SKUs below. Motion is micro (reach / lift), not a scene morph.
 */

import type { VideoDuration } from "@/lib/video-settings";
import { nameIsClaimImage1IsObjectLine } from "@/lib/prompt-balance-contract";

export const WEB_BOUNDARY_BREAK_DURATION_OPTIONS = ["8", "10"] as const;
export const WEB_BOUNDARY_BREAK_DURATION_SEC = 8;

export function clampWebBoundaryBreakDurationSec(
  raw: string | number | null | undefined,
): number {
  if (raw === "auto" || raw == null || raw === "") return 8;
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return 8;
  return Math.round(n) <= 8 ? 8 : 10;
}

export function webBoundaryBreakDurationOptions(): VideoDuration[] {
  return [...WEB_BOUNDARY_BREAK_DURATION_OPTIONS];
}

export const WEB_BOUNDARY_BREAK_SCHEME_IDS = [
  "shelf-reach",
  "hold-through",
] as const;
export type WebBoundaryBreakSchemeId =
  (typeof WEB_BOUNDARY_BREAK_SCHEME_IDS)[number];
export type WebBoundaryBreakSchemePick = WebBoundaryBreakSchemeId | "auto";

export function webBoundaryBreakSchemePreviewSrc(
  id: WebBoundaryBreakSchemeId,
): string {
  return `/images/studio/schemes/web-boundary-break/${id}.png?v=4`;
}

export function isWebBoundaryBreakSchemeId(
  value: string | null | undefined,
): value is WebBoundaryBreakSchemeId {
  return (WEB_BOUNDARY_BREAK_SCHEME_IDS as readonly string[]).includes(
    value ?? "",
  );
}

export function parseWebBoundaryBreakSchemePick(
  raw: unknown,
): WebBoundaryBreakSchemePick {
  const s = String(raw ?? "").trim();
  if (s === "auto" || !s) return "auto";
  return isWebBoundaryBreakSchemeId(s) ? s : "auto";
}

export function resolveWebBoundaryBreakScheme(input: {
  pick: WebBoundaryBreakSchemePick;
  product?: string;
  headline?: string;
  conceptIdea?: string;
}): WebBoundaryBreakSchemeId {
  if (input.pick !== "auto") return input.pick;
  const text =
    `${input.product ?? ""} ${input.headline ?? ""} ${input.conceptIdea ?? ""}`.toLowerCase();
  if (/shelf|reach|grab|nav|网页|货架|伸手|拿起/.test(text)) {
    return "shelf-reach";
  }
  if (/hold|through|close.?up|手持|穿过|举起|特写/.test(text)) {
    return "hold-through";
  }
  // Default hold-through — smallest start/end delta for H3.
  return "hold-through";
}

/** Hold-through uses one plate for H3 stereo — end equals start (micro-motion only). */
export function webBoundaryBreakUsesSinglePlate(
  scheme: WebBoundaryBreakSchemeId,
): boolean {
  return scheme === "hold-through";
}

export type WebBoundaryBreakFrame = "start" | "end";

type SchemeDef = {
  id: WebBoundaryBreakSchemeId;
  label: string;
  startStill: string;
  endStill: string;
  endPlateEdit: string;
  videoLead: string;
};

export const WEB_BOUNDARY_NAV_LABEL_MAX = 18;

/** Uppercase nav token — same spirit as Social drip's sanitized IG handle. */
export function sanitizeWebBoundaryNavLabel(raw: string): string {
  const t = raw.trim().replace(/\s+/g, " ");
  if (!t) return "";
  const cleaned = t.replace(/[^\w\s\u4e00-\u9fff-]/g, "").trim();
  if (!cleaned) return "";
  return cleaned.slice(0, WEB_BOUNDARY_NAV_LABEL_MAX).toUpperCase();
}

export type WebBoundaryNavLabels = {
  left: string;
  brand: string;
  search: string;
  account: string;
};

/** Derive fixed nav copy — business name is the center brand slot (fill Business in wizard). */
export function resolveWebBoundaryNavLabels(input: {
  business?: string;
  headline?: string;
}): WebBoundaryNavLabels {
  const business = sanitizeWebBoundaryNavLabel(input.business ?? "");
  const headline = sanitizeWebBoundaryNavLabel(input.headline ?? "");
  const brand = business || headline || "BRAND";
  const left =
    business && headline && headline !== brand ? headline : "COLLECTION";
  return {
    left,
    brand,
    search: "SEARCH",
    account: "ACCOUNT",
  };
}

function formatNavBarWords(labels: WebBoundaryNavLabels): string {
  return `${labels.left}  ${labels.brand}  ${labels.search}  ${labels.account}`;
}

/** Sparse nav like the 105821 reference — spell exact tokens, never invent gibberish. */
function buildWebBoundaryNavChrome(input: {
  business?: string;
  headline?: string;
}): string {
  const labels = resolveWebBoundaryNavLabels(input);
  const words = formatNavBarWords(labels);
  return (
    "ONE thin white website NAV BAR across mid-frame only. " +
    `Exact words in clean sans-serif uppercase: ${words}. ` +
    "Spell these four labels exactly — no other English on the bar, no lorem ipsum, no random words. " +
    "No second nav row, no product cards above the bar, no price tags, no ADD TO CART rows."
  );
}

function optionalStyleHint(extra?: string): string {
  const t = extra?.trim().slice(0, 140);
  return t ? `Optional mood (keep nav gag + z-order locked): ${t}.` : "";
}

const SHELF =
  "Below the bar: clean white shelf with 3–4 identical copies of the IMAGE 1 product in one tidy row — " +
  "exact category/silhouette of IMAGE 1 (power bank stays power bank; phone stays phone; never perfume unless IMAGE 1 is perfume).";

const Z_ORDER =
  "Z-ORDER GAG: model torso/shoulders BEHIND the nav bar; forearm + hand + hero product IN FRONT OF the nav bar " +
  "(bar is occluded where arm/product overlap). Arm never dives under the bar.";

const MODEL_LOCK =
  "Reuse the EXACT person from IMAGE 1 when a person is present (face, hair, outfit). Do NOT cast a different model. " +
  "If IMAGE 1 is product-only, use one consistent young adult model for both frames.";

const END_EDIT_LOCK =
  "START PLATE EDIT ONLY: keep the same camera, background, nav bar position, shelf layout, model identity, and every SKU except the hero hand motion. " +
  "Change ONLY the right hand + one product by a few centimeters — no new people, no new products, no new UI.";

function schemeStillBeat(
  def: Pick<SchemeDef, "startStill" | "endStill" | "endPlateEdit">,
  frame: WebBoundaryBreakFrame,
  editingStartPlate: boolean,
): string {
  if (frame === "end" && editingStartPlate) return def.endPlateEdit;
  return frame === "end" ? def.endStill : def.startStill;
}

const SCHEMES: Record<WebBoundaryBreakSchemeId, SchemeDef> = {
  "shelf-reach": {
    id: "shelf-reach",
    label: "Shelf reach",
    startStill:
      "Chest-up on soft grey studio, model looking down at the shelf. " +
      "{NAV} {SHELF} {Z_ORDER} {MODEL_LOCK} " +
      "START: right hand just crossed IN FRONT of the nav bar, fingertips reaching toward one shelf product — not lifted yet.",
    endStill:
      "{Z_ORDER} END: same composition — hand lifts ONE matching IMAGE 1 product a few cm IN FRONT of the nav bar toward camera.",
    endPlateEdit:
      "{END_EDIT} Lift the same hand and ONE shelf product slightly higher toward camera; everything else unchanged.",
    videoLead:
      "Locked tripod. Locked layout for the whole clip. Micro-motion ONLY: hand reaches then lifts ONE shelf product through the nav bar. " +
      "0–4s: reach in front of bar. 4–8s: grasp and lift 5–10cm. Same person, same SKU row, same nav labels — no scene change.",
  },
  "hold-through": {
    id: "hold-through",
    label: "Hold through",
    startStill:
      "Chest-up on soft grey studio. " +
      "{NAV} {Z_ORDER} {MODEL_LOCK} " +
      "Already holding ONE IMAGE 1 product IN FRONT of the nav bar. Optional matching shelf below. No price cards.",
    endStill:
      "Same hold-through — product and hand still IN FRONT of nav; optional 5% push-in toward camera only.",
    endPlateEdit:
      "{END_EDIT} Optional tiny push-in — product still IN FRONT of nav; do not change person or category.",
    videoLead:
      "Locked tripod and locked composition. Hold-through gag: product+hand stay IN FRONT of nav the entire clip. " +
      "Only a subtle push-in / 5cm product lift — same person, same product category, same nav labels. No morph, no cut.",
  },
};

function expandSchemeTokens(
  beat: string,
  input: { business?: string; headline?: string },
): string {
  return beat
    .replace("{NAV}", buildWebBoundaryNavChrome(input))
    .replace("{SHELF}", SHELF)
    .replace("{Z_ORDER}", Z_ORDER)
    .replace("{MODEL_LOCK}", MODEL_LOCK)
    .replace("{END_EDIT}", END_EDIT_LOCK);
}

const PLATE_RULES =
  "打破网页边界 — body behind UI, limb+product in front of UI. Keep IMAGE 1 product category. " +
  "No gibberish letters, captions, watermarks, or social-app chrome.";

function subject(input: { product: string; conceptMode?: boolean }): string {
  return (
    input.product.trim() ||
    (input.conceptMode ? "brand product" : "the product")
  );
}

function photoLock(hero: string): string {
  return [
    "IMAGE 1 locks model identity (when present) AND product silhouette/category.",
    nameIsClaimImage1IsObjectLine(hero || undefined),
    hero
      ? `Label "${hero}" only — never swap category (power bank stays power bank; phone stays phone).`
      : "Keep IMAGE 1 exact product category and materials.",
    "If IMAGE 1 shows person + product, preserve both.",
  ].join(" ");
}

export function buildWebBoundaryBreakStillPrompt(input: {
  scheme: WebBoundaryBreakSchemeId;
  product: string;
  business?: string;
  headline?: string;
  promptExtra?: string;
  conceptMode?: boolean;
  aspectRatio?: string;
  frame: WebBoundaryBreakFrame;
  /** True when Nano Banana receives the start plate as first ref (end keyframe path). */
  editingStartPlate?: boolean;
}): string {
  const def = SCHEMES[input.scheme];
  const hero = subject(input);
  const ar = input.aspectRatio?.trim() || "3:4";
  const isEndEdit = input.frame === "end" && input.editingStartPlate;
  const beat = expandSchemeTokens(
    schemeStillBeat(def, input.frame, isEndEdit),
    { business: input.business, headline: input.headline },
  );
  const navWords = formatNavBarWords(
    resolveWebBoundaryNavLabels({
      business: input.business,
      headline: input.headline,
    }),
  );
  return [
    `Photoreal luxury e-commerce still, ${ar}, soft grey studio, commercial photography.`,
    photoLock(hero),
    `${input.frame.toUpperCase()} frame (${def.label}): ${beat}`,
    isEndEdit
      ? "Treat IMAGE 1 / start plate as ground truth — inpaint-level edit only."
      : "Single composition ready for subtle start→end morph.",
    `Nav bar must read exactly: ${navWords}.`,
    optionalStyleHint(input.promptExtra),
    PLATE_RULES,
  ].join(" ");
}

export function buildWebBoundaryBreakVideoPrompt(input: {
  scheme: WebBoundaryBreakSchemeId;
  product: string;
  business?: string;
  headline?: string;
  promptExtra?: string;
  conceptMode?: boolean;
  durationSec?: number;
  singlePlate?: boolean;
}): string {
  const def = SCHEMES[input.scheme];
  const hero = subject(input);
  const sec = clampWebBoundaryBreakDurationSec(input.durationSec);
  const navWords = formatNavBarWords(
    resolveWebBoundaryNavLabels({
      business: input.business,
      headline: input.headline,
    }),
  );
  const stereoNote = input.singlePlate
    ? "Image 1 and Image 2 are the SAME locked composite — animate micro-motion only."
    : "Continuous morph from Image 1 (start) to Image 2 (end) with MINIMAL delta.";
  return [
    `Web-boundary-break ad, ${sec}s. ${stereoNote}`,
    `Scheme: ${def.label}. ${def.videoLead}`,
    nameIsClaimImage1IsObjectLine(hero),
    `Nav labels stay exactly: ${navWords} — do not rewrite or garble the bar text.`,
    "CRITICAL: same person and same product category for the entire clip — never morph into a different face, gender, outfit, or SKU.",
    "CRITICAL: forearm + hand + product stay IN FRONT of the nav bar — never pass behind/under the bar.",
    "Locked nav bar and shelf layout. No hard cuts, no montage, no camera orbit, no zoom into a new scene.",
    optionalStyleHint(input.promptExtra),
    "No gibberish letters, no perfume unless Image 1 is perfume, no fashion reel energy.",
  ].join(" ");
}

export const WEB_BOUNDARY_BREAK_NEGATIVE =
  "subtitles, captions, watermarks, hard cut montage, jump cut, freeze-frame, " +
  "blurry product, morphing identity, different person, gender swap, age change, new outfit, " +
  "invent competitor brands, talking head vlog, fashion montage, rapid scene change, " +
  "meme three-panel drip, palm miniature throw, dark triangle-light void, " +
  "garbled text, illegible letters, melted typography, random glyphs, lorem ipsum junk, " +
  "crowded product cards, price tags under every SKU, multiple ADD TO CART buttons, " +
  "floating tooltips, UI popovers, social-app chrome, extra nav bars, spinning camera, " +
  "extra fingers, melted hands, arm diving behind the nav bar, arm under the UI bar, wrong occlusion, " +
  "forcing perfume bottles when the upload is not perfume, morph into different product category";

/** H3 motion strength 0–100 — keep low so layout stays locked. */
export const WEB_BOUNDARY_BREAK_MOTION_STRENGTH = 46;
