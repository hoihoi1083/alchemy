/** Whitelisted pipeline filenames for archived studio carousel slides. */
export const STUDIO_SLIDE_FILES = Array.from({ length: 16 }, (_, i) =>
  `slide-${String(i + 1).padStart(2, "0")}.png`,
);

export function studioSlideFileName(index: number): string {
  return `slide-${String(index + 1).padStart(2, "0")}.png`;
}
