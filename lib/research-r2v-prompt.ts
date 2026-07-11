import type { ResearchReelAnalysis } from "@/lib/reel-analysis-types";

const SILENT_SUFFIX =
  " Silent video output: no speech, dialogue, vocals, or reference audio.";

const R2V_PRODUCT_GUARDRAILS =
  "@Image1 is the user's product — hero it in a short promo. Copy @Video1 edit rhythm, shot types, and pacing only. Do NOT recreate tutorial steps, authenticity tests, or unrelated demonstration actions from @Video1.";

/** Seedance R2V prompt — research-adapted prompt wins over generic plan-video-prompt. */
export function buildResearchR2vPrompt(input: {
  researchAnalysis?: ResearchReelAnalysis | null;
  videoPrompt?: string;
  fallbackPrompt: string;
}): string {
  const research = input.researchAnalysis?.seedancePrompt?.trim();
  if (research) {
    const motion = input.researchAnalysis?.motionSummary?.trim();
    return [
      research,
      motion ? `Pacing: ${motion}.` : "",
      R2V_PRODUCT_GUARDRAILS,
      input.fallbackPrompt,
      SILENT_SUFFIX,
    ]
      .filter(Boolean)
      .join(" ");
  }
  const manual = input.videoPrompt?.trim();
  return `${manual || input.fallbackPrompt}${SILENT_SUFFIX}`;
}
