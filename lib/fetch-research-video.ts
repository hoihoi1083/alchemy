import type { ContentPlatform } from "@/lib/content-research-types";

/** Fetch a platform post video through our proxy and return a File for the wizard. */
const RESEARCH_VIDEO_FETCH_TIMEOUT_MS = 120_000;

export type ResearchVideoFileResult = {
  file: File;
  /** CDN URL for server-side analyze (full reel — no browser re-upload). */
  sourceUrl: string;
  platform: ContentPlatform;
};

export async function fetchResearchVideoAsFile(
  videoUrl: string,
  platform: ContentPlatform,
  filename = "platform-reference.mp4",
): Promise<File | null> {
  const out = await fetchResearchVideoPrepared(videoUrl, platform, filename);
  return out?.file ?? null;
}

/** Prepared (~15s) clip for preview + small upload fallback; keeps sourceUrl for analyze. */
export async function fetchResearchVideoPrepared(
  videoUrl: string,
  platform: ContentPlatform,
  filename = "platform-reference.mp4",
): Promise<ResearchVideoFileResult | null> {
  try {
    const proxy =
      `/api/research-post-video?prepare=1&url=${encodeURIComponent(videoUrl)}&platform=${platform}`;
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), RESEARCH_VIDEO_FETCH_TIMEOUT_MS);
    const res = await fetch(proxy, {
      credentials: "include",
      cache: "no-store",
      signal: controller.signal,
    });
    window.clearTimeout(timer);
    if (!res.ok) return null;
    const blob = await res.blob();
    if (!blob.size) return null;
    const type = blob.type && blob.type.startsWith("video/") ? blob.type : "video/mp4";
    return {
      file: new File([blob], filename, { type }),
      sourceUrl: videoUrl,
      platform,
    };
  } catch {
    return null;
  }
}
