/**
 * Curated landing samples for the “Get sample pack” lead magnet.
 * Displayed with an on-page Alchemy watermark (not burned into files).
 */
export type SamplePackItem = {
  id: string;
  src: string;
  /** Short English label for alt text; UI localizes via i18n keys when present. */
  labelKey:
    | "skincare"
    | "jewelry"
    | "fashion"
    | "food"
    | "cafe"
    | "storyboard"
    | "ecommerce"
    | "carousel";
};

export const SAMPLE_PACK_ITEMS: readonly SamplePackItem[] = [
  {
    id: "skincare",
    src: "/images/landing/tpl-card-01-skincare.jpg",
    labelKey: "skincare",
  },
  {
    id: "jewelry",
    src: "/images/landing/tpl-biz-jewelry.jpg",
    labelKey: "jewelry",
  },
  {
    id: "fashion",
    src: "/images/landing/tpl-biz-fashion.jpg",
    labelKey: "fashion",
  },
  {
    id: "food",
    src: "/images/landing/tpl-v2-xhs-food.jpg",
    labelKey: "food",
  },
  {
    id: "cafe",
    src: "/images/landing/tpl-biz-cafe-1.jpg",
    labelKey: "cafe",
  },
  {
    id: "storyboard",
    src: "/images/landing/luxury-storyboard-demo-poster.jpg",
    labelKey: "storyboard",
  },
  {
    id: "ecommerce",
    src: "/images/landing/scenario-ecommerce.png",
    labelKey: "ecommerce",
  },
  {
    id: "carousel",
    src: "/images/landing/tpl-biz-alchemy-carousel-1.jpg",
    labelKey: "carousel",
  },
] as const;

export const SAMPLE_PACK_WATERMARK = "Created with Alchemy AI Lab";
