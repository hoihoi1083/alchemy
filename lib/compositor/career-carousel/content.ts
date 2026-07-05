/** Copy from Chingyifuang career carousel — preserved for re-design renders. */

export type CareerTypeSlide = {
  id: number;
  title: string;
  emoji: string;
  industries: string;
  crystals: { name: string; benefit: string }[];
  suitable: string;
};

export const BRAND = "Chingyifuang";

export const COVER = {
  year: "2026",
  headline: "你的工作行業別\n適合哪一種水晶呢？",
  subEn: "Different careers.\nDifferent energy.",
  footerZh: "五大分類職業推薦水晶",
  footerEn: "Career Energy • Crystal • Guide",
};

export const INTRO = {
  kicker: "水晶職業分類推薦",
  lines: [
    "每一種工作，",
    "其實都對應著不同的能量頻率。",
    "找到適合自己的水晶，",
    "讓自己在長期消耗中，",
    "依然可以穩定、舒服地前進",
    "如果還想瞭解更多",
    "適合自己的水晶推薦，",
    "也歡迎私訊請我們幫你推薦唷！✨",
  ],
  ctaLine1: "留言『職業』",
  ctaLine2: "傳完整文章與水晶分類連結給你🤍",
};

export const CAREER_TYPES: CareerTypeSlide[] = [
  {
    id: 1,
    title: "創造美感型",
    emoji: "🎨",
    industries: "設計、美容、美甲、攝影、品牌、自媒體、社群",
    crystals: [
      { name: "月光石", benefit: "穩定情緒與靈感流動" },
      { name: "拉長石", benefit: "提升創造力與感知力" },
      { name: "草莓晶", benefit: "增加魅力與吸引力" },
      { name: "摩根石", benefit: "溫柔情緒療癒" },
      { name: "蛋白石", benefit: "激發藝術與創造能量" },
    ],
    suitable: "長時間輸出美感與創意的人",
  },
  {
    id: 2,
    title: "業績顯化型",
    emoji: "💰",
    industries: "業務、銷售、直播主、團購、自營品牌",
    crystals: [
      { name: "鈦晶", benefit: "強化財富與行動能量" },
      { name: "超七", benefit: "提升整體高頻顯化力" },
      { name: "黃水晶", benefit: "提升財運與自信" },
      { name: "虎眼石", benefit: "增加果斷與執行力" },
      { name: "金太陽", benefit: "強化太陽能量與氣場" },
    ],
    suitable: "需要長期輸出能量與業績的人",
  },
  {
    id: 3,
    title: "領導決策型",
    emoji: "👑",
    industries: "老闆、主管、創業者、管理職",
    crystals: [
      { name: "黑銀鈦", benefit: "穩定高位氣場" },
      { name: "白幽靈", benefit: "清晰的思緒與洞察力" },
      { name: "黑骨幹", benefit: "強化決策與核心力量" },
      { name: "彼得石", benefit: "提升洞察與行動力" },
      { name: "紅柱石", benefit: "穩定領導能量與執行力" },
    ],
    suitable: "需要長期承擔與帶領團隊的人",
  },
  {
    id: 4,
    title: "溝通協調型",
    emoji: "🤝",
    industries: "人資、客服、PM、教育、諮詢、助人工作者",
    crystals: [
      { name: "拉利瑪", benefit: "放下執著溝通順暢" },
      { name: "海藍寶", benefit: "溫柔溝通與情緒流動" },
      { name: "藍紋瑪瑙", benefit: "穩定情緒與安全感" },
      { name: "紫鋰輝", benefit: "療癒內耗與壓力" },
      { name: "天河石", benefit: "建立界線與內在平衡" },
    ],
    suitable: "長期照顧他人情緒的人",
  },
  {
    id: 5,
    title: "執行穩定型",
    emoji: "📋",
    industries: "行政、財務、營運、助理、細節執行工作",
    crystals: [
      { name: "茶晶", benefit: "穩定與 grounding" },
      { name: "彩月光", benefit: "舒緩焦慮與情緒波動" },
      { name: "黑尖晶", benefit: "提升保護與專注" },
      { name: "黑碧璽", benefit: "隔絕低頻與雜訊" },
      { name: "白幽靈", benefit: "整理思緒與能量" },
    ],
    suitable: "需要長時間維持穩定輸出的人",
  },
];
