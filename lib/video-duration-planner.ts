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

export type DurationPlannerOpts = {
  /**
   * When true (research / reference R2V), do NOT inject HOOK→DEMO→CTA.
   * Duration only compresses @Video1's existing beats into N seconds.
   */
  hasReferenceVideo?: boolean;
  /**
   * When true (product/concept TVC storyboard), size TVC roles into N seconds —
   * do NOT invent a competing HOOK→DEMO marketing plot.
   */
  storyboardTvc?: boolean;
};

/**
 * Mandatory pacing for video planners.
 * - No @Video1: marketing / recipe arc sized to N seconds.
 * - With @Video1: compress the reference spine only — never invent a new plot.
 * - Storyboard TVC: compress establish→…→payoff roles into N seconds.
 */
export function videoDurationPlannerBlock(
  durationSec: number,
  opts?: DurationPlannerOpts,
): string[] {
  const sec = Math.min(15, Math.max(4, Math.round(durationSec)));

  if (opts?.hasReferenceVideo) {
    return [
      "",
      "OUTPUT LENGTH + REFERENCE SPINE (mandatory):",
      `- The model will render EXACTLY ${sec} seconds.`,
      `- @Video1 already has a shot structure. COMPRESS those existing beats into ${sec}s — keep the same locations, camera language, and cut energy.`,
      "- Do NOT invent a new HOOK → DEMO → DESIRE → CTA story that replaces @Video1.",
      "- Do NOT invent a second location, tutorial rewrite, or studio-only packshot arc.",
      `- Map the reference's opening → mid → close into ${sec}s so the clip still feels COMPLETE (never cut mid-intro).`,
      "- Scene/shot COUNT is flexible — quality of matching @Video1 > arbitrary beat count.",
      `- Do NOT describe beats that need more than ${sec}s to land.`,
    ];
  }

  if (opts?.storyboardTvc) {
    return [
      "",
      "OUTPUT LENGTH + TVC ROLE SPINE (mandatory):",
      `- Target finished storyboard is about ${sec} seconds across the planned scenes.`,
      "- Use TVC shot roles (establish → macro → orbit/logo-trace → lifestyle/payoff) — NOT a separate HOOK→DEMO→DESIRE→CTA rewrite.",
      `- Compress those roles into ~${sec}s total so the stitch / H3 clip feels COMPLETE.`,
      "- Do NOT invent a second location, tutorial rewrite, or studio-only packshot arc that ignores the roles.",
      `- Do NOT describe beats that need more than ${sec}s to land.`,
    ];
  }

  let scriptBeats: string;
  if (sec <= 4) {
    scriptBeats = [
      "SCRIPT STRUCTURE (~4s — one continuous beat, not a multi-scene essay):",
      "0.0–1.0s HOOK: instantly show the product/idea benefit (no slow intro).",
      "1.0–3.0s HERO: one clear product action or reveal; sell the offer in motion.",
      "3.0–4.0s CLOSE: satisfying hold / micro-CTA energy (smile, product fill frame) — must feel finished.",
      "Do NOT invent a second location, tutorial steps, or mid-roll that needs more time.",
    ].join("\n");
  } else if (sec <= 6) {
    scriptBeats = [
      "SCRIPT STRUCTURE (~6s — tight three-act feel):",
      "0–~2s HOOK: pattern interrupt / problem or desire.",
      "~2–~4.5s HERO: product in use or clear benefit demo.",
      "~4.5–6s PAYOFF: result / desirability / soft CTA energy.",
      "Keep transitions motivated; no dead holds longer than ~0.5s.",
    ].join("\n");
  } else if (sec <= 8) {
    scriptBeats = [
      "SCRIPT STRUCTURE (~8s classic Reel):",
      "0–~2s HOOK: stop-scroll opening.",
      "~2–~5s DEMO: product/concept proof or lifestyle use.",
      "~5–~7s DESIRE: beauty/detail/reaction beat.",
      "~7–8s CLOSE: brand/product lock + CTA energy.",
    ].join("\n");
  } else if (sec <= 10) {
    scriptBeats = [
      "SCRIPT STRUCTURE (~10s):",
      "0–~2s HOOK.",
      "~2–~5s SETUP / context.",
      "~5–~8s DEMO / proof.",
      "~8–10s PAYOFF + CTA energy.",
      "Every second must advance the sell — no filler B-roll.",
    ].join("\n");
  } else {
    scriptBeats = [
      `SCRIPT STRUCTURE (~${sec}s longer Reel):`,
      "HOOK → CONTEXT → DEMO/PROOF → DESIRE → PAYOFF/CTA.",
      "Prefer fewer sharper beats over many rushed cuts.",
      "Still feel COMPLETE (never cut mid-intro).",
    ].join("\n");
  }

  return [
    "",
    "OUTPUT LENGTH + SCRIPT (mandatory):",
    `- The model will render EXACTLY ${sec} seconds. Write the spoken/visual SCRIPT and motion ONLY for this runtime.`,
    `- ${scriptBeats}`,
    `- Scene/shot COUNT is flexible — choose whatever count best serves this ${sec}s script (quality of arc > arbitrary scene count).`,
    `- Do NOT describe beats that need more than ${sec}s to land.`,
    "- The result must read as a standalone complete short ad at this length.",
  ];
}
