import type {
  ContentAngleCandidate,
  ContentResearchPlan,
} from "../../lib/content-research-types";

/** User searches category 水晶手串 but promotes a specific SKU. */
export const SEARCH_TOPIC = "水晶手串";
export const PROMOTE_PRODUCT = "马达加斯加粉水晶手链";

export const zodiacCarouselAngle: ContentAngleCandidate = {
  id: "post-6a37ce650000000021023ac6",
  title: "星座水晶攻略",
  hook: "💙水瓶座一生最旺的颜色",
  scriptOutline:
    "Slide1: 水瓶座性格特質；Slide2: 最旺顏色與對應水晶；Slide3: 推薦手串搭配",
  format: "teaching-carousel",
  formatLabel: "Teaching carousel",
  whyItWorks: "星座話題自帶流量，互動率高",
  bulletPoints: ["水瓶座性格", "最旺顏色", "手串搭配"],
  cta: "留言你的星座",
  score: 92,
  sourceUrl: "https://www.xiaohongshu.com/explore/6a37ce650000000021023ac6",
  sourceTitle: "💙水瓶座一生最旺的颜色",
  sourceImageUrls: Array.from({ length: 8 }, (_, i) => `https://example.com/slide-${i + 1}.jpg`),
  sourceLikes: 6000,
};

export const reelAngle: ContentAngleCandidate = {
  id: "post-reel-1",
  title: "水晶短片",
  hook: "這條手串太絕了",
  scriptOutline: "開場hook → 上手展示 → CTA",
  format: "reel",
  formatLabel: "Reel",
  whyItWorks: "短視頻完播高",
  bulletPoints: [],
  cta: "點連結購買",
  score: 88,
  sourceUrl: "https://www.tiktok.com/@x/video/1",
  sourceTitle: "水晶上手",
  sourceVideoUrl: "https://example.com/ref.mp4",
};

export const xhsPlan: ContentResearchPlan = {
  platform: "xiaohongshu",
  platformLabel: "小紅書",
  topic: SEARCH_TOPIC,
  summary: "水晶手串類熱門帖",
  researchMode: "live-web",
  searchProvider: "justoneapi",
  candidates: [zodiacCarouselAngle],
  topPicks: [zodiacCarouselAngle],
};
