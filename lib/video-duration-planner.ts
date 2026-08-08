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

/**
 * Mandatory pacing + SCRIPT structure for video planners.
 * Scene count is flexible — prioritize a complete story arc that fits the runtime.
 */
export function videoDurationPlannerBlock(durationSec: number): string[] {
  const sec = Math.min(15, Math.max(4, Math.round(durationSec)));

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
      "Compress the reference arc into this length; still feel COMPLETE (never cut mid-intro).",
      "Prefer fewer sharper beats over many rushed cuts.",
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
