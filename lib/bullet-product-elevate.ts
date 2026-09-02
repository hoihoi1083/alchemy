/**
 * Bullet-time product elevate (子弹时间产品升格) — MiniMax H3 start→end (Seedance fallback).
 * Start: lifestyle establish — model / hero walks toward camera with product(s).
 * End: frozen bullet-time — products float mid-air; liquid splash / silk threads optional.
 * Video: walk → sudden twist → micro-orbit past floating SKUs → settle (~8s).
 *
 * Inspired by viral Seedance “产品升格” tutorials (model + multi-prop stills).
 */

import { nameIsClaimImage1IsObjectLine } from "@/lib/prompt-balance-contract";

export const BULLET_PRODUCT_ELEVATE_DURATION_SEC = 8;

export type BulletProductElevateFrame = "start" | "end";

export type BulletProductElevatePromptInput = {
  product: string;
  conceptMode?: boolean;
  aspectRatio?: string;
  frame: BulletProductElevateFrame;
};

const NO_TEXT =
  "TEXTLESS: no captions, no subtitles, no watermarks, no UI, no invented brand words. Keep real logo readable if already on @Image1.";

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

/** Start→end video prompt (H3 first, Seedance fallback). Beats compressed to ~8s. */
export function buildBulletProductElevateVideoPrompt(input: {
  product: string;
  conceptMode?: boolean;
  durationSec?: number;
}): string {
  const hero =
    input.product.trim() ||
    (input.conceptMode ? "brand hero product" : "the product");
  const sec = input.durationSec ?? BULLET_PRODUCT_ELEVATE_DURATION_SEC;

  return [
    `Cinematic one-take ~${sec}s bullet-time product elevate. Identity-lock @Image1 (${hero}) — silhouette, materials, colors must not swap SKU.`,
    "Phantom Flex 4K high-speed look, global illumination, warm sunny resort lighting, shallow depth of field.",
    "0.0–2.0s: full shot — person walks toward camera outdoors with the @Image1 product clearly visible; establish environment.",
    "2.0–3.5s: sudden twist — balance breaks; silk-like threads / soft debris; props including @Image1 lift into the air.",
    "3.5–6.5s: bullet time — ultra slow motion; camera micro-orbits past floating @Image1 and companion props (cup / bag / phone energy if fitting); liquid splash droplets freeze mid-air.",
    `6.5–${sec}.0s: time resumes — objects settle with gravity; camera pulls back to clean full shot; strong final hold on the hero product.`,
    "Continuous one-take, no hard cuts, no on-screen text, no watermarks, no UI.",
    "Negative: wrong product SKU, CAD teardown explode, studio gray void only, captions, subtitles, logos invented, shaky handheld chaos",
  ].join(" ");
}

export function prefillBulletProductElevateVideoPrompt(input: {
  product?: string;
  conceptMode?: boolean;
}): string {
  return buildBulletProductElevateVideoPrompt({
    product: input.product?.trim() || "",
    conceptMode: input.conceptMode,
    durationSec: BULLET_PRODUCT_ELEVATE_DURATION_SEC,
  });
}
