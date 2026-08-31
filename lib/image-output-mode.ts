/** How many / what kind of images to generate on step 2. */
export type ImageOutputMode =
  | "single"
  | "ab"
  | "carousel"
  | "campaign"
  | "teaching-carousel";

export const IMAGE_OUTPUT_MODES: ImageOutputMode[] = [
  "single",
  "ab",
  "carousel",
  "campaign",
  "teaching-carousel",
];

export const DEFAULT_IMAGE_OUTPUT_MODE: ImageOutputMode = "single";

export function imageOutputPreviewSrc(id: ImageOutputMode): string {
  const previewId =
    id === "carousel" ? "teaching-carousel" : id === "campaign" ? "campaign" : id;
  return `/images/studio/image-output/${previewId}.png?v=1`;
}
