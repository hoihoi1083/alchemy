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
  /** @deprecated Ignored — style/mode toggles must not re-bill vision. */
  visualStyleId?: string;
  /** @deprecated Ignored — style/mode toggles must not re-bill vision. */
  imageCreativeMode?: string;
  hasProductPhoto: boolean;
  researchAngleId?: string | null;
}): string | null {
  const files = referenceFilesFingerprint(input.cover, input.extras);
  if (!files) return null;
  // Vision describes the reference pixels only. Do NOT include visualStyleId /
  // imageCreativeMode — picking model-wear vs quick after upload used to
  // re-trigger analyze-reference (and fal Florence) a second time.
  return [
    files,
    input.promotionMode,
    input.imageOutputMode,
    input.hasProductPhoto ? "1" : "0",
    input.researchAngleId ?? "",
  ].join("::");
}
