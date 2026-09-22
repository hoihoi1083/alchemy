/**
 * Client-safe library asset URL helpers (no Node/Mongo/R2 imports).
 * Keep pure so browser bundles can detect durable `/api/library/download/:id` URLs.
 */

/** Client-facing durable URL for a private R2 asset (re-signs on each request). */
export function libraryAssetUrl(assetId: string, inline = true): string {
  const base = `/api/library/download/${assetId}`;
  return inline ? `${base}?inline=1` : base;
}

export function isLibraryAssetUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const path = url.startsWith("http") ? new URL(url).pathname : url.split("?")[0];
    return /^\/api\/library\/download\/[a-f0-9]{24}$/i.test(path);
  } catch {
    return false;
  }
}

/** Absolute http(s) or same-origin durable library path — valid canvas / generate media. */
export function isHttpOrLibraryMediaUrl(url: string | null | undefined): url is string {
  if (!url?.trim()) return false;
  const u = url.trim();
  if (u.startsWith("https://") || u.startsWith("http://")) return true;
  return isLibraryAssetUrl(u);
}

export function libraryAssetIdFromUrl(url: string): string | null {
  try {
    const path = url.startsWith("http") ? new URL(url).pathname : url.split("?")[0];
    const m = path.match(/^\/api\/library\/download\/([a-f0-9]{24})$/i);
    return m?.[1] ?? null;
  } catch {
    return null;
  }
}

/**
 * Prefer streaming (`?inline=1`) for board / img / video / Konva.
 * Non-inline library GETs often 302 to R2 and break media elements.
 */
export function withLibraryInline(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  if (!isLibraryAssetUrl(trimmed) && !trimmed.includes("/api/library/download/")) {
    return trimmed;
  }
  if (/[?&]inline=1(?:&|$)/.test(trimmed)) return trimmed;
  return `${trimmed}${trimmed.includes("?") ? "&" : "?"}inline=1`;
}

/** Prefer previewUrl (already inline) when picking from the library picker. */
export function libraryMediaUrlForBoard(asset: {
  previewUrl?: string | null;
  downloadUrl?: string | null;
}): string {
  const preview = asset.previewUrl?.trim() || "";
  const download = asset.downloadUrl?.trim() || "";
  return withLibraryInline(preview || download);
}
