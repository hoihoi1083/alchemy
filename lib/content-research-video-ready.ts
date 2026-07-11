import { exploreIdFromUrl } from "@/lib/content-research-enrich";
import type { ContentAngleCandidate, ContentPlatform } from "@/lib/content-research-types";

/** Whether a research angle can supply an MP4 for reference-to-video. */
export type VideoReadyKind = "has_url" | "can_resolve" | "missing";

export function videoReadyKind(
  angle: ContentAngleCandidate,
  platform: ContentPlatform,
): VideoReadyKind {
  if (angle.sourceVideoUrl?.trim()) return "has_url";
  const url = angle.sourceUrl ?? "";
  if (platform === "xiaohongshu" && exploreIdFromUrl(url)) return "can_resolve";
  if (platform === "instagram" && /\/(?:reel|p)\/([^/?#]+)/.test(url)) return "can_resolve";
  if (platform === "tiktok" && /\/video\//.test(url)) return "can_resolve";
  return "missing";
}

export function angleCanSupplyReferenceMp4(
  angle: ContentAngleCandidate,
  platform: ContentPlatform,
): boolean {
  return videoReadyKind(angle, platform) !== "missing";
}
