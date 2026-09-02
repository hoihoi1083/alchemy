/**
 * Web boundary break (打破网页边界) — MiniMax H3 start→end (Seedance fallback).
 * Model reaches through a fake shopping-site UI to grab the product.
 * Schemes: Shelf reach · Hold through. Duration 8/10 (default 10).
 *
 * Quality notes (from failed phone SKU runs):
 * - Never hardcode perfume — lock product category to IMAGE 1.
 * - Keep UI chrome minimal (thin nav) so H3 does not invent gibberish letters.
 * - Z-order is the gag: body behind nav, arm + product in front of nav.
 */

import type { VideoDuration } from "@/lib/video-settings";
import { nameIsClaimImage1IsObjectLine } from "@/lib/prompt-balance-contract";

export const WEB_BOUNDARY_BREAK_DURATION_OPTIONS = ["8", "10"] as const;
export const WEB_BOUNDARY_BREAK_DURATION_SEC = 10;

export function clampWebBoundaryBreakDurationSec(
  raw: string | number | null | undefined,
): number {
  if (raw === "auto" || raw == null || raw === "") return 10;
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return 10;
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
  if (/hold|through|close.?up|手持|穿过|举起|特写/.test(text)) {
    return "hold-through";
  }
  if (/shelf|reach|grab|nav|网页|货架|伸手|拿起/.test(text)) {
    return "shelf-reach";
  }
  // Default: hold-through — clearer z-order for H3 than a long reach morph.
  return "hold-through";
}

export type WebBoundaryBreakFrame = "start" | "end";

type SchemeDef = {
  id: WebBoundaryBreakSchemeId;
  label: string;
  startStill: string;
  endStill: string;
  videoLead: string;
};

/** Shared set-dressing — keep chrome sparse so models do not invent junk glyphs. */
const UI_CHROME =
  "ONE thin white website NAV BAR only across mid-frame (like a website header sticker). " +
  "Prefer blank bar + simple icons (search / bag) OR exactly: COLLECTION  BRAND  SEARCH  ACCOUNT in clean sans-serif. " +
  "No product-card grids, no price tags, no ADD TO CART rows, no tooltips, no floating labels.";

const Z_ORDER =
  "Z-ORDER IS THE ENTIRE GAG: model torso/shoulders stay BEHIND the nav bar; " +
  "forearm + hand + product are a FOREGROUND sticker IN FRONT OF the nav bar " +
  "(the bar must be visually occluded by the arm/product where they overlap). " +
  "NEVER let the arm slip behind/under the nav bar. Occlusion test: covering the bar must still leave the hand/product visible on top.";

const SCHEMES: Record<WebBoundaryBreakSchemeId, SchemeDef> = {
  "shelf-reach": {
    id: "shelf-reach",
    label: "Shelf reach",
    startStill:
      "Chest-up model (lock face/hair/outfit from IMAGE 1 when present; else a clean young adult model) on soft grey studio, looking down. " +
      `${UI_CHROME} ` +
      "Below the bar: clean white shelf with 3–4 identical IMAGE 1 products in a tidy row — " +
      "exact category of IMAGE 1 (power bank stays power bank; phone stays phone; bottle stays bottle). " +
      `${Z_ORDER} ` +
      "START: right arm already crossing IN FRONT of the nav bar, fingertips just reaching toward a shelf product — not yet lifting. Anatomically correct hand.",
    endStill:
      "Same model, same thin nav bar, same shelf of IMAGE 1 products. " +
      `${Z_ORDER} ` +
      "END: hand lifts ONE matching IMAGE 1 product clearly IN FRONT of the nav bar toward camera. No extra UI. Soft studio light.",
    videoLead:
      "Keep nav bar FIXED. Entire clip: arm+product stay IN FRONT of the nav (never dive behind it). " +
      "0–3s: reach pose in front of bar. 3–7s: grasp shelf product and lift through the UI. 7–ends: hold product in front of bar. Continuous morph.",
  },
  "hold-through": {
    id: "hold-through",
    label: "Hold through",
    startStill:
      "Chest-up model (lock face from IMAGE 1 when present) on soft grey studio. " +
      `${UI_CHROME} ` +
      `${Z_ORDER} ` +
      "Already holding ONE IMAGE 1 product IN FRONT of the nav bar (torso behind). Optional soft shelf of matching products below. No price cards. Correct hands.",
    endStill:
      "Closer push-in of the same hold-through: IMAGE 1 product sharp IN FRONT of the thin nav bar, model softly behind, shallow DOF. Same chrome only.",
    videoLead:
      "Nav bar FIXED. Product+hand stay IN FRONT of nav for the whole clip. Soft push-in / slight lift toward camera. No hard cuts.",
  },
};

