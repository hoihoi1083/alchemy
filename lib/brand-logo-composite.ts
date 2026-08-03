import { promises as fs } from "fs";
import path from "path";
import sharp from "sharp";
import type { BrandKit } from "@/lib/brand-kit";
import type { LogoPlacement } from "@/lib/image-refine-prompt";
import {
  archiveCampaignSlidesToPipeline,
  archiveRemoteImageToPipeline,
} from "@/lib/pipeline/archive-image";
import { createOwnedJobDir } from "@/lib/pipeline/job-owner";
import { pipelineFileUrl } from "@/lib/pipeline/local-input";
import { studioSlideFileName } from "@/lib/pipeline/studio-slide-files";
import { persistAndDurablize } from "@/lib/storage/durable-media";

/** Logo width as a fraction of the shorter image side. */
const LOGO_SIZE_RATIO = 0.14;
/** Slightly smaller for tall 9:16 cinematic stills so captions stay clear. */
export const CINEMATIC_LOGO_SIZE_RATIO = 0.11;
const MARGIN_RATIO = 0.04;

/** Hero end-card logo size as fraction of short side (centered). */
export const END_CARD_LOGO_SIZE_RATIO = 0.32;

/** Default corner for cinematic stills — top keeps lower third free for burned captions. */
export const CINEMATIC_LOGO_PLACEMENT: LogoPlacement = "top-right";

export type CompositeLogoOpts = {
  placement?: LogoPlacement;
  /** Override size as fraction of short side (default 0.14, cinematic ~0.11). */
  sizeRatio?: number;
};

export async function loadBrandLogoBuffer(
  logoSource: string | null | undefined,
  opts?: { clerkId?: string },
): Promise<Buffer | null> {
  const src = logoSource?.trim();
  if (!src) return null;
  if (src.startsWith("data:")) {
    const base64 = src.split(",")[1];
    if (!base64) return null;
    return Buffer.from(base64, "base64");
  }
  const { isLibraryAssetUrl } = await import("@/lib/storage/library-asset-url");
  if (isLibraryAssetUrl(src) || src.includes("/api/library/download/")) {
    const clerkId = opts?.clerkId?.trim();
    if (!clerkId) return null;
    const { readLibraryAssetMedia } = await import("@/lib/storage/durable-media");
    const media = await readLibraryAssetMedia(src, clerkId);
    return media?.bytes ?? null;
  }
  if (src.startsWith("http://") || src.startsWith("https://")) {
    const { assertPublicHttpUrl } = await import("@/lib/pipeline/safe-url");
    assertPublicHttpUrl(src);
    const res = await fetch(src, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to load brand logo.");
    return Buffer.from(await res.arrayBuffer());
  }
  return null;
}

export async function loadBrandKitLogoBuffer(
  kit: BrandKit | null | undefined,
  opts?: { clerkId?: string },
): Promise<Buffer | null> {
  return loadBrandLogoBuffer(kit?.logoUrl, opts);
}

/**
 * Deterministically stamp a PNG logo (preserving alpha) onto an ad image.
 * AI edit models treat transparent pixels as black — never use them for logo alpha.
 */
export async function compositeBrandLogoOntoImage(
  inputImage: string | Buffer,
  logoBuffer: Buffer,
  placement: LogoPlacement = "bottom-right",
  opts?: { sizeRatio?: number },
): Promise<Buffer> {
  const base = sharp(inputImage);
  const meta = await base.metadata();
  const width = meta.width ?? 1080;
  const height = meta.height ?? 1920;
  const shortSide = Math.min(width, height);
  const sizeRatio = opts?.sizeRatio ?? LOGO_SIZE_RATIO;
  const maxLogo = Math.max(48, Math.round(shortSide * sizeRatio));
  const margin = Math.max(12, Math.round(shortSide * MARGIN_RATIO));

  const logoMeta = await sharp(logoBuffer).metadata();
  const naturalW = logoMeta.width ?? maxLogo;
  const naturalH = logoMeta.height ?? maxLogo;
  const scale = Math.min(maxLogo / naturalW, maxLogo / naturalH, 1);
  const logoW = Math.max(8, Math.round(naturalW * scale));
  const logoH = Math.max(8, Math.round(naturalH * scale));

  const resized = await sharp(logoBuffer)
    .ensureAlpha()
    .resize(logoW, logoH, { fit: "inside", withoutEnlargement: false })
    .png()
    .toBuffer();

  let left = margin;
  let top = margin;
  if (placement === "bottom-right" || placement === "replace") {
    left = width - logoW - margin;
    top = height - logoH - margin;
  } else if (placement === "bottom-left") {
    left = margin;
    top = height - logoH - margin;
  } else if (placement === "top-right") {
    left = width - logoW - margin;
    top = margin;
  } else if (placement === "top-left") {
    left = margin;
    top = margin;
  } else if (placement === "center") {
    left = Math.round((width - logoW) / 2);
    top = Math.round((height - logoH) / 2);
  }

  return base
    .composite([{ input: resized, left: Math.max(0, left), top: Math.max(0, top) }])
    .png()
    .toBuffer();
}

async function fetchImageBuffer(
  url: string,
  opts?: { clerkId?: string },
): Promise<Buffer> {
  if (url.startsWith("data:")) {
    const base64 = url.split(",")[1];
    if (!base64) throw new Error("Invalid data URL for logo stamp.");
    return Buffer.from(base64, "base64");
  }
  const { isLibraryAssetUrl } = await import("@/lib/storage/library-asset-url");
  if (isLibraryAssetUrl(url) || url.includes("/api/library/download/")) {
    const clerkId = opts?.clerkId?.trim();
    if (!clerkId) throw new Error("clerkId required to load library image for logo stamp.");
    const { readLibraryAssetMedia } = await import("@/lib/storage/durable-media");
    const media = await readLibraryAssetMedia(url, clerkId);
    if (!media) throw new Error("Library image not found for logo stamp.");
    return media.bytes;
  }
  if (url.startsWith("http://") || url.startsWith("https://")) {
    const { assertPublicHttpUrl } = await import("@/lib/pipeline/safe-url");
    assertPublicHttpUrl(url);
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Could not fetch image for logo stamp (${res.status}).`);
    return Buffer.from(await res.arrayBuffer());
  }
  throw new Error("Unsupported image URL for logo stamp.");
}

/** Stamp brand-kit logo onto remote image URLs, then archive to pipeline storage. */
export async function archiveImagesWithBrandLogo(
  request: Request,
  remoteUrls: string[],
  brandKit: BrandKit | null | undefined,
  clerkId: string,
  opts?: { placement?: LogoPlacement; fileName?: string; sizeRatio?: number },
): Promise<{ urls: string[]; logoStamped: boolean }> {
  const logoBuffer = await loadBrandKitLogoBuffer(brandKit, { clerkId });
  if (!logoBuffer || !remoteUrls.length) {
    if (!remoteUrls.length) return { urls: [], logoStamped: false };
    if (remoteUrls.length === 1) {
      return {
        urls: [
          await archiveRemoteImageToPipeline(
            request,
            remoteUrls[0],
            opts?.fileName ?? "generated.png",
            clerkId,
          ),
        ],
        logoStamped: false,
      };
    }
    return {
      urls: await archiveCampaignSlidesToPipeline(request, remoteUrls, clerkId),
      logoStamped: false,
    };
  }

  const placement = opts?.placement ?? "bottom-right";
  const { jobId, dir } = await createOwnedJobDir(clerkId);
  const urls: string[] = [];

  for (let i = 0; i < remoteUrls.length; i++) {
    const remote = remoteUrls[i];
    if (!remote) continue;
    const raw = await fetchImageBuffer(remote, { clerkId });
    const stamped = await compositeBrandLogoOntoImage(raw, logoBuffer, placement, {
      sizeRatio: opts?.sizeRatio,
    });
    const fileName =
      remoteUrls.length === 1 ? (opts?.fileName ?? "generated.png") : studioSlideFileName(i);
    await fs.writeFile(path.join(dir, fileName), stamped);
    const pipelineUrl = pipelineFileUrl(request, jobId, fileName);
    const durable = await persistAndDurablize({
      clerkId,
      kind: "image",
      sourceUrl: `brand-stamp://${jobId}/${fileName}`,
      fallbackUrl: pipelineUrl,
      bytes: stamped,
      contentType: "image/png",
      name: "brand-logo-stamp",
    });
    urls.push(durable);
  }

  return { urls, logoStamped: urls.length === remoteUrls.length };
}

