/** DeepSeek / Seedance planners — resolve user duration to seconds. */
export function resolvePlannerDurationSec(
  duration: string | undefined,
  fallback = 8,
): number {
  if (!duration?.trim() || duration === "auto") {
    return fallback;
  }
  const n = Number(duration);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(15, Math.max(4, Math.round(n)));
}

/** Mandatory pacing rules injected into every video prompt planner. */
export function videoDurationPlannerBlock(durationSec: number): string[] {
  const pacing =
    durationSec <= 4
      ? "ONE visual beat only — hook and payoff must land inside this short window."
      : durationSec <= 6
        ? "TIGHT arc: opening hook (first ~2s feel) → hero moment → clean close on the last second."
        : durationSec <= 8
          ? "Classic Reel arc: hook → hero product/concept moment → subtle CTA energy at the end."
          : "Longer Reel: hook → development or demo beat → payoff/CTA — must feel COMPLETE, never cut off mid-intro.";

  return [
    "",
    "OUTPUT LENGTH (mandatory):",
    `- Seedance will render EXACTLY ${durationSec} seconds. Plan motion and story for this runtime only.`,
    `- ${pacing}`,
    `- Do NOT describe beats that require more than ${durationSec}s to feel finished.`,
    "- The result must read as a standalone complete short ad at this length.",
  ];
}
