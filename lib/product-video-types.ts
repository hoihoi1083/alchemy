/** Labeled slots in the product video kit (maps to Seedance @Image1…@ImageN). */
export type ProductVideoKitSlot = "hero" | "packaging" | "extra1" | "extra2";

export const PRODUCT_VIDEO_KIT_SLOTS: ProductVideoKitSlot[] = [
  "hero",
  "packaging",
  "extra1",
  "extra2",
];

export type ProductVideoImageRole = {
  /** 1-based — Seedance @ImageN */
  imageIndex: number;
  slot: ProductVideoKitSlot;
  role: string;
  visualDescription: string;
};

export type ProductVideoPlan = {
  productSummary: string;
  category: string;
  materials: string[];
  colors: string[];
  situation: string;
  imageRoles: ProductVideoImageRole[];
  seedancePrompt: string;
  motionSummaryZh: string;
  productionNotes: string;
};

export type ProductVideoVisionProfile = {
  productSummary: string;
  category: string;
  materials: string[];
  colors: string[];
  situation: string;
  imageRoles: Array<{
    imageIndex: number;
    slot: ProductVideoKitSlot;
    role: string;
    visualDescription: string;
  }>;
};
