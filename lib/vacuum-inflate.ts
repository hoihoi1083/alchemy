/**
 * Vacuum inflate (真空充气) — Seedance start→end recipe.
 * Auto stills: flat vacuum pouch → air-inflated plump pouch → 4s morph.
 */

export const VACUUM_INFLATE_DURATION_SEC = 4;

export type VacuumInflateFrame = "start" | "end";

export type VacuumInflatePromptInput = {
  product: string;
  conceptMode?: boolean;
  aspectRatio?: string;
  frame: VacuumInflateFrame;
};

const NO_TEXT =
  "TEXTLESS: no captions, no watermarks, no UI, no invented brand words. Keep any real logo on the product readable only if already on @Image1.";

function subject(input: VacuumInflatePromptInput): string {
  return input.product.trim() || (input.conceptMode ? "brand pouch" : "product pouch");
}

/** Nano Banana still — start = vacuum-flat, end = air-inflated. */
export function buildVacuumInflateStillPrompt(
  input: VacuumInflatePromptInput,
): string {
  const hero = subject(input);
  const ar = input.aspectRatio?.trim() || "9:16";
  const lock = `Identity lock: same ${hero} packaging / pouch shape family as the uploaded product. Do not invent a different SKU.`;

  if (input.frame === "start") {
    return [
      `Photoreal commercial still, ${ar}, studio soft light on clean seamless backdrop.`,
      lock,
      "START frame: vacuum-compressed flat pouch / airless pack — thin, wrinkled, sucked flat, almost 2D silhouette of the same product packaging.",
      "Show seal edges and wrinkles clearly; product identity still readable.",
      NO_TEXT,
    ].join(" ");
  }

  return [
    `Photoreal commercial still, ${ar}, studio soft light on the SAME seamless backdrop as the start plate.`,
    lock,
    "END frame: same pouch now FULLY AIR-INFLATED — plump, rounded, pressurized, glossy plastic taut with air volume.",
    "Same logo/colors/materials; only inflation state changed. Centered hero.",
    NO_TEXT,
  ].join(" ");
}

/** Seedance image-to-video with start + end frames. */
export function buildVacuumInflateVideoPrompt(input: {
  product: string;
  conceptMode?: boolean;
  durationSec?: number;
}): string {
  const hero = input.product.trim() || (input.conceptMode ? "brand pouch" : "product pouch");
  const sec = input.durationSec ?? VACUUM_INFLATE_DURATION_SEC;
  return [
    `Vacuum-inflate product pack shot, ${sec}s, continuous motion from Image 1 (flat vacuum pouch) to Image 2 (fully inflated pouch).`,
    `Keep ${hero} identity locked — same logo, colors, materials; only air volume changes.`,
    "Air rushes in; wrinkles smooth out; pouch expands smoothly to a plump sealed pack. Soft studio light, clean backdrop.",
    "No hard cuts, no morph into another product, no on-screen text, no hands unless already in the stills.",
  ].join(" ");
}
