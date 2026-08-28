/** Public URL and pricing deep-link for the Ultra canvas (node workflow). */
export const ULTRA_CANVAS_PATH = "/ultra";

export const ULTRA_CANVAS_FEATURE = "ultra-canvas";

export const PRICING_ULTRA_CANVAS_HREF = `/pricing?plan=master&feature=${ULTRA_CANVAS_FEATURE}`;

/** Accept legacy ?feature=pro-canvas links from bookmarks and emails. */
export function isUltraCanvasFeatureParam(feature: string | null | undefined): boolean {
  return feature === ULTRA_CANVAS_FEATURE || feature === "pro-canvas";
}
