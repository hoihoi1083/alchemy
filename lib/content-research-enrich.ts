import type {
  ContentAngleCandidate,
  ContentResearchPlan,
  ContentResearchPost,
} from "@/lib/content-research-types";
import { formatLabelForAngleFormat, inferFormatFromPost } from "@/lib/content-research-infer";
import { angleCanSupplyReferenceMp4 } from "@/lib/content-research-video-ready";
import { finalizeXhsAngle, finalizeXhsPost, angleHasReferenceCover } from "@/lib/research-cover-url";

export const RESEARCH_ANGLES_PER_PAGE = 3;
export const RESEARCH_POSTS_FETCH_LIMIT = 12;
export const RESEARCH_LIVE_ANGLE_COUNT = 9;

export function exploreIdFromUrl(url: string): string | null {
  const m = url.match(/\/explore\/([a-f0-9]+)/i);
  if (m?.[1]) return m[1].toLowerCase();
  const discovery = url.match(/\/discovery\/item\/([a-f0-9]+)/i)?.[1];
  return discovery?.toLowerCase() ?? null;
}

function urlsMatch(a: string, b: string): boolean {
  const idA = exploreIdFromUrl(a);
  const idB = exploreIdFromUrl(b);
  if (idA && idB) return idA === idB;
  return a.replace(/\/$/, "").split("?")[0] === b.replace(/\/$/, "").split("?")[0];
}

function findPostForAngle(
  angle: ContentAngleCandidate,
  posts: ContentResearchPost[],
  used: Set<string>,
): ContentResearchPost | undefined {
  // Prefer an unused post that matches the cited source URL — so 3 rewritten
  // angles that all cite the same Facebook/viral post don't all show one thumb.
  if (angle.sourceUrl) {
    const matchedUnused = posts.find(
      (p) => !used.has(p.id) && urlsMatch(p.url, angle.sourceUrl!),
    );
    if (matchedUnused) return matchedUnused;
  }
  if (angle.sourceTitle) {
    const title = angle.sourceTitle.toLowerCase();
    const matched = posts.find(
      (p) => !used.has(p.id) && p.title.toLowerCase().includes(title.slice(0, 12)),
    );
    if (matched) return matched;
  }
  // Next unused post (different cover). Only fall back to a already-used match
  // when every post is already claimed — better a shared thumb than none.
  const unused = posts.find((p) => !used.has(p.id));
  if (unused) return unused;
  if (angle.sourceUrl) {
    return posts.find((p) => urlsMatch(p.url, angle.sourceUrl!));
  }
  return undefined;
}

export function enrichAngleWithPost(
  angle: ContentAngleCandidate,
  post: ContentResearchPost,
): ContentAngleCandidate {
  const normalized =
    post.platform === "xiaohongshu" ? finalizeXhsPost(post) : post;
  return finalizeXhsAngle({
    ...angle,
    sourceUrl: angle.sourceUrl || normalized.url,
    sourceTitle: angle.sourceTitle || normalized.title,
    sourceSnippet: angle.sourceSnippet || normalized.snippet || undefined,
    sourceCoverImageUrl: normalized.coverImageUrl,
    sourceImageUrls:
      normalized.imageUrls ?? (normalized.coverImageUrl ? [normalized.coverImageUrl] : undefined),
    sourceVideoUrl: normalized.videoUrl,
    sourceAuthor: normalized.author,
    sourceLikes: normalized.likes,
    sourceCollects: normalized.collects,
    sourceComments: normalized.comments,
  });
}

export function attachSourcePostsToPlan(plan: ContentResearchPlan): ContentResearchPlan {
  const posts = plan.posts;
  if (!posts?.length) return plan;

  const used = new Set<string>();
  const sorted = [...plan.candidates].sort((a, b) => b.score - a.score);
  const enrichedCandidates = sorted.map((angle) => {
    const post = findPostForAngle(angle, posts, used);
    if (!post) return angle;
    used.add(post.id);
    return enrichAngleWithPost(angle, post);
  });

  const liteAngles: ContentAngleCandidate[] = [];
  for (const post of posts) {
    if (used.has(post.id)) continue;
    const inferredFormat = inferFormatFromPost(post);
    const imageCount = post.imageUrls?.length ?? (post.coverImageUrl ? 1 : 0);
    liteAngles.push(
      finalizeXhsAngle({
        id: `post-${post.id}`,
        title: post.title,
        hook: post.snippet.slice(0, 100) || post.title,
        scriptOutline: "",
        format: inferredFormat,
        formatLabel: formatLabelForAngleFormat(inferredFormat, imageCount),
        whyItWorks: "High-engagement post on this platform — reuse the hook structure for your product.",
        bulletPoints: [],
        cta: "",
        score: 40,
        sourceUrl: post.url,
        sourceTitle: post.title,
        sourceSnippet: post.snippet || undefined,
        sourceCoverImageUrl: post.coverImageUrl,
        sourceImageUrls: post.imageUrls ?? (post.coverImageUrl ? [post.coverImageUrl] : undefined),
        sourceVideoUrl: post.videoUrl,
        sourceAuthor: post.author,
        sourceLikes: post.likes,
        sourceCollects: post.collects,
        sourceComments: post.comments,
      }),
    );
  }

  const allDisplay = [...enrichedCandidates, ...liteAngles];
  return {
    ...plan,
    candidates: allDisplay,
    topPicks: allDisplay.slice(0, RESEARCH_ANGLES_PER_PAGE),
  };
}

export function sortedDisplayAngles(plan: ContentResearchPlan): ContentAngleCandidate[] {
  return [...plan.candidates].sort((a, b) => b.score - a.score);
}

/** Prefer angles whose reference post has a loadable cover URL. */
export function displayResearchAngles(
  plan: ContentResearchPlan,
  options?: { videoOnly?: boolean },
): {
  angles: ContentAngleCandidate[];
  hiddenWithoutCover: number;
} {
  const all = sortedDisplayAngles(plan);
  if (options?.videoOnly) {
    const videoReady = all.filter((a) => angleCanSupplyReferenceMp4(a, plan.platform));
    if (videoReady.length > 0) {
      return { angles: videoReady, hiddenWithoutCover: all.length - videoReady.length };
    }
  }
  const withCover = all.filter(angleHasReferenceCover);
  if (withCover.length > 0) {
    return { angles: withCover, hiddenWithoutCover: all.length - withCover.length };
  }
  return { angles: all, hiddenWithoutCover: 0 };
}
