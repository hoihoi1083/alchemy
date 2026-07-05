import path from "path";

export const W = 1080;
export const H = 1350;

const M = path.join(process.env.HOME || "", "Desktop", "marketing");

function crystalPhoto(folder: string, file: string): string {
  return path.join(M, folder, "TC", file);
}

export const CRYSTAL_PHOTOS: Record<string, string> = {
  太陽石: crystalPhoto("太阳石手串_ad_material_20260507", "01_sunstone.png"),
  黃水晶: crystalPhoto("黄水晶白阿塞手串_ad_material_20260508", "01_yellow_white.png"),
  月光石: crystalPhoto("天然金发晶灰月光貔貅手链_ad_material_20260508", "03_detail_rutilated.png"),
  粉晶: crystalPhoto("马达加斯加粉水晶手链_ad_material_20260507", "01_madagascar_pink.png"),
  海藍寶: crystalPhoto("黑曜石海蓝宝手串_ad_material_20260508", "01_obsidian_aqua.png"),
  草莓晶: crystalPhoto("草莓晶手链_ad_material_20260507", "01_strawberry.png"),
  黑曜石: crystalPhoto("黑曜石手串_ad_material_20260507", "01_black_obsidian.png"),
  紫水晶: crystalPhoto("九紫离火天然紫水晶手串_ad_material_20260508", "01_nine_purple_fire.png"),
  拉長石: crystalPhoto("天然金发晶灰月光貔貅手链_ad_material_20260508", "03_detail_rutilated.png"),
  白水晶: crystalPhoto("Amanda Magic 天然白水晶手串_ad_material_20260507", "01_amanda.png"),
  虎眼石: crystalPhoto("太阳石手串_ad_material_20260507", "02_sunstone.png"),
  煙晶: crystalPhoto("药珀手串_ad_material_20260507", "01_amber.png"),
  綠螢石: crystalPhoto("海绿水晶玛瑙草莓晶手链_ad_material_20260507", "01_sea_green.png"),
  藍紋瑪瑙: crystalPhoto("双海蓝奇楠沉香手串_ad_material_20260508", "01_double_aqua.png"),
};

/** Illustration colors when no product photo. */
export const CRYSTAL_ART: Record<string, { fill: string; accent: string }> = {
  太陽石: { fill: "#E8A85C", accent: "#F5D4A0" },
  黃水晶: { fill: "#E5C04A", accent: "#FFF0B0" },
  月光石: { fill: "#D8DCE8", accent: "#F0F4FF" },
  粉晶: { fill: "#E8B4C4", accent: "#F8D8E4" },
  海藍寶: { fill: "#7EB8D4", accent: "#B8E4F4" },
  草莓晶: { fill: "#E898A8", accent: "#F8C8D4" },
  黑曜石: { fill: "#3A3A42", accent: "#6A6A72" },
  紫水晶: { fill: "#9B7EC8", accent: "#C8B0E8" },
  拉長石: { fill: "#6A7A9A", accent: "#A8B8D8" },
  白水晶: { fill: "#E8EEF4", accent: "#FFFFFF" },
  虎眼石: { fill: "#B8863A", accent: "#D4A85C" },
  煙晶: { fill: "#8A7A6E", accent: "#B8A898" },
  綠螢石: { fill: "#7AB88A", accent: "#A8D8B8" },
  藍紋瑪瑙: { fill: "#88B0D0", accent: "#C0D8EC" },
};

export type LifePathPerson = {
  num: number;
  color: string;
  traits: [string, string, string];
  crystals: [{ name: string; key: string }, { name: string; key: string }];
};

