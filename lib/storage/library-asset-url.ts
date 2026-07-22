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

export function libraryAssetIdFromUrl(url: string): string | null {
  try {
    const path = url.startsWith("http") ? new URL(url).pathname : url.split("?")[0];
    const m = path.match(/^\/api\/library\/download\/([a-f0-9]{24})$/i);
    return m?.[1] ?? null;
  } catch {
    return null;
  }
}
