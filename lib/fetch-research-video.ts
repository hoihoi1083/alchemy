import type { ContentPlatform } from "@/lib/content-research-types";

/** Fetch a platform post video through our proxy and return a File for the wizard. */
export async function fetchResearchVideoAsFile(
  videoUrl: string,
  platform: ContentPlatform,
  filename = "platform-reference.mp4",
): Promise<File | null> {
  try {
    const proxy = `/api/research-post-video?url=${encodeURIComponent(videoUrl)}&platform=${platform}`;
    const res = await fetch(proxy);
    if (!res.ok) return null;
    const blob = await res.blob();
    if (!blob.size) return null;
    const type = blob.type && blob.type.startsWith("video/") ? blob.type : "video/mp4";
    return new File([blob], filename, { type });
  } catch {
    return null;
  }
}
