import type { BrandKit } from "@/lib/brand-kit";
import { isBrandLogoDataUrl, parseBrandKit } from "@/lib/brand-kit";
import { isMongoConfigured } from "@/lib/mongodb";
import { persistUserAsset } from "@/lib/storage/persist-asset";
import { isR2Configured } from "@/lib/storage/r2";
import { libraryAssetUrl } from "@/lib/storage/library-asset-url";

const MAX_DATA_URL_CHARS = 350_000; // ~260KB binary — refuse storing huge logos in Mongo

function dataUrlToBytes(dataUrl: string): { bytes: Buffer; contentType: string } | null {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  try {
    return {
      contentType: match[1] || "image/png",
      bytes: Buffer.from(match[2], "base64"),
    };
  } catch {
    return null;
  }
}

/**
 * If the kit still embeds a data-URL logo, mirror it to R2 and replace with a
 * durable `/api/library/download/:id` URL before Mongo upsert.
 */
export async function durablizeBrandKitLogo(
  clerkId: string,
  kit: BrandKit,
): Promise<BrandKit> {
  const parsed = parseBrandKit(kit);
  const logo = parsed.logoUrl?.trim() ?? null;
  if (!logo || !isBrandLogoDataUrl(logo)) return parsed;

  if (!isMongoConfigured() || !isR2Configured()) {
    if (logo.length > MAX_DATA_URL_CHARS) {
      throw new Error(
        "Logo is too large to store without cloud storage. Sign in with R2 configured, or use a smaller PNG.",
      );
    }
    return parsed;
  }

  const decoded = dataUrlToBytes(logo);
  if (!decoded) {
    throw new Error("Invalid brand logo data URL.");
  }

  const asset = await persistUserAsset({
    clerkId,
    kind: "image",
    sourceUrl: `brand-logo://${clerkId}/${parsed.updatedAt}`,
    name: "brand-logo",
    bytes: decoded.bytes,
    contentType: decoded.contentType,
  });
  if (!asset) {
    if (logo.length > MAX_DATA_URL_CHARS) {
      throw new Error("Could not store brand logo in library storage.");
    }
    return parsed;
  }

  return {
    ...parsed,
    logoUrl: libraryAssetUrl(String(asset._id)),
  };
}
