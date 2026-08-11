/** Product brand — use everywhere instead of hardcoding. */
export const PRODUCT_NAME = "Alchemy AI Lab";
export const PRODUCT_NAME_SHORT = "Alchemy";
/** Browser tab / document title (landing default). */
export const PRODUCT_TAB_TITLE =
  "Alchemy AI Lab - Prompt-free AI Marketing Studio";
export const PRODUCT_LOGO_SRC = "/alchemy-logo.png";
export const PRODUCT_LOGO_ALT = `${PRODUCT_NAME} logo`;
export const PRODUCT_SUPPORT_EMAIL = "support@alchemyailab.com";
/** Canonical public site (OG, sitemap, robots). Override with NEXT_PUBLIC_APP_URL in env. */
export const PRODUCT_SITE_URL = "https://www.alchemyailab.com";

/** Shown on legal pages — confirm registered entity name/address with counsel before relying on it in disputes. */
export const PRODUCT_LEGAL_NAME = "Alchemy AI Lab";
export const PRODUCT_LEGAL_REGION = "Hong Kong SAR";
export const PRODUCT_LEGAL_LAST_UPDATED = "2026-07-27";

/** Brand colors — mirrored in `app/globals.css` `@theme` (Tailwind violet/emerald). */
export const BRAND_PURPLE = "#6C3BFF";
export const BRAND_PURPLE_SECONDARY = "#8B5CF6";
export const BRAND_SUCCESS = "#059669";

export function productSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  // Never bake localhost into production sitemap/OG (local `next build` + .env.local).
  if (
    fromEnv &&
    !(
      process.env.NODE_ENV === "production" &&
      /^(https?:\/\/)?(localhost|127\.0\.0\.1)(:\d+)?$/i.test(fromEnv)
    )
  ) {
    return fromEnv;
  }
  return PRODUCT_SITE_URL;
}
