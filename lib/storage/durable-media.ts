import type { AssetKind } from "@/lib/db/types";
import { isMongoConfigured } from "@/lib/mongodb";
import { persistUserAsset } from "@/lib/storage/persist-asset";
import { isR2Configured } from "@/lib/storage/r2";

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

/**
 * Mirror a fal/CDN (or local bytes) output to R2 and return a durable library URL
 * for the wizard/project to store. Falls back to `fallbackUrl` when R2/Mongo is
 * unavailable so generation still succeeds.
 */
export async function persistAndDurablize(input: {
  clerkId: string;
  kind: AssetKind;
  /** Original fal/CDN URL used as the dedupe key. */
  sourceUrl: string;
  /** URL returned to the client if persist fails (pipeline or fal). */
  fallbackUrl: string;
  projectId?: string | null;
  name?: string | null;
  prompt?: string | null;
  bytes?: Buffer | Uint8Array;
  contentType?: string;
}): Promise<string> {
  if (isLibraryAssetUrl(input.fallbackUrl) || isLibraryAssetUrl(input.sourceUrl)) {
    return input.fallbackUrl;
  }
  const asset = await persistUserAsset({
    clerkId: input.clerkId,
    projectId: input.projectId,
    kind: input.kind,
    sourceUrl: input.sourceUrl,
    name: input.name,
    prompt: input.prompt,
    bytes: input.bytes,
    contentType: input.contentType,
  });
  if (!asset) return input.fallbackUrl;
  return libraryAssetUrl(String(asset._id));
}

export async function persistAndDurablizeMany(input: {
  clerkId: string;
  kind: AssetKind;
  /** Parallel arrays: fal sources + client fallbacks (same length). */
  sourceUrls: string[];
  fallbackUrls: string[];
  projectId?: string | null;
  prompt?: string | null;
}): Promise<string[]> {
  const n = Math.min(input.sourceUrls.length, input.fallbackUrls.length);
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    out.push(
      await persistAndDurablize({
        clerkId: input.clerkId,
        kind: input.kind,
        sourceUrl: input.sourceUrls[i],
        fallbackUrl: input.fallbackUrls[i],
        projectId: input.projectId,
        prompt: input.prompt,
      }),
    );
  }
  return out;
}

/**
 * Read bytes for a durable `/api/library/download/:id` URL from R2.
 * Used by pipeline/ffmpeg/fal mirror so relative library URLs work after persist.
 */
export async function readLibraryAssetMedia(
  url: string,
): Promise<{ bytes: Buffer; contentType: string } | null> {
  const id = libraryAssetIdFromUrl(url);
  if (!id) return null;
  if (!isMongoConfigured() || !isR2Configured()) return null;

  const { getAssetById } = await import("@/lib/db/assets");
  const { getR2ObjectBytes } = await import("@/lib/storage/r2");
  const asset = await getAssetById(id);
  if (!asset?.r2Key) return null;
  const obj = await getR2ObjectBytes(asset.r2Key);
  if (!obj) return null;
  return {
    bytes: Buffer.from(obj.body),
    contentType: obj.contentType || asset.contentType || "application/octet-stream",
  };
}
