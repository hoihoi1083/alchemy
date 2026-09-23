import type { ContentPlatform, ContentResearchMediaFilter } from "@/lib/content-research-types";
import { instagramHashtagCandidates } from "@/lib/justoneapi-platform-search";
import { instagramSearchKeyword } from "@/lib/zh-simplified-to-traditional";

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
    case "instagram": {
      // All IG modes (image / video / storyboard combined) use SC→TC before Just One.
      const trimmed = topic.trim();
      const tags = instagramHashtagCandidates(trimmed);
      const converted = instagramSearchKeyword(trimmed).trim();
      const showCjkConvert =
        topicLooksCjk(trimmed) && converted.length > 0 && converted !== trimmed;

      if (mediaFilter === "video") {
        if (showCjkConvert || (topicLooksCjk(trimmed) && converted)) {
          const preview = labels.igImageHashtagPreview(
            tags.length ? tags.map((t) => `#${t}`).join(" · ") : converted,
          );
          return `${labels.igImageCjkSuggest} ${preview}`;
        }
        return labels.igVideoKeyword;
      }

      if (tags.length > 0 && trimmed) {
        const preview = labels.igImageHashtagPreview(tags.map((t) => `#${t}`).join(" · "));
        if (topicLooksCjk(trimmed)) {
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
