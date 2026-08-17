/**
 * Hand-throw → real scene (手抛万物变实景) — Seedance start→end.
 * Start: palm holding miniature product/building.
 * End: full real scenic / architecture hero matching the miniature.
 * Video: throw morphs miniature into the real scene (~6s).
 */

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

/** Nano Banana still — start = palm + miniature, end = real scene. */
export function buildHandThrowSceneStillPrompt(
  input: HandThrowScenePromptInput,
): string {
  const hero = subject(input);
  const ar = input.aspectRatio?.trim() || "16:9";
  const lock = `Identity lock: the miniature and the end scene must depict the SAME ${hero} design language (silhouette, colors, materials). Do not invent a different building or SKU.`;

  if (input.frame === "start") {
    return [
      `Photoreal cinematic still, ${ar}, afternoon sun, shallow depth of field.`,
      lock,
      "START frame: a fair-skinned open palm held flat toward camera (show wrist and most of the hand), palm facing up.",
      `Resting in the center of the palm: a detailed MINIATURE model of ${hero} — miniature model scale, sharp contrast, tiny but readable architecture/product silhouette.`,
      "Background: soft blurred park / sky — no competing landmarks. Natural skin texture, commercial photography, 8k feel.",
      NO_TEXT,
    ].join(" ");
  }

  return [
    `Photoreal cinematic landscape still, ${ar}, clear blue sky, soft clouds.`,
    lock,
    `END frame: the FULL-SCALE real-world scene of ${hero} — wide establishing shot, lush foreground grass/trees if outdoor, architecture or product environment filling the frame as a real place (not a miniature, not a hand).`,
    "Same design language as the miniature start plate. No people in foreground. Hero scenic postcard quality.",
    NO_TEXT,
  ].join(" ");
}

/** Seedance image-to-video with start + end frames. */
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
    `Hand-throw-to-real-scene effect, ${sec}s, continuous morph from Image 1 (palm holding miniature ${hero}) to Image 2 (full real scenic ${hero}).`,
    "The hand gently tosses / releases the miniature upward; the miniature grows and transforms into the real landscape/architecture until the hand leaves frame and only the real scene remains.",
    `Keep ${hero} identity locked across the morph — same silhouette family and colors.`,
    "Smooth cinematic motion, afternoon light, no hard cuts, no on-screen text, no morph into a different building/product.",
  ].join(" ");
}
