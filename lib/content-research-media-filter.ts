import type { ContentResearchMediaFilter, ContentPlatform, ContentResearchPost } from "@/lib/content-research-types";
import type { WorkflowMode } from "@/lib/workflow-mode";

export function mediaFilterFromWorkflowMode(
  mode: WorkflowMode,
): ContentResearchMediaFilter | undefined {
  if (mode === "image-only") return "image";
  if (mode === "video-only") return "video";
  return undefined;
}

export function postIsVideoPost(post: ContentResearchPost): boolean {
  return post.mediaType === "video" || Boolean(post.videoUrl);
}

export function postHasImageMedia(post: ContentResearchPost): boolean {
  return Boolean(post.coverImageUrl || post.imageUrls?.length);
}

export function postMatchesMediaFilter(
  post: ContentResearchPost,
  filter: ContentResearchMediaFilter,
): boolean {
  const isVideo = postIsVideoPost(post);
  if (filter === "video") return isVideo;
  if (isVideo) return false;
  return postHasImageMedia(post);
}

/** User-facing reason when a pinned post does not match the current workflow filter. */
export function mediaFilterMismatchMessage(
  post: ContentResearchPost,
  filter: ContentResearchMediaFilter,
): string {
  const isVideo = postIsVideoPost(post);
  const hasImages = postHasImageMedia(post);

  if (filter === "video") {
    return isVideo
      ? ""
      : "This post has no video — switch workflow to Image, or pick a reel link.";
  }

  if (isVideo) {
    return "This post is a video — switch workflow to Video, or pick an image/carousel link.";
  }

  if (!hasImages) {
    return "Could not load images from this post (platform API returned incomplete data). Wait a moment and try again, or paste the full xiaohongshu.com/explore/… link copied from the app.";
  }

  return "This post does not match the current workflow.";
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
