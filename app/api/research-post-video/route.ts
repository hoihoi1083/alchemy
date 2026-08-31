import { NextResponse } from "next/server";
import { assertPlatformResearchAllowed } from "@/lib/billing/assert-platform-research";
import { requireAppUser } from "@/lib/require-app-user";
import type { ContentPlatform } from "@/lib/content-research-types";
import {
  fetchResearchPostVideoBytes,
  isAllowedResearchVideoUrl,
} from "@/lib/research-post-video-fetch";
import { buildWizardResearchReferenceClip } from "@/lib/reference-video-prepare";

export const runtime = "nodejs";
/** Full CDN download (≤50MB) or prepare=1 trim/compress. */
export const maxDuration = 180;

/**
 * Proxy research CDN MP4s for the wizard.
 * Default: full source reel (legacy).
 * ?prepare=1: ~14.5s digest + compress — small enough for browser analyze fallback.
 */
export async function GET(request: Request) {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;
  const gated = await assertPlatformResearchAllowed(auth.user.userId);
  if (gated) return gated;

  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("url")?.trim();
  const platform = (searchParams.get("platform")?.trim() ?? "tiktok") as ContentPlatform;
  const prepare = ["1", "true", "yes"].includes(
    String(searchParams.get("prepare") ?? "")
      .trim()
      .toLowerCase(),
  );
  if (!raw || !isAllowedResearchVideoUrl(raw)) {
    return NextResponse.json({ error: "Invalid video URL." }, { status: 400 });
  }

  const result = await fetchResearchPostVideoBytes(raw, platform);
  if (!result.ok || !result.buffer) {
    const status =
      result.error === "too_large" ? 413 : result.status && result.status >= 400 ? result.status : 502;
    return NextResponse.json({ error: result.error ?? "Video fetch failed." }, { status });
  }

  if (!prepare) {
    return new NextResponse(result.buffer, {
      status: 200,
      headers: {
        "Content-Type": result.contentType ?? "video/mp4",
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  }

  try {
    const clip = await buildWizardResearchReferenceClip(Buffer.from(result.buffer));
    return new NextResponse(new Uint8Array(clip.buffer), {
      status: 200,
      headers: {
        "Content-Type": "video/mp4",
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        "X-Source-Duration-Sec": String(clip.sourceDurationSec),
        "X-Reference-Duration-Sec": String(clip.durationSec),
        "X-Digest-Montage": clip.digestMontage ? "1" : "0",
        "X-Prepared-Bytes": String(clip.buffer.byteLength),
      },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Video prepare failed.";
    const status = message.includes("ffmpeg") ? 503 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
