/** How on-image marketing copy is produced for promo stills. */
export type ImageTextMode = "integrated" | "textless";

export const IMAGE_TEXT_MODES: ImageTextMode[] = ["integrated", "textless"];

export function isImageTextMode(value: string): value is ImageTextMode {
  return value === "integrated" || value === "textless";
}

/** Storyboard APIs default textless; pass fallback "integrated" for single-image ads. */
export function parseImageTextMode(
  raw: string | null | undefined,
  fallback: ImageTextMode = "textless",
): ImageTextMode {
  const v = String(raw ?? "").trim();
  return isImageTextMode(v) ? v : fallback;
}

export function imageTextPreviewSrc(id: ImageTextMode): string {
  return `/images/studio/image-text/${id}.png?v=1`;
}

export const TEXTLESS_IMAGE_GUARD =
  "NO on-screen text, NO headlines, NO sublines, NO logos, NO watermarks, NO typography overlays — marketing copy is added later in the canvas editor.";