export const LIFE_PATH_PEOPLE: LifePathPerson[] = [
  {
    num: 1,
    color: "#C9A09A",
    traits: ["喜歡掌控主導權", "有自己的想法", "行動力強"],
    crystals: [
      { name: "太陽石", key: "太陽石" },
      { name: "黃水晶", key: "黃水晶" },
    ],
  },
  {
    num: 2,
    color: "#B8A89A",
    traits: ["感受力很強", "重感情", "很在意他人感受"],
    crystals: [
      { name: "月光石", key: "月光石" },
      { name: "粉晶", key: "粉晶" },
    ],
  },
  {
    num: 3,
    color: "#A89BB8",
    traits: ["喜歡分享", "創意豐富", "討厭無聊"],
    crystals: [
      { name: "海藍寶", key: "海藍寶" },
      { name: "藍紋瑪瑙", key: "藍紋瑪瑙" },
    ],
  },
  {
    num: 4,
    color: "#8B7B6E",
    traits: ["做事有規劃", "喜歡穩定", "責任感重"],
    crystals: [
      { name: "黑曜石", key: "黑曜石" },
      { name: "煙晶", key: "煙晶" },
    ],
  },
  {
    num: 5,
    color: "#8FA68E",
    traits: ["熱愛自由", "喜歡新鮮感", "不喜歡被束縛"],
    crystals: [
      { name: "綠螢石", key: "綠螢石" },
      { name: "拉長石", key: "拉長石" },
    ],
  },
  {
    num: 6,
    color: "#C49A8F",
    traits: ["喜歡照顧別人", "有責任感", "容易替別人操心"],
    crystals: [
      { name: "草莓晶", key: "草莓晶" },
      { name: "粉晶", key: "粉晶" },
    ],
  },
  {
    num: 7,
    color: "#9B8FA8",
    traits: ["喜歡獨處", "愛思考", "對神秘學有興趣"],
    crystals: [
      { name: "紫水晶", key: "紫水晶" },
      { name: "拉長石", key: "拉長石" },
    ],
  },
  {
    num: 8,
    color: "#7A6A5E",
    traits: ["企圖心強", "重視成就感", "喜歡挑戰目標"],
    crystals: [
      { name: "虎眼石", key: "虎眼石" },
      { name: "黃水晶", key: "黃水晶" },
    ],
  },
  {
    num: 9,
    color: "#7A8A96",
    traits: ["同理心強", "容易心軟", "喜歡幫助別人"],
    crystals: [
      { name: "白水晶", key: "白水晶" },
      { name: "月光石", key: "月光石" },
    ],
  },
];

export const COVER = {
  line1: "你的生日",
  line2: "其實藏著你的",
  line3: "天生人格",
  cta: "30秒算出你的生命靈數",
  sub: "看看你是幾號人",
  comment: "留言你的數字，我告訴你適合什麼水晶 ♡",
};

export const HOWTO = {
  title: "生命靈數怎麼算？",
  example: "以 1995/11/22 為例",
  digits: "1 + 9 + 9 + 5 + 1 + 1 + 2 + 2",
  sum: "3 0",
  reduce: "3 + 0",
  result: "3",
  resultLabel: "生命靈數 3 號人",
  note: "（ 算到剩 1 ~ 9 即可 ）",
};

export const ENGAGE = {
  title: "你是幾號人呢？",
  highlight: "我是 3 號人 🙋‍♀️",
  reaction1: "看到「討厭無聊」",
  reaction2: "真的直接笑出來 🤣",
  cta: "留言告訴我 👇",
  q1: "你是幾號人？",
  q2: "哪一點最準？",
  footer: "我想看看來留言的大家",
  footer2: "最多的是哪一種靈魂 ✨",
};

/** Layout grid for number-group slides (3 rows). */
export const GROUP_LAYOUT = {
  titleY: 100,
  subPillY: 138,
  subTextY: 170,
  cardX: 36,
  cardW: 1008,
  cardH: 318,
  cardGap: 24,
  firstCardY: 200,
  numCx: 108,
  numR: 46,
  traitX: 188,
  traitY1: 108,
  traitLine: 40,
  crystalTitleY: 58,
  crystalSize: 88,
  crystalBox: 96,
  crystal1Cx: 720,
  crystal2Cx: 908,
  crystalImgY: 88,
  crystalLabelY: 196,
  dividerX: 598,
};
