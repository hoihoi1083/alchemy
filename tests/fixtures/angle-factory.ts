import type {
  ContentAngleCandidate,
  ContentAngleFormat,
  ContentPlatform,
} from "../../lib/content-research-types";

const REFERENCE_TOPICS = ["水瓶座", "星座運勢", "早C晚A", "OOTD穿搭"];

export function makeAngle(
  format: ContentAngleFormat,
  overrides: Partial<ContentAngleCandidate> = {},
): ContentAngleCandidate {
  const refTopic = REFERENCE_TOPICS[format.length % REFERENCE_TOPICS.length];
  const imageUrls =
    format === "teaching-carousel" || format === "campaign"
      ? Array.from({ length: format === "teaching-carousel" ? 6 : 3 }, (_, i) =>
          `https://cdn.example.com/${format}-${i}.jpg`,
        )
      : format === "single-image" || format === "model-wear"
        ? ["https://cdn.example.com/single.jpg"]
        : undefined;

  const base: ContentAngleCandidate = {
    id: `angle-${format}`,
    title: `${refTopic}攻略`,
    hook: `🔥${refTopic}必看`,
    scriptOutline: `Slide1: ${refTopic}介紹；Slide2: 產品賣點`,
    format,
    formatLabel: format,
    whyItWorks: "高互動格式",
    bulletPoints: [`${refTopic}重點1`, `${refTopic}重點2`],
    cta: "點連結了解",
    score: 85,
    sourceUrl: `https://www.xiaohongshu.com/explore/${format}-abc`,
    sourceTitle: `${refTopic}熱門帖`,
    sourceImageUrls: imageUrls,
    sourceCoverImageUrl: imageUrls?.[0],
    sourceVideoUrl: format === "reel" ? "https://cdn.example.com/ref.mp4" : undefined,
  };
  return { ...base, ...overrides };
}

export function makePlan(
  topic: string,
  platform: ContentPlatform,
  angles: ContentAngleCandidate[],
) {
  return {
    platform,
    platformLabel: platform,
    topic,
    summary: `Research for ${topic}`,
    researchMode: "live-web" as const,
    searchProvider: "justoneapi" as const,
    candidates: angles,
    topPicks: angles.slice(0, 3),
  };
}
