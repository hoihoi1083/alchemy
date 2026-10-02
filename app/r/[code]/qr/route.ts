import { NextResponse } from "next/server";
import QRCode from "qrcode";
import {
  findCampaignShortLink,
  publicCampaignLandingUrl,
} from "@/lib/campaign-short-links";
import { productSiteUrl } from "@/lib/brand";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ code: string }> };

/**
 * PNG QR for a campaign landing URL (with UTMs — no /r/ hop needed).
 * Example: /r/xhs/qr → scans to https://www.alchemyailab.com/?utm_source=xiaohongshu&…
 */
export async function GET(request: Request, ctx: Ctx) {
  const { code } = await ctx.params;
  const link = findCampaignShortLink(code);
  if (!link) {
    return NextResponse.json({ error: "Unknown short link." }, { status: 404 });
  }

  const url = new URL(request.url);
  const sizeRaw = Number(url.searchParams.get("size") ?? "512");
  const size = Number.isFinite(sizeRaw)
    ? Math.min(1024, Math.max(128, Math.round(sizeRaw)))
    : 512;

  const target = publicCampaignLandingUrl(link, productSiteUrl());
  const png = await QRCode.toBuffer(target, {
    type: "png",
    width: size,
    margin: 2,
    errorCorrectionLevel: "M",
    color: { dark: "#0f172a", light: "#ffffff" },
  });

  return new NextResponse(new Uint8Array(png), {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      "Content-Disposition": `inline; filename="alchemy-${link.code}-qr.png"`,
    },
  });
}
