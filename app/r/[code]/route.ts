import { NextResponse } from "next/server";
import {
  buildCampaignShortLinkTarget,
  findCampaignShortLink,
} from "@/lib/campaign-short-links";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ code: string }> };

/**
 * Public first-party redirect: /r/xhs → /?utm_source=xiaohongshu&…
 * Keeps RedNote / social posts short while Mixpanel still sees UTMs on landing.
 */
export async function GET(request: Request, ctx: Ctx) {
  const { code } = await ctx.params;
  const link = findCampaignShortLink(code);
  if (!link) {
    return NextResponse.redirect(new URL("/", request.url), 302);
  }

  try {
    const target = buildCampaignShortLinkTarget(
      link,
      new URL(request.url).searchParams,
    );
    return NextResponse.redirect(new URL(target, request.url), 302);
  } catch {
    return NextResponse.redirect(new URL("/", request.url), 302);
  }
}
