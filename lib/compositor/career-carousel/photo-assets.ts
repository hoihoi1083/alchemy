import path from "path";

const M = path.join(process.env.HOME || "", "Desktop", "marketing");

/** Real product photos from ~/Desktop/marketing — matched to career archetypes. */
export const PHOTO_ASSETS = {
  cover: path.join(
    M,
    "黄水晶白阿塞手串_ad_material_20260508",
    "TC",
    "01_yellow_white.png",
  ),
  intro: path.join(
    M,
    "天然金发晶灰月光貔貅手链_ad_material_20260508",
    "TC",
    "02_model_indoor.png",
  ),
  types: [
    {
      id: 1,
      label: "創造美感型",
      file: path.join(M, "草莓晶手链_ad_material_20260507", "TC", "01_strawberry.png"),
      product: "草莓晶手链",
      position: "attention" as const,
    },
    {
      id: 2,
      label: "業績顯化型",
      file: path.join(M, "太阳石手串_ad_material_20260507", "TC", "01_sunstone.png"),
      product: "太阳石手串",
      position: "center" as const,
    },
    {
      id: 3,
      label: "領導決策型",
      file: path.join(
        M,
        "天然黑金超手链_ad_material_20260508",
        "TC",
        "01_black_gold_super.png",
      ),
      product: "天然黑金超手链",
      dark: true,
      position: "center" as const,
      /** Negative = shift visible photo right in frame (slide 05). */
      shiftX: -90,
    },
    {
      id: 4,
      label: "溝通協調型",
      file: path.join(
        M,
        "双海蓝奇楠沉香手串_ad_material_20260508",
        "TC",
        "01_double_aqua.png",
      ),
      product: "双海蓝奇楠沉香手串",
      position: "attention" as const,
    },
    {
      id: 5,
      label: "執行穩定型",
      file: path.join(M, "药珀手串_ad_material_20260507", "TC", "01_amber.png"),
      product: "药珀手串",
      dark: true,
      position: "center" as const,
    },
  ],
} as const;

export const PHOTO_ASSETS_README = `Career carousel photo mapping
Cover: 黄水晶白阿塞 — model, warm window light (like reference opener)
Intro: 金发晶灰月光 — indoor lifestyle, CTA slide
1 創造美感: 草莓晶手链 — pink lifestyle wrist
2 業績顯化: 太阳石手串 — peach silk flat-lay feel
3 領導決策: 天然黑金超 — dark elegant wrist
4 溝通協調: 双海蓝奇楠 — teal/blue communication tone
5 執行穩定: 药珀手串 — warm amber grounding
Corner seal (bottom.png): slides 01, 02, 04–07 — not 03 (built-in 風鈴).
`;
