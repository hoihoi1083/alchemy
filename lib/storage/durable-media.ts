import type { AssetKind } from "@/lib/db/types";
import { isMongoConfigured } from "@/lib/mongodb";
import { isMongoRequired, mongoRequiredErrorMessage } from "@/lib/mongodb-production";
import { isPipelineFileUrl } from "@/lib/pipeline/safe-url";
import { persistUserAsset } from "@/lib/storage/persist-asset";
import { isR2Configured } from "@/lib/storage/r2";
import { isR2Required, r2RequiredErrorMessage } from "@/lib/r2-production";
import {
  isLibraryAssetUrl,
  libraryAssetIdFromUrl,
  libraryAssetUrl,
} from "@/lib/storage/library-asset-url";
import type { VideoTimingManifest } from "@/lib/video-timing-manifest";
import { parseTimingManifest } from "@/lib/video-timing-manifest";

export {
  isHttpOrLibraryMediaUrl,
  isLibraryAssetUrl,
  libraryAssetIdFromUrl,
  libraryAssetUrl,
} from "@/lib/storage/library-asset-url";

export class DurableMediaUnavailableError extends Error {
  readonly code = "DURABLE_MEDIA_UNAVAILABLE";
  constructor(message: string) {
    super(message);
    this.name = "DurableMediaUnavailableError";
  }
}

/**
 * Mirror a fal/CDN (or local bytes) output to R2 and return a durable library URL.
 * In production, missing R2/Mongo throws — never silently returns ephemeral fal/pipeline URLs.
 * In development, falls back to `fallbackUrl` when storage is unavailable.
 */
export async function persistAndDurablize(input: {
  clerkId: string;
  kind: AssetKind;
  /** Original fal/CDN URL used as the dedupe key. */
  sourceUrl: string;
  /** URL returned to the client if persist fails (dev only). */
  fallbackUrl: string;
  projectId?: string | null;
  name?: string | null;
  prompt?: string | null;
  bytes?: Buffer | Uint8Array;
  contentType?: string;
  timingManifest?: VideoTimingManifest | null;
}): Promise<string> {
  const timing = parseTimingManifest(input.timingManifest);
  if (isLibraryAssetUrl(input.fallbackUrl) || isLibraryAssetUrl(input.sourceUrl)) {
    const existingUrl = isLibraryAssetUrl(input.fallbackUrl)
      ? input.fallbackUrl
      : input.sourceUrl;
    if (timing) {
      const id = libraryAssetIdFromUrl(existingUrl);
      if (id) {
        const { updateAssetTiming } = await import("@/lib/db/assets");
        await updateAssetTiming(id, timing);
      }
    }
    return existingUrl;
  }

  if (isR2Required() && !isR2Configured()) {
    throw new DurableMediaUnavailableError(r2RequiredErrorMessage());
  }
  if (isMongoRequired() && !isMongoConfigured()) {
    throw new DurableMediaUnavailableError(mongoRequiredErrorMessage());
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
    timingManifest: timing,
  });
  if (!asset) {
    const reason =
      !isMongoConfigured() && !isR2Configured()
        ? "mongo_and_r2_unconfigured"
        : !isMongoConfigured()
          ? "mongo_unconfigured"
          : !isR2Configured()
            ? "r2_unconfigured"
            : "persist_returned_null";
    console.error("[durable-media] persist failed", {
      reason,
      clerkId: input.clerkId,
      kind: input.kind,
      sourceUrl: input.sourceUrl.slice(0, 160),
      fallbackUrl: input.fallbackUrl.slice(0, 160),
      productionHardFail: isR2Required() || isMongoRequired(),
    });
    void import("@sentry/nextjs")
      .then((Sentry) => {
        Sentry.captureMessage("durable_media_persist_failed", {
          level: "error",
          extra: { reason, kind: input.kind, clerkId: input.clerkId },
        });
      })
      .catch(() => {
        /* no Sentry */
      });

    if (isR2Required() || isMongoRequired()) {
      throw new DurableMediaUnavailableError(
        reason === "r2_unconfigured" || reason === "mongo_and_r2_unconfigured"
          ? r2RequiredErrorMessage()
          : reason === "mongo_unconfigured"
            ? mongoRequiredErrorMessage()
            : "Could not save media to My library. Please try again.",
      );
    }
    // Never hand clients ephemeral /tmp pipeline URLs — the next serverless
    // instance will 404. Fail loudly so callers configure R2/Mongo.
    if (isPipelineFileUrl(input.fallbackUrl)) {
      throw new DurableMediaUnavailableError(
        "Could not save media to My library. Configure cloud storage (R2) and try again.",
      );
    }
    return input.fallbackUrl;
  }
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
 * Requires `clerkId` so rematerialization cannot cross user accounts.
 */
export async function readLibraryAssetMedia(
  url: string,
  clerkId: string,
): Promise<{ bytes: Buffer; contentType: string } | null> {
  const id = libraryAssetIdFromUrl(url);
  if (!id || !clerkId.trim()) return null;
  if (!isMongoConfigured() || !isR2Configured()) return null;

  const { getAssetForUser } = await import("@/lib/db/assets");
  const { getR2ObjectBytes } = await import("@/lib/storage/r2");
  const asset = await getAssetForUser(clerkId.trim(), id);
  if (!asset?.r2Key) return null;
  const obj = await getR2ObjectBytes(asset.r2Key);
  if (!obj) return null;
  return {
    bytes: Buffer.from(obj.body),
    contentType: obj.contentType || asset.contentType || "application/octet-stream",
  };
}
