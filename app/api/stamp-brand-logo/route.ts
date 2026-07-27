import { NextResponse } from "next/server";
import {
  archiveCinematicStillsWithBrandLogo,
  archiveImagesWithBrandLogo,
  CINEMATIC_LOGO_PLACEMENT,
  END_CARD_LOGO_SIZE_RATIO,
} from "@/lib/brand-logo-composite";
import { parseBrandKit } from "@/lib/brand-kit";
import type { LogoPlacement } from "@/lib/image-refine-prompt";
import { requireAppUser } from "@/lib/require-app-user";
import { SERVER_ERRORS } from "@/lib/api/server-errors";

export const runtime = "nodejs";
export const maxDuration = 60;

const PLACEMENTS: LogoPlacement[] = [
  "bottom-right",
  "bottom-left",
  "top-right",
  "top-left",
  "center",
  "replace",
];

function parsePlacement(raw: unknown): LogoPlacement {
  if (typeof raw === "string" && (PLACEMENTS as string[]).includes(raw)) {
    return raw as LogoPlacement;
  }
  return CINEMATIC_LOGO_PLACEMENT;
}

/**
 * Deterministically stamp the caller's brand-kit logo onto stills.
 * Center placement = end-card hero size; corners = cinematic badge size.
 */
export async function POST(request: Request) {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;

  let body: {
    image_urls?: string[];
    brand_kit?: unknown;
    placement?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: SERVER_ERRORS.invalidInput }, { status: 400 });
  }

  const urls = Array.isArray(body.image_urls)
    ? body.image_urls.filter((u): u is string => typeof u === "string" && u.length > 0)
    : [];
  if (!urls.length) {
    return NextResponse.json({ error: "image_urls required." }, { status: 400 });
  }

  const brandKit = parseBrandKit(body.brand_kit);
  if (!brandKit.logoUrl) {
    return NextResponse.json({
      urls,
      logoStamped: false,
      note: "No brand logo uploaded — stills unchanged.",
    });
  }

  try {
    const placement = parsePlacement(body.placement);
    const stamped =
      placement === "center"
        ? await archiveImagesWithBrandLogo(request, urls, brandKit, {
            placement: "center",
            sizeRatio: END_CARD_LOGO_SIZE_RATIO,
            fileName: "generated.png",
          })
        : await archiveCinematicStillsWithBrandLogo(
            request,
            urls,
            brandKit,
            placement,
          );
    return NextResponse.json({
      urls: stamped.urls.length === urls.length ? stamped.urls : urls,
      logoStamped: stamped.logoStamped,
      placement,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Logo stamp failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
