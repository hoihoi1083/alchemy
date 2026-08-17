/**
 * Stylized product explode (产品拆解动效) — Seedance start→end.
 * Start: clean studio hero packshot.
 * End: soft floating-parts / exploded silhouette of the SAME product (stylized, not CAD).
 * Video: parts gently separate then settle (~4s).
 *
 * Honest UX: invents plausible floating shells/accents — not accurate internals.
 */

export const PRODUCT_EXPLODE_DURATION_SEC = 4;

export type ProductExplodeFrame = "start" | "end";

export type ProductExplodePromptInput = {
  product: string;
  conceptMode?: boolean;
  aspectRatio?: string;
  frame: ProductExplodeFrame;
};

const NO_TEXT =
  "TEXTLESS: no captions, no callout labels, no watermarks, no UI, no invented brand words. Keep real logo readable if already on @Image1.";

function subject(input: ProductExplodePromptInput): string {
  return (
    input.product.trim() ||
    (input.conceptMode ? "brand device / mascot product" : "the product")
  );
}

/** Nano Banana still — start = whole hero, end = stylized explode. */
export function buildProductExplodeStillPrompt(
  input: ProductExplodePromptInput,
): string {
  const hero = subject(input);
  const ar = input.aspectRatio?.trim() || "16:9";
  const lock = `Identity lock: same ${hero} outer shell, colors, and materials as the uploaded product. Do not invent a different SKU.`;

  if (input.frame === "start") {
    return [
      `Photoreal commercial still, ${ar}, soft even studio light on a clean light-gray seamless backdrop.`,
      lock,
      `START frame: centered intact ${hero} hero packshot — sharp, premium, minimalist tech-advertising look (earbuds / electronics / pack OK).`,
      "Whole product assembled, floating slightly above the case/base if applicable. No hands, no clutter.",
      NO_TEXT,
    ].join(" ");
  }

  return [
    `Photoreal commercial still, ${ar}, same clean light-gray seamless studio backdrop as the start plate.`,
    lock,
    `END frame: STYLIZED exploded / floating-parts view of the SAME ${hero} — outer shells, lids, buds/caps, and soft geometric accents gently separated in mid-air like a premium product teardown animation.`,
    "Keep the main silhouette recognizable; parts float symmetrically. Do NOT invent readable PCB text, fake chip brands, or medically accurate internals — soft stylized components only.",
    "Minimalist tech commercial, high-end DogTV-style product CG feel.",
    NO_TEXT,
  ].join(" ");
}

/** Seedance image-to-video with start + end frames. */
export function buildProductExplodeVideoPrompt(input: {
  product: string;
  conceptMode?: boolean;
  durationSec?: number;
}): string {
  const hero =
    input.product.trim() ||
    (input.conceptMode ? "brand device" : "the product");
  const sec = input.durationSec ?? PRODUCT_EXPLODE_DURATION_SEC;
  return [
    `Stylized product explode animation, ${sec}s, continuous motion from Image 1 (intact ${hero} hero) to Image 2 (floating-parts explode of the same ${hero}).`,
    "Parts gently separate outward then hover — premium tech commercial, clean light-gray studio, soft specular highlights.",
    `Keep ${hero} identity locked — same colors and outer form; only separation state changes.`,
    "No hard cuts, no on-screen labels, no violent destruction, no inventing a different product, no readable fake PCB brands.",
  ].join(" ");
}
