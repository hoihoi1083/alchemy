import type { ContentPlatform, ContentResearchMediaFilter } from "@/lib/content-research-types";
import { instagramHashtagCandidates } from "@/lib/justoneapi-platform-search";

export type ContentResearchSearchHintLabels = {
  xhsKeyword: string;
  igImageHashtag: string;
  igImageHashtagPreview: (tags: string) => string;
  igImageCjkSuggest: string;
  igVideoKeyword: string;
  facebookKeyword: string;
  tiktokVideo: string;
};

function topicLooksCjk(topic: string): boolean {
  return /[\u3040-\u30ff\u3400-\u9fff]/.test(topic.trim());
}

/** Actionable hint under the search box so users pick workable keywords per platform. */
export function contentResearchSearchHint(
  platform: ContentPlatform,
  topic: string,
  mediaFilter: ContentResearchMediaFilter | undefined,
  labels: ContentResearchSearchHintLabels,
): string | null {
  switch (platform) {
    case "xiaohongshu":
      return labels.xhsKeyword;
    case "instagram":
      if (mediaFilter === "video") return labels.igVideoKeyword;
      {
        const tags = instagramHashtagCandidates(topic.trim());
        if (tags.length > 0 && topic.trim()) {
          const preview = labels.igImageHashtagPreview(tags.map((t) => `#${t}`).join(" · "));
          if (topicLooksCjk(topic)) {
            return `${labels.igImageCjkSuggest} ${preview}`;
          }
          return `${labels.igImageHashtag} ${preview}`;
        }
        return labels.igImageHashtag;
      }
    case "tiktok":
      return labels.tiktokVideo;
    case "facebook":
      return labels.facebookKeyword;
    default:
      return null;
  }
}
