import { captionImageToVisionJson } from "@/lib/vision-json-repair";
import type {
  ProductVideoKitSlot,
  ProductVideoVisionProfile,
} from "@/lib/product-video-types";

const SLOT_LABELS: Record<ProductVideoKitSlot, string> = {
  hero: "Hero product (main item for the ad)",
  packaging: "Packaging / retail box",
  extra1: "Extra angle or detail shot",
  extra2: "Second extra angle or context shot",
};

type HeroVisionJson = {
  productSummary?: string;
  category?: string;
  materials?: unknown[];
  colors?: unknown[];
  situation?: string;
  role?: string;
  visualDescription?: string;
};

type SlotVisionJson = {
  role?: string;
  visualDescription?: string;
};

const HERO_SCHEMA =
  '{"productSummary":"","category":"","materials":[],"colors":[],"situation":"","role":"","visualDescription":""}';
const SLOT_SCHEMA = '{"role":"","visualDescription":""}';

/**
 * Product kit photos → vision profile.
 * Uses Florence-2 + DeepSeek (same path as concept/carousel refs) — not Bagel ($0.05/img).
 */
export async function analyzeProductImagesWithVision(input: {
  imageUrls: string[];
  slots: ProductVideoKitSlot[];
  productName?: string;
}): Promise<ProductVideoVisionProfile> {
  if (!input.imageUrls.length) {
    throw new Error("At least one product image is required.");
  }
  if (input.imageUrls.length !== input.slots.length) {
    throw new Error("Image count must match slot labels.");
  }

  const productName = input.productName?.trim() || "";

  const hero = await captionImageToVisionJson<HeroVisionJson>({
    imageUrl: input.imageUrls[0]!,
    schemaExample: HERO_SCHEMA,
    label: "Product hero vision",
    extraInstructions: [
      "This is the HERO product marketing photo for a short Seedance reference-to-video Reel.",
      "productSummary: one English sentence describing what is being sold",
      "category: e.g. personal-care device, jewelry, food, skincare, electronics",
      "materials: visible materials/finishes (array of short strings)",
      "colors: dominant colors (array of short strings)",
      "situation: best realistic setting/mood for a 9:16 social ad",
      "role: short English label for Seedance (@ImageK role)",
      "visualDescription: concrete details visible in this photo",
      "Do NOT invent text, prices, or brand names not visible",
      productName ? `User product name hint: ${productName}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
  });

  const restRoles = await Promise.all(
    input.imageUrls.slice(1).map(async (url, i) => {
      const slot = input.slots[i + 1] ?? "extra1";
      const parsed = await captionImageToVisionJson<SlotVisionJson>({
        imageUrl: url,
        schemaExample: SLOT_SCHEMA,
        label: `Product ${slot} vision`,
        extraInstructions: [
          `This is a product marketing photo (${SLOT_LABELS[slot]}).`,
          "role: short English label for Seedance (@ImageK role)",
          "visualDescription: concrete details visible in this photo",
          "Do NOT invent text, prices, or brand names not visible",
          productName ? `User product name hint: ${productName}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
      });
      return {
        imageIndex: i + 2,
        slot,
        role: String(parsed.role ?? SLOT_LABELS[slot]).trim(),
        visualDescription: String(parsed.visualDescription ?? "").trim(),
      };
    }),
  );

  const imageRoles = [
    {
      imageIndex: 1,
      slot: input.slots[0] ?? "hero",
      role: String(hero.role ?? SLOT_LABELS[input.slots[0] ?? "hero"]).trim(),
      visualDescription: String(hero.visualDescription ?? "").trim(),
    },
    ...restRoles,
  ];

  return {
    productSummary:
      String(hero.productSummary ?? "").trim() || "Product marketing reel",
    category: String(hero.category ?? "").trim() || "consumer product",
    materials: Array.isArray(hero.materials)
      ? hero.materials.map((m) => String(m).trim()).filter(Boolean).slice(0, 8)
      : [],
    colors: Array.isArray(hero.colors)
      ? hero.colors.map((c) => String(c).trim()).filter(Boolean).slice(0, 6)
      : [],
    situation: String(hero.situation ?? "").trim() || "Clean commercial setting",
    imageRoles,
  };
}
