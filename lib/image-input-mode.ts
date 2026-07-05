export type ImageInputMode = "product-ad" | "product-style" | "describe" | "reference";

/** Upload product → AI polishes into a clean ad (no style reference). */
export const DEFAULT_IMAGE_INPUT_MODE: ImageInputMode = "product-ad";

export const IMAGE_INPUT_MODES: ImageInputMode[] = [
  "product-ad",
  "product-style",
  "describe",
  "reference",
];
