/** AI-extracted brand DNA from website / social hints — drives ad generation. */
export type BrandProfile = {
  businessName: string;
  productCategory: string;
  visualMood: string;
  colorPalette: string;
  copyTone: string;
  layoutStyle: string;
  suggestedHeadline: string;
  suggestedBullets: string[];
  adPromptExtra: string;
  summary: string;
};

export function brandProfilePromptBlock(profile: BrandProfile): string {
  const bullets = profile.suggestedBullets.filter(Boolean).join(" · ");
  return [
    `Brand DNA (match this client's existing marketing style):`,
    `Business: ${profile.businessName}.`,
    `Category: ${profile.productCategory}.`,
    `Visual mood: ${profile.visualMood}.`,
    `Colors: ${profile.colorPalette}.`,
    `Copy tone: ${profile.copyTone}.`,
    `Layout style: ${profile.layoutStyle}.`,
    profile.adPromptExtra,
    bullets ? `Typical selling angles: ${bullets}.` : "",
    `Summary: ${profile.summary}`,
  ]
    .filter(Boolean)
    .join(" ");
}

export function emptyBrandProfile(): BrandProfile {
  return {
    businessName: "",
    productCategory: "",
    visualMood: "",
    colorPalette: "",
    copyTone: "",
    layoutStyle: "",
    suggestedHeadline: "",
    suggestedBullets: [],
    adPromptExtra: "",
    summary: "",
  };
}
