export type CompositorId = "paper-sticker";

export type PaperStickerInput = {
  headline: string;
  /** One bullet per line */
  bullets: string[];
  brand: string;
  signoff: string;
  productImage: Buffer;
};

export type RenderProgress = {
  frame: number;
  total: number;
};
