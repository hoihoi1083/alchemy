import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/require-app-user";
import type { ContentPlatform } from "@/lib/content-research-types";
import {
  fetchResearchPostVideoBytes,
  isAllowedResearchVideoUrl,
} from "@/lib/research-post-video-fetch";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Proxy research CDN MP4s for the wizard.
 * Returns the full source reel — Seedance digest is built later at
 * /api/prepare-reference-video (generate time), not here, so download + analyze stay fast.
 */
export async function GET(request: Request) {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("url")?.trim();
  const platform = (searchParams.get("platform")?.trim() ?? "tiktok") as ContentPlatform;
  if (!raw || !isAllowedResearchVideoUrl(raw)) {
    return NextResponse.json({ error: "Invalid video URL." }, { status: 400 });
  }

  const result = await fetchResearchPostVideoBytes(raw, platform);
  if (!result.ok || !result.buffer) {
    const status =
      result.error === "too_large" ? 413 : result.status && result.status >= 400 ? result.status : 502;
    return NextResponse.json({ error: result.error ?? "Video fetch failed." }, { status });
  }

  return new NextResponse(result.buffer, {
    status: 200,
    headers: {
      "Content-Type": result.contentType ?? "video/mp4",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
