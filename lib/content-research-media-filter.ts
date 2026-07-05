import type { ContentResearchMediaFilter, ContentPlatform, ContentResearchPost } from "@/lib/content-research-types";
import type { WorkflowMode } from "@/lib/workflow-mode";

export function mediaFilterFromWorkflowMode(
  mode: WorkflowMode,
): ContentResearchMediaFilter | undefined {
  if (mode === "image-only") return "image";
  if (mode === "video-only") return "video";
  return undefined;
}

export function postMatchesMediaFilter(
  post: ContentResearchPost,
  filter: ContentResearchMediaFilter,
): boolean {
  const isVideo = post.mediaType === "video" || Boolean(post.videoUrl);
  if (filter === "video") return isVideo;
  if (isVideo) return false;
  return Boolean(post.coverImageUrl || post.imageUrls?.length);
}

export function filterPostsByMedia(
  posts: ContentResearchPost[],
  filter?: ContentResearchMediaFilter,
): ContentResearchPost[] {
  if (!filter) return posts;
  return posts.filter((post) => postMatchesMediaFilter(post, filter));
}

/** Platforms that cannot satisfy an image-only search via their default API. */
export function platformMediaMismatch(
  platform: ContentPlatform,
  filter?: ContentResearchMediaFilter,
): "tiktok-image" | null {
  if (filter === "image" && platform === "tiktok") return "tiktok-image";
  return null;
}

export function angleMatchesMediaFilter(
  format: string,
  filter?: ContentResearchMediaFilter,
): boolean {
  if (!filter) return true;
  if (filter === "video") return format === "reel";
  return format !== "reel";
}
