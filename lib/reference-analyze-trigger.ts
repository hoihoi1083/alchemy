/** Stable identity for uploaded reference files — avoids re-analyze on unrelated wizard state churn. */
export function referenceFilesFingerprint(
  cover: File | null,
  extras: File[],
): string | null {
  if (!cover) return null;
  const coverKey = `${cover.name}:${cover.size}:${cover.lastModified}`;
  const extraKeys = extras
    .slice(0, 5)
    .map((f) => `${f.name}:${f.size}:${f.lastModified}`)
    .join(",");
  return extraKeys ? `${coverKey}|${extraKeys}` : coverKey;
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
