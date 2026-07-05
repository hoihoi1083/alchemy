import type { SubjectFraming } from "@/lib/prompt-variables";

export type ProductSceneCategory =
  | "wearable"
  | "personal-care-device"
  | "footwear"
  | "beauty"
  | "generic";

/** Lightweight keyword guess from product name — for second-frame / scene hints only. */
export function inferProductSceneCategory(product: string): ProductSceneCategory {
  const p = product.toLowerCase();
  if (/鞋|boot|sneaker|shoe|sock|襪/.test(p)) return "footwear";
  if (/洗鼻|沖鼻|nasal|rinse|washer|淨鼻|鼻/.test(p)) return "personal-care-device";
  if (
    /手鏈|手串|bracelet|ring|戒|necklace|項鏈|耳環|earring|watch|手錶|jewelry|珠|水晶/.test(
      p,
    )
  ) {
    return "wearable";
  }
  if (/護膚|skincare|cream|serum|面膜|化妝|beauty|lipstick/.test(p)) return "beauty";
  return "generic";
}

/** Second Nano Banana frame — category-appropriate, not always “hand on wrist”. */
export function buildSecondFrameSceneHint(
  product: string,
  framing: SubjectFraming = "auto",
): string {
  if (framing === "no-people" || framing === "product-only") {
    return "Product-only still life: new angle (macro detail or 3/4 hero on clean surface), different lighting accent, no people or hands.";
  }

  const category = inferProductSceneCategory(product);

  if (framing === "hands-only") {
    if (category === "personal-care-device") {
      return "Hands demonstrating the device near the nose or over a bathroom sink — instructional use shot, no face, clean bright bathroom lighting.";
    }
    if (category === "wearable") {
      return "Elegant hands wearing or adjusting the item on wrist — no face, natural skin texture, realistic jewelry ad.";
    }
    if (category === "beauty") {
      return "Hands holding or applying the product near vanity — no face, soft natural light.";
    }
    return "Hands interacting naturally with the product in a category-appropriate way — no face.";
  }

  if (framing === "legs-feet" || category === "footwear") {
    return "Lower legs and feet wearing or next to the product — cropped above knee, no face, lifestyle floor shot.";
  }

  if (framing === "torso-no-face") {
    return "Torso and arms in lifestyle context with the product — face completely out of frame, photorealistic.";
  }

  switch (category) {
    case "wearable":
      return "Alternative hero: worn on wrist with natural hand (no face), OR macro bead/material close-up — pick one that differs clearly from IMAGE 1.";
    case "personal-care-device":
      return "Alternative hero: product on clean bathroom counter with soft daylight, OR hands demonstrating use at sink — no face, instructional lifestyle, NOT worn on body.";
    case "beauty":
      return "Alternative hero: product on vanity shelf with soft window light, OR hands applying product — no face.";
    default:
      return "Alternative hero: dramatic macro product detail OR product in a realistic lifestyle setting matching the category — no invented unrelated props.";
  }
}

/** Lifestyle model shot — product worn or used in a photorealistic ad (image step). */
export function buildModelWearPresentationHint(
  product: string,
  framing: SubjectFraming = "auto",
): string {
  const category = inferProductSceneCategory(product);

  if (framing === "no-people" || framing === "product-only") {
    return "Product-only premium still life — no people. Dramatic macro or pedestal hero, photorealistic commercial photography.";
  }

  if (framing === "hands-only") {
    if (category === "wearable") {
      return "Elegant natural hand and wrist wearing the exact product from IMAGE 1 — cropped at forearm, no face, realistic skin texture, premium jewelry/lifestyle ad lighting.";
    }
    if (category === "personal-care-device") {
      return "Hands demonstrating the device in a clean bathroom — instructional lifestyle, no face, photorealistic.";
    }
    return "Hands interacting naturally with the product — no face, photorealistic lifestyle ad.";
  }

  if (framing === "legs-feet" || category === "footwear") {
    return "Lower body lifestyle shot — feet/legs wearing or next to the product, cropped above knee, no face, natural floor or street context, photorealistic.";
  }

  if (framing === "torso-no-face") {
    return "Torso and arms in premium lifestyle setting — product clearly visible on body or in hands, face completely out of frame, photorealistic fashion-ad look.";
  }

  switch (category) {
    case "wearable":
      return joinModelWearLines(
        "Photorealistic lifestyle model wearing the EXACT product from IMAGE 1 (same beads, charm, materials) on wrist or body as appropriate.",
        "Medium close-up or 3/4 portrait in a premium interior — dark moody or warm window light, shallow depth of field.",
        "Natural skin texture, realistic pores, no plastic AI skin. Face visible with calm confident expression unless brief says otherwise.",
        "Pose showcases the product clearly — hand near chin, arm on chair, or steering-wheel lifestyle ONLY if it fits the product category.",
      );
    case "personal-care-device":
      return joinModelWearLines(
        "Photorealistic person demonstrating the EXACT product from IMAGE 1 in a clean modern bathroom or home setting.",
        "Instructional lifestyle ad — natural light, believable use pose, not worn like jewelry.",
        "Face may show partial profile or be cropped — focus on product + hands.",
      );
    case "beauty":
      return joinModelWearLines(
        "Photorealistic model in a soft vanity or skincare lifestyle scene with the EXACT product from IMAGE 1 visible in hand or on skin.",
        "Editorial beauty ad lighting, natural skin, premium but realistic.",
      );
    default:
      return joinModelWearLines(
        `Photorealistic lifestyle model naturally holding or using the EXACT ${product || "product"} from IMAGE 1.`,
        "Believable interior or lifestyle context matching the product category — not generic jewelry template unless product is jewelry.",
        "Editorial commercial photography, natural light, realistic human proportions.",
      );
  }
}

function joinModelWearLines(...lines: string[]): string {
  return lines.join(" ");
}
