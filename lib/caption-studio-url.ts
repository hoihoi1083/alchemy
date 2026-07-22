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

/** Append cache-buster without breaking URLs that already have `?inline=1`. */
export function withCacheBust(url: string): string {
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}v=${Date.now()}`;
}
