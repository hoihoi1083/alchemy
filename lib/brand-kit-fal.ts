import { fal } from "@fal-ai/client";
import type { BrandKit } from "@/lib/brand-kit";
import { isBrandLogoDataUrl } from "@/lib/brand-kit";
import { mirrorImageUrlToFalStorage } from "@/lib/fal-mirror-media";
import { isLibraryAssetUrl } from "@/lib/storage/library-asset-url";

function dataUrlToBuffer(dataUrl: string): { buffer: Buffer; mime: string } {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error("Invalid logo data URL.");
  return {
    mime: match[1] || "image/png",
    buffer: Buffer.from(match[2], "base64"),
  };
}

/**
 * Upload brand-kit logo to fal storage so edit models can composite it.
 * Library / pipeline URLs require `clerkId` (ownership-scoped read).
 * Throws on failure — callers must not swallow without logging / user-visible note.
 */
export async function uploadBrandKitLogoToFal(
  kit: BrandKit | null | undefined,
  opts?: { clerkId?: string },
): Promise<string | null> {
  const logo = kit?.logoUrl?.trim();
  if (!logo) return null;

  if (isBrandLogoDataUrl(logo)) {
    const { buffer, mime } = dataUrlToBuffer(logo);
    const ext = mime.includes("jpeg") || mime.includes("jpg") ? "jpg" : "png";
    const file = new File([new Uint8Array(buffer)], `brand-logo.${ext}`, { type: mime });
    return fal.storage.upload(file);
  }

  if (isLibraryAssetUrl(logo) || logo.includes("/api/library/download/")) {
    const clerkId = opts?.clerkId?.trim();
    if (!clerkId) {
      throw new Error("clerkId is required to mirror a library brand logo to fal.");
    }
    return mirrorImageUrlToFalStorage(logo, { clerkId });
  }

  if (logo.startsWith("http://") || logo.startsWith("https://")) {
    const clerkId = opts?.clerkId?.trim();
    // Prefer ownership-aware mirror (SSRF allowlist + library/pipeline gates).
    if (clerkId) {
      return mirrorImageUrlToFalStorage(logo, { clerkId });
    }
    const res = await fetch(logo, { cache: "no-store" });
    if (!res.ok) throw new Error(`Brand logo fetch failed (${res.status}).`);
    const blob = await res.blob();
    const file = new File([blob], "brand-logo.png", { type: blob.type || "image/png" });
    return fal.storage.upload(file);
  }

  throw new Error("Unsupported brand logo URL format for fal upload.");
}
