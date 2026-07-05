import type { ContentPlatform } from "@/lib/content-research-types";

/** Resolve a platform post MP4 via server (Just One detail APIs). */
export async function resolveResearchPostVideo(
  platform: ContentPlatform,
  postId: string,
  postUrl?: string,
): Promise<string | null> {
  try {
    const res = await fetch("/api/research-resolve-video", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform, postId, postUrl }),
    });
    const data = await res.json();
    if (!res.ok) return null;
    return typeof data.videoUrl === "string" ? data.videoUrl : null;
  } catch {
    return null;
  }
}
