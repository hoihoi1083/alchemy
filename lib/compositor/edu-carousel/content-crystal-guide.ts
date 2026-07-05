export const W = 1080;
export const H = 1350;

export type EduSlide = {
  id: string;
  headline: string;
  subline?: string;
  bullets?: string[];
  badge?: string;
  footnote?: string;
};

export const CRYSTAL_BEGINNER_SLIDES: EduSlide[] = [
  {
    id: "01_cover",
    headline: "水晶小白第一次买手串",
    subline: "先看这 5 点",
    badge: "选购指南",
    footnote: "收藏慢慢看 · 少踩坑",
  },
  {
    id: "02_color",
    headline: "① 不要只看颜色",
    subline: "颜色漂亮 ≠ 一定适合你",
    bullets: [
      "同色水晶，等级差好远",
      "灯光下好看，上手未必衬肤色",
      "先问：我戴住舒唔舒服、日常易唔易配",
    ],
  },
  {
    id: "03_hype",
    headline: "② 不要只听「招财／桃花」",
    subline: "口号好听，唔代表啱你",
    bullets: [
      "每款水晶能量同寓意唔同",
      "跟风买热门，未必解决你真正想改善嘅状态",
      "先想清楚：你想支持咩方面？",
    ],
  },
  {
    id: "04_practical",
    headline: "③ 看材质、尺寸、佩戴感",
    subline: "舒服先系长期戴到嘅关键",
    bullets: [
      "材质：天然纹理、冰裂、棉絮要心里有数",
      "尺寸：珠径、手围、男女佩戴差别",
      "佩戴感：太重、太紧、勾衣服都系扣分位",
    ],
  },
  {
    id: "05_state",
    headline: "④ 看适不适合自己的状态",
    subline: "你而家嘅生活节奏，决定边款更贴",
    bullets: [
      "工作压力大 ≠ 一定要买最「旺」嗰款",
      "有时你需要嘅系稳定、柔和、日常陪伴",
      "问自己：我想戴住佢去做咩？",
    ],
  },
  {
    id: "06_harmoniq",
    headline: "⑤ Harmoniq 配对流程",
    subline: "唔系乱估，系有步骤咁配",
    bullets: [
      "Step 1 · 填写出生资料 & 你而家关注嘅状态",
      "Step 2 · Harmoniq 五行能量配对分析",
      "Step 3 · 推荐适合你的手串款式 & 佩戴建议",
    ],
    footnote: "DM「配对」了解 Harmoniq 流程",
  },
];
