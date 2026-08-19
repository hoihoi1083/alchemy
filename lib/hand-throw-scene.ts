/**
 * Hand-throw → real scene (手抛万物变实景) — MiniMax H3 start→end (Seedance fallback).
 * Start: palm holding miniature of @Image1.
 * End: full real scenic hero of the same @Image1 object.
 * Video: throw morphs miniature into the real scene (~6s).
 */

import { nameIsClaimImage1IsObjectLine } from "@/lib/prompt-balance-contract";

export const HAND_THROW_SCENE_DURATION_SEC = 6;

export type HandThrowSceneFrame = "start" | "end";

export type HandThrowScenePromptInput = {
  product: string;
  conceptMode?: boolean;
  aspectRatio?: string;
  frame: HandThrowSceneFrame;
};

const NO_TEXT =
  "TEXTLESS: no captions, no watermarks, no UI, no invented brand words. Keep any real logo on the miniature readable if already on @Image1.";

function subject(input: HandThrowScenePromptInput): string {
  return (
    input.product.trim() ||
    (input.conceptMode ? "brand landmark / logo architecture" : "product landmark")
  );
}

function photoIdentityLock(productName: string): string {
  const named = productName.trim();
  return [
    "IMAGE 1 pixels are the ONLY identity for the miniature and the final real scene.",
    nameIsClaimImage1IsObjectLine(named || undefined),
    named
      ? `Call it "${named}" as a label only — the miniature and scenic end must match @Image1's real category (car stays a car, phone stays a phone, serum bottle stays a bottle).`
      : "Keep @Image1's exact object — silhouette, materials, colors.",
    "Do not invent a different building, vehicle, or SKU because of the typed name.",
  ].join(" ");
}

/** Nano Banana still — start = palm + miniature, end = real scene. */
export function buildHandThrowSceneStillPrompt(
  input: HandThrowScenePromptInput,
): string {
  const hero = subject(input);
  const ar = input.aspectRatio?.trim() || "16:9";
  const lock = photoIdentityLock(hero);

  if (input.frame === "start") {
    return [
      `Photoreal cinematic still, ${ar}, afternoon sun, shallow depth of field.`,
      lock,
      "START frame: a fair-skinned open palm held flat toward camera (show wrist and most of the hand), palm facing up.",
      "Resting in the center of the palm: a detailed MINIATURE model of the @Image1 object — miniature scale, sharp contrast, tiny but readable silhouette and materials from the upload.",
      "If @Image1 is a car, show a miniature car. If a phone, miniature phone. If a bottle, miniature bottle — never swap category to match the product name field.",
      "Background: soft blurred park / sky — no competing landmarks. Natural skin texture, commercial photography, 8k feel.",
      NO_TEXT,
    ].join(" ");
  }

  return [
    `Photoreal cinematic landscape still, ${ar}, clear blue sky, soft clouds.`,
    lock,
    "END frame: the FULL-SCALE real-world hero of the SAME @Image1 object — wide establishing shot, lush foreground grass/trees if outdoor.",
    "The end scene must depict the real object from @Image1 at life scale in a scenic environment (not a miniature, not a hand in frame).",
    "Match the start plate miniature when present — same category, silhouette family, colors, and materials as @Image1. No morph into a different product or landmark.",
    "Same design language as the miniature start plate. No people in foreground. Hero scenic postcard quality.",
    NO_TEXT,
  ].join(" ");
}

/** Start→end video prompt (H3 first, Seedance fallback). */
export function buildHandThrowSceneVideoPrompt(input: {
  product: string;
  conceptMode?: boolean;
  durationSec?: number;
}): string {
  const hero =
    input.product.trim() ||
    (input.conceptMode ? "brand landmark" : "product landmark");
  const sec = input.durationSec ?? HAND_THROW_SCENE_DURATION_SEC;
  return [
    `Hand-throw-to-real-scene effect, ${sec}s, continuous morph from Image 1 (palm holding miniature @Image1 object) to Image 2 (full real scenic @Image1 object).`,
    nameIsClaimImage1IsObjectLine(hero),
    "The hand gently tosses / releases the miniature upward; it grows and transforms into the real scenic hero until the hand leaves frame and only the real scene remains.",
    "Keep Image 1 identity locked across the morph — same category, silhouette family, and colors as the uploaded photo; only scale and setting change.",
    "Smooth cinematic motion, afternoon light, no hard cuts, no on-screen text, no morph into a different building/product than Image 1.",
  ].join(" ");
}