/** Cinematic stills: same corner + size on every scene for brand consistency. */
export async function archiveCinematicStillsWithBrandLogo(
  request: Request,
  remoteUrls: string[],
  brandKit: BrandKit | null | undefined,
  clerkId: string,
  placement: LogoPlacement = CINEMATIC_LOGO_PLACEMENT,
): Promise<{ urls: string[]; logoStamped: boolean }> {
  return archiveImagesWithBrandLogo(request, remoteUrls, brandKit, clerkId, {
    placement,
    sizeRatio: CINEMATIC_LOGO_SIZE_RATIO,
  });
}

/** Stamp an uploaded logo file onto a generated image (Quick Fix). */
export async function archiveImageWithLogoFile(
  request: Request,
  sourceUrl: string,
  logoBuffer: Buffer,
  placement: LogoPlacement,
  clerkId: string,
): Promise<string> {
  const raw = await fetchImageBuffer(sourceUrl, { clerkId });
  const stamped = await compositeBrandLogoOntoImage(raw, logoBuffer, placement);
  const { jobId, dir } = await createOwnedJobDir(clerkId);
  const fileName = "generated.png";
  await fs.writeFile(path.join(dir, fileName), stamped);
  const pipelineUrl = pipelineFileUrl(request, jobId, fileName);
  return persistAndDurablize({
    clerkId,
    kind: "image",
    sourceUrl: `brand-stamp-file://${jobId}/${fileName}`,
    fallbackUrl: pipelineUrl,
    bytes: stamped,
    contentType: "image/png",
    name: "logo-file-stamp",
  });
}
