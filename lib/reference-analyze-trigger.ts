/** Stable identity for uploaded reference cover — product kit extras are not analyzed. */
export function referenceFilesFingerprint(
  cover: File | null,
  _extras: File[] = [],
): string | null {
  if (!cover) return null;
  // Product-angle kit must not re-trigger style analyze.
  return `${cover.name}:${cover.size}:${cover.lastModified}`;
}

export function referenceAnalyzeTriggerKey(input: {
  cover: File | null;
  extras: File[];
  promotionMode: string;
  imageOutputMode: string;
  visualStyleId: string;
  imageCreativeMode: string;
  hasProductPhoto: boolean;
  researchAngleId?: string | null;
}): string | null {
  const files = referenceFilesFingerprint(input.cover, input.extras);
  if (!files) return null;
  return [
    files,
    input.promotionMode,
    input.imageOutputMode,
    input.visualStyleId,
    input.imageCreativeMode,
    input.hasProductPhoto ? "1" : "0",
    input.researchAngleId ?? "",
  ].join("::");
}
