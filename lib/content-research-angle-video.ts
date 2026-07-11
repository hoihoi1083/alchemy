import { exploreIdFromUrl } from "@/lib/content-research-enrich";
import type { ContentAngleCandidate, ContentResearchPlan } from "@/lib/content-research-types";

function postMatchesAngle(
  post: NonNullable<ContentResearchPlan["posts"]>[number],
  angle: ContentAngleCandidate,
): boolean {
  const anglePostId = angle.id.replace(/^post-/, "");
  if (anglePostId && post.id === anglePostId) return true;
  if (!angle.sourceUrl) return false;
  const postId = exploreIdFromUrl(post.url);
  const angleId = exploreIdFromUrl(angle.sourceUrl);
  return Boolean(postId && angleId && postId === angleId);
}

/** DeepSeek angles may omit sourceVideoUrl — backfill from structured search posts. */
export function enrichAngleVideoFromPlan(
  angle: ContentAngleCandidate,
  plan: ContentResearchPlan,
): ContentAngleCandidate {
  if (angle.sourceVideoUrl?.trim()) return angle;
  const post = plan.posts?.find((p) => postMatchesAngle(p, angle));
  if (!post?.videoUrl?.trim()) return angle;
  const format =
    angle.format === "reel" || post.mediaType === "video" ? ("reel" as const) : angle.format;
  return {
    ...angle,
    sourceVideoUrl: post.videoUrl,
    format,
    formatLabel: format === "reel" ? "Reel / short video" : angle.formatLabel,
  };
}
