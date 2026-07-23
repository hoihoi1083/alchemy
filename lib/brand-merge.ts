import type { BrandKit } from "@/lib/brand-kit";
import type { BrandProfile } from "@/lib/brand-profile";
import { newImageCanvasTextLayer, type ImageCanvasLayer } from "@/lib/image-canvas-layers";

export function extractHexColors(text: string): string[] {
  const matches = text.match(/#[0-9a-fA-F]{3,8}/g);
  return matches ?? [];
}

export function brandKitHasPromptContent(kit: BrandKit | null | undefined): boolean {
  if (!kit) return false;
  // Logo alone must NOT force Brand Kit into AI image prompts — palette defaults
  // (green / near-black / amber) otherwise get painted as literal color bars.
  // Kit colors stay for canvas / compositor; AI freely designs the full image.
  return Boolean(kit.tagline.trim());
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
  // Do not inject primary/secondary/accent hex into AI image prompts — models
  // often paint them as literal green/black/yellow bars. Palette is canvas-only.
  return [
    kit.tagline.trim() ? `Brand tagline for typography tone: "${kit.tagline.trim()}".` : "",
    // Never ask the model to draw marks — it invents flasks, "logo" text, CTA chips.
    // Users add the real PNG themselves via Quick fix / canvas after generate.
    "No corner badges, seals, app icons, watermarks, peeled-sticker corners, or placeholder labels. Never render English meta words such as CTA, logo, brand, or watermark.",
  ]
    .filter(Boolean)
    .join(" ");
}

/** @deprecated Logo is user-applied via Quick fix / canvas — do not AI-composite. */
export function brandKitLogoImagePromptBlock(_logoImageIndex: number): string {
  return "No corner badges, seals, watermarks, or placeholder labels. Never render English meta words such as CTA, logo, brand, or watermark.";
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
    "If no client mark is attached later, leave the output free of company seals — borrow palette, typography mood, and layout rhythm only.",
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
