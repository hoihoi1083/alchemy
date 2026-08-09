/** How many / what kind of images to generate on step 2. */
export type ImageOutputMode = "single" | "ab" | "campaign" | "teaching-carousel";

export const IMAGE_OUTPUT_MODES: ImageOutputMode[] = [
  "single",
  "ab",
  "campaign",
  "teaching-carousel",
];

export const DEFAULT_IMAGE_OUTPUT_MODE: ImageOutputMode = "single";

export function imageOutputPreviewSrc(id: ImageOutputMode): string {
  return `/images/studio/image-output/${id}.png?v=1`;
}
