/**
 * Bullet-time product elevate (子弹时间产品升格) — MiniMax H3 start→end (Seedance fallback).
 * Start: lifestyle establish — model / hero walks toward camera with product(s).
 * End: frozen bullet-time — products float mid-air; liquid splash / silk threads optional.
 * Video: walk → sudden twist → micro-orbit past floating SKUs → settle.
 *
 * Canonical tutorial length is ~10s. User may pick 8 / 10 / 12; beats scale so the
 * same gag lands (longer = more orbit dwell, not a different story).
 */

import { nameIsClaimImage1IsObjectLine } from "@/lib/prompt-balance-contract";
import type { VideoDuration } from "@/lib/video-settings";

/** Tutorial-matched default when picker is unset / auto. */
export const BULLET_PRODUCT_ELEVATE_DURATION_SEC = 10;

/** Durations the wizard picker may choose for this recipe (no auto). */
export const BULLET_PRODUCT_ELEVATE_DURATION_OPTIONS = ["8", "10", "12"] as const;

export type BulletProductElevateDuration =
  (typeof BULLET_PRODUCT_ELEVATE_DURATION_OPTIONS)[number];

export type BulletProductElevateFrame = "start" | "end";

export type BulletProductElevatePromptInput = {
  product: string;
  conceptMode?: boolean;
  aspectRatio?: string;
  frame: BulletProductElevateFrame;
};

const NO_TEXT =
  "TEXTLESS: no captions, no subtitles, no watermarks, no UI, no invented brand words. Keep real logo readable if already on @Image1.";

/** Reference beat fractions on a 10s spine (tutorial). */
const BEAT_FRAC = {
  walkEnd: 2.5 / 10,
  twistEnd: 4.0 / 10,
  orbitEnd: 7.5 / 10,
} as const;

function subject(input: BulletProductElevatePromptInput): string {
  return (
    input.product.trim() ||
    (input.conceptMode ? "brand hero / mascot product" : "the product")
  );
}

function photoIdentityLock(productName: string): string {
  const named = productName.trim();
  return [
    "IMAGE 1 pixels are the ONLY product / hero identity for this still.",
    nameIsClaimImage1IsObjectLine(named || undefined),
    named
      ? `Call it "${named}" as a label only — silhouette, materials, and colors must match @Image1.`
      : "Keep @Image1's exact object — silhouette, materials, colors.",
    "Do not invent a different SKU because of the typed name.",
  ].join(" ");
}

function fmt(sec: number): string {
  const r = Math.round(sec * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}

/**
 * Resolve wizard duration for this recipe.
 * `auto` / invalid → 10s tutorial default (never leave length to the model).
 */
export function clampBulletProductElevateDurationSec(
  raw: string | number | null | undefined,
): number {
  if (raw === "auto" || raw == null || raw === "") {
    return BULLET_PRODUCT_ELEVATE_DURATION_SEC;
  }
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return BULLET_PRODUCT_ELEVATE_DURATION_SEC;
  const rounded = Math.round(n);
  if (rounded <= 8) return 8;
  if (rounded <= 10) return 10;
  return 12;
}

export function isBulletProductElevateDuration(
  d: string | null | undefined,
): d is BulletProductElevateDuration {
  return (BULLET_PRODUCT_ELEVATE_DURATION_OPTIONS as readonly string[]).includes(
    d ?? "",
  );
}

/** Nano Banana still — start = lifestyle walk, end = bullet-time freeze. */
export function buildBulletProductElevateStillPrompt(
  input: BulletProductElevatePromptInput,
): string {
  const hero = subject(input);
  const ar = input.aspectRatio?.trim() || "9:16";
  const lock = photoIdentityLock(hero);

  if (input.frame === "start") {
    return [
      `Photoreal cinematic still, ${ar}, bright sunny tropical / resort light, shallow depth of field.`,
      lock,
      "START frame: lifestyle establish — a stylish person walking toward camera outdoors (palm trees / bright beach path optional).",
      `They carry or clearly display the @Image1 ${hero} as the hero prop — readable silhouette matching the upload.`,
      "Warm saturated commercial look, Phantom Flex 4K feel, global illumination, soft rim light.",
      "No mid-air floating props yet — normal gravity, grounded walk.",
      NO_TEXT,
    ].join(" ");
  }

  return [
    `Photoreal cinematic still, ${ar}, bright sunny outdoor bokeh, ultra high-speed frozen moment.`,
    lock,
    "END frame: BULLET-TIME freeze — time stopped.",
    `The same @Image1 ${hero} (and optional matching accessories) float mid-air around the person — suspended droplets / silk threads / soft debris optional.`,
    "Camera feels mid micro-orbit past the floating hero product — macro detail on materials.",
    "Same identity as start plate and @Image1. No people replaced. Commercial high-speed splash aesthetic.",
    NO_TEXT,
  ].join(" ");
}

/**
 * Start→end video prompt. Beats scale with duration so 8/10/12 keep the same
 * structure (walk → twist → orbit → settle) — longer = more orbit dwell.
 */
export function buildBulletProductElevateVideoPrompt(input: {
  product: string;
  conceptMode?: boolean;
  durationSec?: number;
}): string {
  const hero =
    input.product.trim() ||
    (input.conceptMode ? "brand hero product" : "the product");
  const sec = clampBulletProductElevateDurationSec(input.durationSec);
  const t1 = fmt(sec * BEAT_FRAC.walkEnd);
  const t2 = fmt(sec * BEAT_FRAC.twistEnd);
  const t3 = fmt(sec * BEAT_FRAC.orbitEnd);
  const tEnd = fmt(sec);

  return [
    `Cinematic one-take EXACTLY ${sec}s bullet-time product elevate. Identity-lock @Image1 (${hero}) — silhouette, materials, colors must not swap SKU.`,
    "Phantom Flex 4K high-speed look, global illumination, warm sunny resort lighting, shallow depth of field.",
    `0.0–${t1}s: full shot — person walks toward camera outdoors with the @Image1 product clearly visible; establish environment.`,
    `${t1}–${t2}s: sudden twist — balance breaks; silk-like threads / soft debris; props including @Image1 lift into the air.`,
    `${t2}–${t3}s: bullet time — ultra slow motion; camera micro-orbits past floating @Image1 and companion props (cup / bag / phone energy if fitting); liquid splash droplets freeze mid-air.`,
    `${t3}–${tEnd}s: time resumes — objects settle with gravity; camera pulls back to clean full shot; strong final hold on the hero product.`,
    `Fit all four beats into ${sec}s — do not invent extra acts; do not end before ${tEnd}s.`,
    "Continuous one-take, no hard cuts, no on-screen text, no watermarks, no UI.",
    "Negative: wrong product SKU, CAD teardown explode, studio gray void only, captions, subtitles, logos invented, shaky handheld chaos",
  ].join(" ");
}

export function prefillBulletProductElevateVideoPrompt(input: {
  product?: string;
  conceptMode?: boolean;
  durationSec?: number;
}): string {
  return buildBulletProductElevateVideoPrompt({
    product: input.product?.trim() || "",
    conceptMode: input.conceptMode,
    durationSec: input.durationSec ?? BULLET_PRODUCT_ELEVATE_DURATION_SEC,
  });
}

/** Duration pills for VideoSettingsPanel (excludes auto / 4 / 6). */
export function bulletProductElevateDurationOptions(): VideoDuration[] {
  return [...BULLET_PRODUCT_ELEVATE_DURATION_OPTIONS];
}
