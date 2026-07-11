/** HeyGen Avatar IV on fal — lip-sync talking presenter from a still + audio. */
export const HEYGEN_AVATAR_IV_ENDPOINT = "fal-ai/heygen/avatar4/image-to-video";

export type UgcPresenterTalkingStyle = "stable" | "expressive";

export function ugcPresenterMotionHint(productName: string): string {
  const p = productName.trim() || "the product";
  return `Natural UGC presenter gestures while speaking, briefly showing ${p} on wrist to camera, subtle nods, friendly expression, minimal body movement, stable home office background.`;
}