const PLATE_RULES =
  "Core gag ONLY: 打破网页边界 / break the webpage boundary — body behind UI, limb+product in front of UI. " +
  "Do NOT invent a different product category than IMAGE 1. " +
  "Illegible / melted / gibberish letters are FORBIDDEN. " +
  "No captions, watermarks, subtitles, social-app chrome, or competitor brand words.";

function subject(input: { product: string; conceptMode?: boolean }): string {
  return (
    input.product.trim() ||
    (input.conceptMode ? "brand product" : "the product")
  );
}

function photoLock(hero: string): string {
  return [
    "IMAGE 1 is the identity lock for the model (face/hair/outfit when a person is present) AND the product silhouette when the product is visible in IMAGE 1.",
    nameIsClaimImage1IsObjectLine(hero || undefined),
    hero
      ? `Call the product "${hero}" as a label only — keep IMAGE 1's real category (a phone stays a phone; a perfume bottle stays perfume; never swap categories).`
      : "Keep IMAGE 1's exact product category and materials.",
    "If IMAGE 1 shows a person holding the product, preserve both identities.",
  ].join(" ");
}

export function buildWebBoundaryBreakStillPrompt(input: {
  scheme: WebBoundaryBreakSchemeId;
  product: string;
  conceptMode?: boolean;
  aspectRatio?: string;
  frame: WebBoundaryBreakFrame;
}): string {
  const def = SCHEMES[input.scheme];
  const hero = subject(input);
  const ar = input.aspectRatio?.trim() || "3:4";
  const beat = input.frame === "end" ? def.endStill : def.startStill;
  return [
    `Photoreal luxury e-commerce creative still, ${ar}, soft grey studio, sharp commercial photography.`,
    photoLock(hero),
    `${input.frame.toUpperCase()} frame (${def.label}): ${beat}`,
    PLATE_RULES,
    "Single composition, ready for start→end morph with locked layout.",
  ].join(" ");
}

export function buildWebBoundaryBreakVideoPrompt(input: {
  scheme: WebBoundaryBreakSchemeId;
  product: string;
  conceptMode?: boolean;
  durationSec?: number;
}): string {
  const def = SCHEMES[input.scheme];
  const hero = subject(input);
  const sec = clampWebBoundaryBreakDurationSec(input.durationSec);
  return [
    `Web-boundary-break creative ad, ${sec}s, continuous morph from Image 1 (start) to Image 2 (end).`,
    `Scheme: ${def.label}. ${def.videoLead}`,
    nameIsClaimImage1IsObjectLine(hero),
    "CRITICAL: forearm + hand + product stay IN FRONT of the nav bar for the whole clip — never pass behind/under the bar.",
    "Keep the thin website nav bar and shelf layout STABLE — only the arm/product motion changes.",
    "No hard cuts, no slideshow, no subtitle bars, no gibberish letters, no inventing a different SKU category than Image 1.",
  ].join(" ");
}

export const WEB_BOUNDARY_BREAK_NEGATIVE =
  "subtitles, captions, watermarks, hard cut montage, jump cut, freeze-frame, " +
  "blurry product, morphing identity, invent competitor brands, talking head vlog, " +
  "meme three-panel drip, palm miniature throw, dark triangle-light void, " +
  "garbled text, illegible letters, melted typography, random glyphs, lorem ipsum junk, " +
  "crowded product cards, price tags under every SKU, multiple ADD TO CART buttons, " +
  "floating tooltips, UI popovers, social-app chrome, extra nav bars, " +
  "extra fingers, melted hands, arm behind the shelf incorrectly, " +
  "arm diving behind the nav bar, arm under the UI bar, wrong occlusion, " +
  "forcing perfume bottles when the upload is not perfume";
