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

/**
 * Absolute URL suitable for remote HTTPS downloads.
 * Relative `/api/...` paths are prefixed with the page origin in the browser.
 * Blob URLs cannot be analyzed server-side.
 */
export function toAnalyzableMediaUrl(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  const trimmed = url.trim();
  if (trimmed.startsWith("blob:")) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("/")) {
    if (typeof window === "undefined") return null;
    return `${window.location.origin}${trimmed}`;
  }
  return null;
}

/**
 * URL for `/api/analyze-beats` — prefers relative `/api/...` so the server can
 * materialize pipeline/library files locally (avoids localhost HTTPS blocks).
 */
export function toBeatAnalysisUrl(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  const trimmed = url.trim();
  if (trimmed.startsWith("blob:")) return null;
  if (trimmed.startsWith("/api/")) return trimmed.split("#")[0];
  try {
    const parsed = new URL(trimmed);
    if (parsed.pathname.startsWith("/api/")) {
      return `${parsed.pathname}${parsed.search}`;
    }
  } catch {
    /* not an absolute URL */
  }
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return null;
}


