import { attachSourcePostsToPlan } from "@/lib/content-research-enrich";
import { applyMediaFilterToPlan } from "@/lib/content-research-plan";
import { fetchResearchPostByUrl } from "@/lib/fetch-research-post-by-url";
import {
  formatLabelForAngleFormat,
  inferFormatFromPost,
} from "@/lib/content-research-infer";
import type {
  ContentAngleCandidate,
  ContentPlatform,
  ContentResearchMediaFilter,
  ContentResearchPlan,
  ContentResearchPost,
} from "@/lib/content-research-types";
import { detectPlatformFromPostUrl, normalizePostUrlInput } from "@/lib/content-research-post-url";
import { promoteProductName } from "@/lib/content-research-promote";
import type { PromptMarket } from "@/lib/prompt-variables";

const PLATFORM_LABELS: Record<ContentPlatform, string> = {
  xiaohongshu: "小紅書 (Xiaohongshu)",
  instagram: "Instagram",
  tiktok: "TikTok",
  facebook: "Facebook",
};

function pinnedAngleFromPost(
  post: ContentResearchPost,
  topic: string,
  product?: string,
): ContentAngleCandidate {
  const format = inferFormatFromPost(post);
  const imageCount = post.imageUrls?.length ?? (post.coverImageUrl ? 1 : 0);
  const productLabel = promoteProductName(product, topic);

  return {
    id: `pinned-${post.id}`,
    title: post.title,
    hook: post.snippet.slice(0, 120) || post.title,
    scriptOutline: post.snippet,
    format,
    formatLabel: formatLabelForAngleFormat(format, imageCount),
    whyItWorks: `Your pinned reference — borrow slide layout, pacing, and hook structure for ${productLabel}. Do not copy the reference topic verbatim.`,
    bulletPoints: [],
    cta: "",
    score: 100,
    sourceUrl: post.url,
    sourceTitle: post.title,
    sourceCoverImageUrl: post.coverImageUrl,
    sourceImageUrls: post.imageUrls ?? (post.coverImageUrl ? [post.coverImageUrl] : undefined),
    sourceVideoUrl: post.videoUrl,
    sourceAuthor: post.author,
    sourceLikes: post.likes,
    sourceCollects: post.collects,
    sourceComments: post.comments,
  };
}

export async function planContentResearchFromDirectPost(input: {
  postUrl: string;
  topic?: string;
  product?: string;
  market?: PromptMarket;
  promotionMode?: "physical" | "concept";
  mediaFilter?: ContentResearchMediaFilter;
}): Promise<ContentResearchPlan> {
  const postUrl = normalizePostUrlInput(input.postUrl);
  if (!postUrl) throw new Error("Paste a post link first.");

  const post = await fetchResearchPostByUrl(postUrl, { mediaFilter: input.mediaFilter });
  const topic = input.topic?.trim() || input.product?.trim() || "";

  const pinned = pinnedAngleFromPost(post, topic, input.product);
  const basePlan: ContentResearchPlan = {
    platform: post.platform,
    platformLabel: PLATFORM_LABELS[post.platform],
    topic,
    summary: `Pinned reference post: ${post.title}`,
    researchMode: "live-web",
    searchProvider: "justoneapi",
    posts: [post],
    mediaFilter: input.mediaFilter,
    candidates: [pinned],
    topPicks: [pinned],
  };

  const enriched = attachSourcePostsToPlan(basePlan);
  const platformFromUrl = detectPlatformFromPostUrl(postUrl);
  if (platformFromUrl && platformFromUrl !== post.platform) {
    enriched.researchWarning = `Link host suggests ${platformFromUrl}; loaded as ${post.platform}.`;
  }

  return applyMediaFilterToPlan(enriched, input.mediaFilter);
}
