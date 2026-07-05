import type { PromptMarket } from "../../lib/prompt-variables";
import type { PromotionMode } from "../../lib/promotion-mode";
import type { ContentPlatform } from "../../lib/content-research-types";
import type { ContentResearchMediaFilter } from "../../lib/content-research-types";

export type TopicScenario = {
  id: string;
  search: string;
  product: string;
  promotionMode: PromotionMode;
  market: PromptMarket;
  /** Reference post topic that must NOT appear in apply output */
  referenceTopic: string;
  platform?: ContentPlatform;
  mediaFilter?: ContentResearchMediaFilter;
};

/** Broad topic range — physical goods, services, EN/CN, varied categories. */
export const TOPIC_SCENARIOS: TopicScenario[] = [
  {
    id: "crystal-bracelet-hk",
    search: "水晶手串",
    product: "马达加斯加粉水晶手链",
    promotionMode: "physical",
    market: "hk",
    referenceTopic: "水瓶座",
    platform: "xiaohongshu",
    mediaFilter: "image",
  },
  {
    id: "nasal-washer-hk",
    search: "洗鼻器",
    product: "儿童脉冲洗鼻壶",
    promotionMode: "physical",
    market: "hk",
    referenceTopic: "鼻炎",
    platform: "xiaohongshu",
    mediaFilter: "image",
  },
  {
    id: "skincare-hk",
    search: "护肤精华",
    product: "烟酰胺精华液30ml",
    promotionMode: "physical",
    market: "hk",
    referenceTopic: "早C晚A",
    platform: "xiaohongshu",
    mediaFilter: "image",
  },
  {
    id: "sneakers-hk",
    search: "跑鞋推荐",
    product: "缓震慢跑鞋Pro",
    promotionMode: "physical",
    market: "hk",
    referenceTopic: "马拉松",
    platform: "instagram",
    mediaFilter: "image",
  },
  {
    id: "snack-gift-hk",
    search: "年货零食礼盒",
    product: "坚果大礼包500g",
    promotionMode: "physical",
    market: "hk",
    referenceTopic: "春节送礼",
    platform: "facebook",
    mediaFilter: "image",
  },
  {
    id: "jewelry-model-hk",
    search: "手链穿搭",
    product: "18K玫瑰金手链",
    promotionMode: "physical",
    market: "hk",
    referenceTopic: "OOTD",
    platform: "instagram",
    mediaFilter: "image",
  },
  {
    id: "yoga-concept-hk",
    search: "瑜伽课程",
    product: "晨间流瑜伽10次卡",
    promotionMode: "concept",
    market: "hk",
    referenceTopic: "减脂",
    platform: "xiaohongshu",
    mediaFilter: "image",
  },
  {
    id: "saas-concept-hk",
    search: "项目管理工具",
    product: "TeamFlow Pro 试用",
    promotionMode: "concept",
    market: "hk",
    referenceTopic: "远程办公",
    platform: "instagram",
    mediaFilter: "image",
  },
  {
    id: "fortune-concept-hk",
    search: "塔罗占卜",
    product: "线上塔罗解读服务",
    promotionMode: "concept",
    market: "hk",
    referenceTopic: "水逆",
    platform: "xiaohongshu",
    mediaFilter: "image",
  },
  {
    id: "restaurant-concept-cn",
    search: "火锅店营销",
    product: "川味火锅双人套餐",
    promotionMode: "concept",
    market: "cn",
    referenceTopic: "排队",
    platform: "xiaohongshu",
    mediaFilter: "image",
  },
  {
    id: "serum-en",
    search: "vitamin c serum",
    product: "Brightening VC Serum 30ml",
    promotionMode: "physical",
    market: "en",
    referenceTopic: "retinol",
    platform: "instagram",
    mediaFilter: "image",
  },
  {
    id: "coaching-en",
    search: "life coaching",
    product: "90-Day Clarity Program",
    promotionMode: "concept",
    market: "en",
    referenceTopic: "mindset",
    platform: "instagram",
    mediaFilter: "image",
  },
  {
    id: "crystal-reel-hk",
    search: "水晶手串",
    product: "马达加斯加粉水晶手链",
    promotionMode: "physical",
    market: "hk",
    referenceTopic: "星座",
    platform: "tiktok",
    mediaFilter: "video",
  },
  {
    id: "skincare-reel-hk",
    search: "护肤流程",
    product: "烟酰胺精华液30ml",
    promotionMode: "physical",
    market: "hk",
    referenceTopic: "刷酸",
    platform: "tiktok",
    mediaFilter: "video",
  },
];
