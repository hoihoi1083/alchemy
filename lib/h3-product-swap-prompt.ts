/**
 * Client-safe H3 reference-reel product swap prompt (no fal/sharp imports).
 * MiniMax H3 R2V — short prompt tuned for product photo + motion reference video.
 */

export function buildH3ReferenceReelProductPrompt(opts: {
  durationSec: number;
  productName?: string;
  motionSummary?: string;
}): string {
  const sec = Math.max(5, Math.min(15, Math.round(opts.durationSec) || 6));
  const parts = [
    "Image 1 is the ONLY on-screen product. Preserve exact shape, color, materials, ports, label, and packaging from Image 1. Do not redesign or substitute a different gadget.",
    "Video 1 is camera path, cut rhythm, hand motion, and scene pacing ONLY. Do NOT copy the product object, color, shape, or branding from Video 1.",
    "In every shot where Video 1 shows a product, replace it with Image 1 while keeping the same hands, locations, and camera moves.",
    opts.motionSummary?.trim()
      ? `Pacing: ${opts.motionSummary.trim()}.`
      : "",
    `${sec}-second silent vertical product video. No speech. No on-screen text or logos.`,
  ];
  const name = opts.productName?.trim();
  if (name) {
    parts.push(
      `Product claim (caption meaning only — appearance must match Image 1): ${name}.`,
    );
  }
  return parts.filter(Boolean).join(" ");
}
