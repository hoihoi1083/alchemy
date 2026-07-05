import { fal } from "@fal-ai/client";
import { parseLlmJsonObject } from "@/lib/parse-llm-json";
import type {
  ProductVideoKitSlot,
  ProductVideoVisionProfile,
} from "@/lib/product-video-types";

const VISION_ENDPOINT = "fal-ai/any-llm/vision";
const VISION_MODEL = "google/gemini-2.5-flash-lite";

const SLOT_LABELS: Record<ProductVideoKitSlot, string> = {
  hero: "Hero product (main item for the ad)",
  packaging: "Packaging / retail box",
  extra1: "Extra angle or detail shot",
  extra2: "Second extra angle or context shot",
};

function buildVisionPrompt(
  slots: Array<{ slot: ProductVideoKitSlot; index: number }>,
  productName: string,
): string {
  const imageLines = slots
    .map((s) => `IMAGE ${s.index} (${SLOT_LABELS[s.slot]})`)
    .join("\n");

  return [
    "Analyze these product marketing photos for a short Seedance reference-to-video Reel.",
    "Return ONE JSON object only — no markdown fences.",
    "",
    "Required JSON shape:",
    '{"productSummary":"","category":"","materials":[],"colors":[],"situation":"","imageRoles":[{"imageIndex":1,"slot":"hero","role":"","visualDescription":""}]}',
    "",
    "Rules:",
    "- productSummary: one English sentence describing what is being sold",
    "- category: e.g. personal-care device, jewelry, food, skincare, electronics",
    "- materials: visible materials/finishes (plastic, glass, metal…)",
    "- colors: dominant colors",
    "- situation: best realistic setting/mood for a 9:16 social ad (lighting, room, time of day)",
    "- imageRoles: one entry per image below, imageIndex 1…N in order",
    "- slot must be exactly: hero | packaging | extra1 | extra2",
    "- role: short English label for Seedance (@ImageK role)",
    "- visualDescription: concrete details visible in that photo",
    "- Do NOT invent text, prices, or brand names not visible in photos",
    "",
    productName ? `User product name hint: ${productName}` : "",
    "",
    "Images in order:",
    imageLines,
  ]
    .filter(Boolean)
    .join("\n");
}

function extractVisionText(data: unknown): string {
  if (!data || typeof data !== "object") return "";
  const d = data as Record<string, unknown>;
  if (typeof d.output === "string") return d.output.trim();
  if (typeof d.text === "string") return d.text.trim();
  if (typeof d.response === "string") return d.response.trim();
  const choices = d.choices as Array<{ message?: { content?: string } }> | undefined;
  const content = choices?.[0]?.message?.content;
  if (typeof content === "string") return content.trim();
  return "";
}

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

  const indexed = input.slots.map((slot, i) => ({
    slot,
    index: i + 1,
  }));

  const result = await fal.subscribe(VISION_ENDPOINT, {
    input: {
      model: VISION_MODEL,
      prompt: buildVisionPrompt(indexed, input.productName?.trim() || ""),
      image_urls: input.imageUrls,
      system_prompt:
        "You are a product marketing visual analyst. Output valid JSON only. Adapt to the actual product category in the photos.",
    },
    logs: false,
  });

  const raw = extractVisionText(result.data);
  if (!raw) {
    throw new Error("Vision model returned an empty analysis.");
  }

  const parsed = parseLlmJsonObject<Partial<ProductVideoVisionProfile>>(
    raw,
    "Product vision analysis",
  );

  const imageRoles = (Array.isArray(parsed.imageRoles) ? parsed.imageRoles : [])
    .slice(0, input.imageUrls.length)
    .map((r, i) => ({
      imageIndex: i + 1,
      slot: input.slots[i] ?? "hero",
      role: String(r?.role ?? SLOT_LABELS[input.slots[i] ?? "hero"]).trim(),
      visualDescription: String(r?.visualDescription ?? "").trim(),
    }));

  for (let i = 0; i < input.imageUrls.length; i++) {
    if (!imageRoles[i]) {
      imageRoles.push({
        imageIndex: i + 1,
        slot: input.slots[i] ?? "hero",
        role: SLOT_LABELS[input.slots[i] ?? "hero"],
        visualDescription: "",
      });
    } else {
      imageRoles[i].imageIndex = i + 1;
      imageRoles[i].slot = input.slots[i] ?? imageRoles[i].slot;
    }
  }

  return {
    productSummary:
      String(parsed.productSummary ?? "").trim() || "Product marketing reel",
    category: String(parsed.category ?? "").trim() || "consumer product",
    materials: Array.isArray(parsed.materials)
      ? parsed.materials.map((m) => String(m).trim()).filter(Boolean).slice(0, 8)
      : [],
    colors: Array.isArray(parsed.colors)
      ? parsed.colors.map((c) => String(c).trim()).filter(Boolean).slice(0, 6)
      : [],
    situation: String(parsed.situation ?? "").trim() || "Clean commercial setting",
    imageRoles,
  };
}
