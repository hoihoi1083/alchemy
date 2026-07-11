/** Curated HeyGen Avatar IV stock presenters (digital-twin). */
export type HeygenAvatarDef = {
  id: string;
  labelEn: string;
  labelZh: string;
  tags: string[];
};

export const HEYGEN_STOCK_AVATARS: HeygenAvatarDef[] = [
  { id: "Annie Office Sitting Front", labelEn: "Annie — office sitting", labelZh: "Annie — 辦公室坐姿", tags: ["female", "office", "professional"] },
  { id: "Annie Studio Pink Standing Front", labelEn: "Annie — studio standing", labelZh: "Annie — 演播室站立", tags: ["female", "studio", "friendly"] },
  { id: "Armando Casual Front", labelEn: "Armando — casual", labelZh: "Armando — 休閒", tags: ["male", "casual", "ugc"] },
  { id: "Armando Suit Front", labelEn: "Armando — suit", labelZh: "Armando — 西裝", tags: ["male", "business"] },
  { id: "August Casual Front", labelEn: "August — casual", labelZh: "August — 休閒", tags: ["male", "casual", "young"] },
  { id: "Bahar Business Sitting Front", labelEn: "Bahar — business sitting", labelZh: "Bahar — 商務坐姿", tags: ["female", "business"] },
  { id: "Bahar Casual Sitting Front", labelEn: "Bahar — casual sitting", labelZh: "Bahar — 休閒坐姿", tags: ["female", "casual", "ugc"] },
  { id: "Bojan Sport Front", labelEn: "Bojan — sport", labelZh: "Bojan — 運動", tags: ["male", "sport", "energetic"] },
  { id: "Florin Business Sitting Side", labelEn: "Florin — business side", labelZh: "Florin — 商務側坐", tags: ["male", "business"] },
  { id: "Florin Casual Sitting Front", labelEn: "Florin — casual", labelZh: "Florin — 休閒", tags: ["male", "casual", "ugc"] },
  { id: "Aubrey Sofa Front", labelEn: "Aubrey — sofa", labelZh: "Aubrey — 沙發", tags: ["female", "home", "ugc"] },
  { id: "Artur Office Front", labelEn: "Artur — office", labelZh: "Artur — 辦公室", tags: ["male", "office"] },
];

export function findHeygenAvatar(id: string): HeygenAvatarDef | undefined {
  return HEYGEN_STOCK_AVATARS.find((a) => a.id === id);
}

export const HEYGEN_DIGITAL_TWIN_ENDPOINT = "fal-ai/heygen/avatar4/digital-twin";
