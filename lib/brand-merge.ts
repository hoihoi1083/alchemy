import type { BrandKit } from "@/lib/brand-kit";
import { DEFAULT_BRAND_KIT } from "@/lib/brand-kit";
import type { BrandProfile } from "@/lib/brand-profile";
import { newImageCanvasTextLayer, type ImageCanvasLayer } from "@/lib/image-canvas-layers";

export function extractHexColors(text: string): string[] {
  const matches = text.match(/#[0-9a-fA-F]{3,8}/g);
  return matches ?? [];
}

export function brandKitHasPromptContent(kit: BrandKit | null | undefined): boolean {
  if (!kit) return false;
  return Boolean(
    kit.tagline.trim() ||
      kit.logoUrl ||
      kit.primaryColor !== DEFAULT_BRAND_KIT.primaryColor ||
      kit.secondaryColor !== DEFAULT_BRAND_KIT.secondaryColor ||
      kit.accentColor !== DEFAULT_BRAND_KIT.accentColor,
  );
}

export function mergeBrandProfileIntoKit(profile: BrandProfile, kit: BrandKit): BrandKit {
  const hex = extractHexColors(profile.colorPalette);
  const next: BrandKit = { ...kit };
  if (hex[0]) next.primaryColor = hex[0];
  if (hex[1]) next.secondaryColor = hex[1];
  if (hex[2]) next.accentColor = hex[2];
  if (profile.suggestedHeadline.trim() && !next.tagline.trim()) {
    next.tagline = profile.suggestedHeadline.trim();
  }
  return { ...next, updatedAt: new Date().toISOString() };
}

export function effectiveBrandHeadline(
  headline: string,
  kit: BrandKit,
  profile?: BrandProfile | null,
): string {
  return headline.trim() || kit.tagline.trim() || profile?.suggestedHeadline?.trim() || "";
}

export function brandKitPromptBlock(kit: BrandKit): string {
  const fontLabel =
    kit.fontPreset === "pingfang"
      ? "PingFang / Chinese-friendly sans"
      : kit.fontPreset === "inter"
        ? "Inter / modern international sans"
        : "Noto Sans / clean multilingual sans";
  return [
    kit.tagline.trim() ? `Brand tagline for typography tone: "${kit.tagline.trim()}".` : "",
    `Brand palette — primary ${kit.primaryColor}, secondary ${kit.secondaryColor}, accent ${kit.accentColor}. Use for backgrounds, highlights, and on-image text color harmony.`,
    `Typography mood: ${fontLabel}.`,
    kit.logoUrl
      ? "Client brand logo is provided as a separate attached image — composite ONLY that logo. Never copy any logo, wordmark, or company name visible in the style reference."
      : "No client logo attached — output must have no company logo or wordmark. Do not copy branding from the reference post and do not invent a fake brand mark.",
  ]
    .filter(Boolean)
    .join(" ");
}

/** When brand logo is attached as the last image in image_urls. */
export function brandKitLogoImagePromptBlock(logoImageIndex: number): string {
  return [
    `BRAND LOGO — IMAGE ${logoImageIndex} is the client's official brand logo (use exactly as provided).`,
    "Place it cleanly in the top-right or bottom-right corner at a modest size — do not cover the headline or hero.",
    "The style reference post belongs to another company — NEVER copy its logo, wordmark, store name, app icon, @handle, sponsor badge, or watermark.",
    "Only IMAGE " + logoImageIndex + " may appear as branded identity on the output.",
  ].join(" ");
}

/**
 * Reference posts come from real businesses — never bleed their identity into the output.
 * Principle-based guard (not a fixed denylist of famous apps).
 */
export function thirdPartyBrandGuardBlock(): string {
  return [
    "REFERENCE IDENTITY BOUNDARY — IMAGE 1 is a real post from another company or creator.",
    "Never copy ANY of their branded identity into the output: logos, wordmarks, store/company names, product packaging brands, app icons, @handles, sponsor tags, QR codes, or watermarks visible in IMAGE 1.",
    "The reference publisher is unknown — treat every on-image brand element in IMAGE 1 as forbidden, not just famous platforms.",
    "Only the user's campaign copy and (when provided) their brand kit / brand profile may appear as branded identity.",
    "If no client logo is attached, leave the output free of company logos — borrow palette, typography mood, and layout rhythm only.",
  ].join(" ");
}

export function brandKitFontFamily(preset: BrandKit["fontPreset"]): string {
  if (preset === "pingfang") return "PingFang HK, Noto Sans TC, sans-serif";
  if (preset === "inter") return "Inter, sans-serif";
  return "Noto Sans TC, Noto Sans, sans-serif";
}

export function seedBrandCanvasLayers(input: {
  headline: string;
  subline: string;
  brandKit: BrandKit;
  brandProfile?: BrandProfile | null;
}): ImageCanvasLayer[] {
  const h = effectiveBrandHeadline(input.headline, input.brandKit, input.brandProfile);
  const s = input.subline.trim();
  const fill = input.brandKit.primaryColor;
  const stroke = input.brandKit.secondaryColor;
  const fontFamily = brandKitFontFamily(input.brandKit.fontPreset);
  const layers: ImageCanvasLayer[] = [];
  if (h) {
    layers.push(
      newImageCanvasTextLayer({
        text: h,
        yPct: 16,
        stylePreset: "xhs-bold",
        fill,
        stroke,
        fontFamily,
      }),
    );
  }
  if (s) {
    layers.push(
      newImageCanvasTextLayer({
        text: s,
        yPct: h ? 28 : 18,
        stylePreset: "classic",
        fill,
        stroke,
        fontFamily,
      }),
    );
  }
  if (!layers.length) {
    layers.push(
      newImageCanvasTextLayer({
        text: h || input.brandKit.tagline.trim() || "Headline",
        yPct: 18,
        stylePreset: "xhs-bold",
        fill,
        stroke,
        fontFamily,
      }),
    );
  }
  return layers;
}
