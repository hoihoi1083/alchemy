import { PRODUCT_SITE_URL } from "@/lib/brand";
import { getBrandKit } from "@/lib/db/brand-kits";
import {
  archiveImagesWithBrandLogo,
  CINEMATIC_LOGO_PLACEMENT,
  END_CARD_LOGO_SIZE_RATIO,
} from "@/lib/brand-logo-composite";
import type { LogoPlacement } from "@/lib/image-refine-prompt";
import type { McpJobErr } from "@/lib/mcp/fal-result";
import { resolveMcpMediaUrl } from "@/lib/mcp/library";
import { isMongoConfigured } from "@/lib/mongodb";
import { libraryAssetIdFromUrl } from "@/lib/storage/library-asset-url";

const PLACEMENTS: LogoPlacement[] = [
  "bottom-right",
  "bottom-left",
  "top-right",
  "top-left",
  "center",
];

function parsePlacement(raw: string | null | undefined): LogoPlacement {
  const v = raw?.trim();
  if (v && (PLACEMENTS as string[]).includes(v)) return v as LogoPlacement;
  return CINEMATIC_LOGO_PLACEMENT;
}

export async function brandKitForMcp(clerkId: string): Promise<
  | {
      ok: true;
      hasLogo: boolean;
      useBrandLogo: boolean;
      tagline: string;
      primaryColor: string;
      secondaryColor: string;
      accentColor: string;
      hint: string;
    }
  | McpJobErr
> {
  if (!isMongoConfigured()) {
    return { ok: false, error: "Brand kit needs the database.", status: 503 };
  }
  const kit = await getBrandKit(clerkId);
  const hasLogo = Boolean(kit?.logoUrl?.trim());
  return {
    ok: true,
    hasLogo,
    useBrandLogo: kit?.useBrandLogo === true,
    tagline: kit?.tagline?.trim() || "",
    primaryColor: kit?.primaryColor ?? "#10b981",
    secondaryColor: kit?.secondaryColor ?? "#0f172a",
    accentColor: kit?.accentColor ?? "#f59e0b",
    hint: hasLogo
      ? "Call alchemy_stamp_logo with a still URL or library_asset_id to overlay this logo."
      : "No logo saved. Add one at /brand-kit on Alchemy.",
  };
}

export async function stampLogoForMcp(input: {
  clerkId: string;
  imageUrl?: string | null;
  libraryAssetId?: string | null;
  placement?: string | null;
}): Promise<
  | {
      ok: true;
      imageUrl: string;
      logoStamped: boolean;
      placement: LogoPlacement;
    }
  | McpJobErr
> {
  if (!isMongoConfigured()) {
    return { ok: false, error: "Brand kit needs the database.", status: 503 };
  }
  const kit = await getBrandKit(input.clerkId);
  if (!kit?.logoUrl?.trim()) {
    return {
      ok: false,
      error: "No brand logo on this account. Upload one at https://www.alchemyailab.com/brand-kit first.",
      status: 400,
    };
  }

  const media = await resolveMcpMediaUrl({
    clerkId: input.clerkId,
    imageUrl: input.imageUrl,
    libraryAssetId: input.libraryAssetId,
  });
  if (!media.ok) return media;

  const placement = parsePlacement(input.placement);
  const request = new Request(`${PRODUCT_SITE_URL}/api/stamp-brand-logo`);
  try {
    const stamped =
      placement === "center"
        ? await archiveImagesWithBrandLogo(
            request,
            [media.url],
            { ...kit, useBrandLogo: true },
            input.clerkId,
            {
              placement: "center",
              sizeRatio: END_CARD_LOGO_SIZE_RATIO,
              fileName: "mcp-logo-stamp.png",
            },
          )
        : await archiveImagesWithBrandLogo(
            request,
            [media.url],
            { ...kit, useBrandLogo: true },
            input.clerkId,
            { placement },
          );
    const out = stamped.urls[0];
    if (!out || !stamped.logoStamped) {
      return { ok: false, error: "Logo stamp did not produce an image.", status: 502 };
    }
    const assetId = libraryAssetIdFromUrl(out);
    if (assetId) {
      const signed = await resolveMcpMediaUrl({
        clerkId: input.clerkId,
        libraryAssetId: assetId,
      });
      if (signed.ok) {
        return {
          ok: true,
          imageUrl: signed.url,
          logoStamped: true,
          placement,
        };
      }
    }
    return { ok: true, imageUrl: out, logoStamped: true, placement };
  } catch (e: unknown) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Logo stamp failed",
      status: 502,
    };
  }
}
