/** How much motion / variety to aim for in Seedance prompts and settings. */
export type VideoCreativity = "subtle" | "lively" | "cinematic";

export const VIDEO_CREATIVITY_LEVELS: VideoCreativity[] = [
  "subtle",
  "lively",
  "cinematic",
];

export function motionStrengthForCreativity(
  base: number,
  creativity: VideoCreativity,
): number {
  const bump = { subtle: 0, lively: 8, cinematic: 14 }[creativity];
  return Math.min(45, base + bump);
}

export function creativityMotionHint(
  creativity: VideoCreativity,
  dualFrame: boolean,
): string {
  if (creativity === "subtle" && !dualFrame) {
    return "Gentle commercial motion with soft light shimmer; minimal camera movement.";
  }
  if (dualFrame) {
    if (creativity === "cinematic") {
      return [
        "Interpolate smoothly from the opening frame to the closing frame.",
        "Three-beat pacing: reveal → hero detail push → soft pull-back.",
        "Add sparkle on facets, subtle parallax on background bokeh, elegant jewelry-ad rhythm.",
        "Not a single static zoom — vary camera energy across the clip.",
      ].join(" ");
    }
    return [
      "Smooth transition between opening and closing frames.",
      "Combine gentle orbit with a mid-clip push-in; sparkle on gem highlights.",
      "Avoid one repetitive zoom-only move.",
    ].join(" ");
  }
  if (creativity === "lively") {
    return [
      "Dynamic product ad: gentle orbit, then push-in, micro sparkle pulses on stones.",
      "Slight background parallax; varied pacing — not only zoom in/out.",
    ].join(" ");
  }
  if (creativity === "cinematic") {
    return [
      "Premium vertical Reel / TVC feel: orbit reveal, push to hero detail, soft pull-out or lateral track.",
      "Layered light movement, background parallax, and subject motion — confident multi-beat pacing within the clip.",
      "Visible camera travel — not a locked static shot with only a light shimmer.",
    ].join(" ");
  }
  return "Smooth commercial motion with soft shimmer.";
}
