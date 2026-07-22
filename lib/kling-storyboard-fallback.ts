import type { KlingClipDuration } from "@/lib/billing/token-costs";
import { estimateKlingStoryboardTokens, KLING_TURBO_PRO } from "@/lib/billing/token-costs";

export { estimateKlingStoryboardTokens, KLING_TURBO_PRO };
export type { KlingClipDuration };

/** Pick Kling clip length from storyboard scene span (API only allows 5 or 10). */
export function klingClipDurationForScene(
  startSec: number,
  endSec: number,
): KlingClipDuration {
  const span = Math.max(0, endSec - startSec);
  return span > 5.5 ? 10 : 5;
}

/** Default clip length when animating every scene for an N-scene / totalDuration reel. */
export function klingClipDurationForStoryboard(
  sceneCount: number,
  totalDurationSec: number,
): KlingClipDuration {
  const n = Math.max(1, sceneCount);
  const per = totalDurationSec / n;
  return per > 5.5 ? 10 : 5;
}

export function klingSceneMotionPrompt(opts: {
  sceneIndex: number;
  sceneCount: number;
  sceneDescription?: string;
  imagePrompt?: string;
  theme?: string;
}): string {
  const action =
    opts.sceneDescription?.trim() ||
    opts.imagePrompt?.trim() ||
    "subtle commercial motion";
  const theme = opts.theme?.trim();
  return [
    `Storyboard scene ${opts.sceneIndex}/${opts.sceneCount} for a vertical social ad.`,
    theme ? `Theme: ${theme}.` : "",
    `Motion: ${action}.`,
    "Keep the same people, product, and layout as the input image.",
    "Subtle camera move only — no morphing faces.",
    "The still is TEXTLESS: do not invent or redraw any readable text, Chinese characters, logos, or watermarks.",
    "9:16 vertical commercial pacing.",
  ]
    .filter(Boolean)
    .join(" ");
}
