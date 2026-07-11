/** Normalize pipeline file URLs to same-origin relative paths for video src + API chaining. */
export function toRelativePipelineUrl(url: string): string {
  const trimmed = url.trim();
  const marker = "/api/pipeline-files/";
  const idx = trimmed.indexOf(marker);
  if (idx >= 0) return trimmed.slice(idx);
  return trimmed;
}

export function isPipelineVideoUrl(url: string | null | undefined): boolean {
  return Boolean(url?.includes("/api/pipeline-files/"));
}
