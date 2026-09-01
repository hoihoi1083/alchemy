/** Snapshot taken when the user kicks off a paid image regen from setup. */
export type ImageGenWaitGuard = { imageGenKey: number };

export type VideoGenWaitGuard = { videoUrl: string | null };

export type ImageGenerateWaitDecision =
  | "busy"
  | "hold_stale"
  | "fail_back"
  | "not_ready"
  | "advance";

/**
 * Decide whether wait.image_generate / wait.storyboard_generate should auto-advance.
 * While imageGenKey is unchanged, the UI still shows the previous generation — hold
 * on the wait screen instead of flashing image.review.
 */
export function decideImageGenerateWait(input: {
  guard: ImageGenWaitGuard | null;
  imageGenKey: number;
  imageBusy: boolean;
  hasImageOutput: boolean;
  error: string | null;
}): ImageGenerateWaitDecision {
  if (input.imageBusy) return "busy";
  if (input.guard && input.imageGenKey === input.guard.imageGenKey) {
    return input.error ? "fail_back" : "hold_stale";
  }
  if (!input.hasImageOutput) {
    return input.error ? "fail_back" : "not_ready";
  }
  return "advance";
}

export function decideVideoGenerateWait(input: {
  guard: VideoGenWaitGuard | null;
  videoBusy: boolean;
  videoUrl: string | null;
  error: string | null;
}): "busy" | "hold_stale" | "fail_back" | "not_ready" | "advance" {
  if (input.videoBusy) return "busy";
  if (input.guard && input.videoUrl === input.guard.videoUrl) {
    return input.error ? "fail_back" : "hold_stale";
  }
  if (!input.videoUrl) {
    return input.error ? "fail_back" : "not_ready";
  }
  return "advance";
}
