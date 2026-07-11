import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/require-app-user";
import type { ContentPlatform } from "@/lib/content-research-types";
import {
  fetchResearchPostVideoBytes,
  isAllowedResearchVideoUrl,
} from "@/lib/research-post-video-fetch";
import { buildSeedanceReferenceClip } from "@/lib/reference-video-prepare";

export const runtime = "nodejs";
export const maxDuration = 120;

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

  let body: BodyInit = result.buffer;
  let trimmed = false;
  try {
    const prepared = await buildSeedanceReferenceClip(Buffer.from(result.buffer));
    body = new Uint8Array(prepared.buffer);
    trimmed = prepared.digestMontage || prepared.sourceDurationSec > 15.25;
  } catch (e) {
    console.warn("[research-post-video] trim skipped:", e);
  }

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": result.contentType ?? "video/mp4",
      ...(trimmed ? { "X-Reference-Trimmed": "1" } : {}),
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
