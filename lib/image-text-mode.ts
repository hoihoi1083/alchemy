/** How on-image marketing copy is produced for promo stills. */
export type ImageTextMode = "integrated" | "textless";

export const IMAGE_TEXT_MODES: ImageTextMode[] = ["integrated", "textless"];

export function isImageTextMode(value: string): value is ImageTextMode {
  return value === "integrated" || value === "textless";
}

export function imageTextPreviewSrc(id: ImageTextMode): string {
  return `/images/studio/image-text/${id}.png?v=1`;
}

export const TEXTLESS_IMAGE_GUARD =
  "NO on-screen text, NO headlines, NO sublines, NO logos, NO watermarks, NO typography overlays — marketing copy is added later in the canvas editor.";
