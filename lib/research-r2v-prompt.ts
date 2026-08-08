import type { ResearchReelAnalysis } from "@/lib/reel-analysis-types";

const SILENT_SUFFIX =
  " Silent video output: no speech, dialogue, vocals, or reference audio.";

const R2V_PRODUCT_GUARDRAILS =
  "Follow @Video1 shot structure, locations, camera, and pacing as the spine of the ad. @Image1 replaces ONLY the product object (shape/color/packaging) in those shots — do not invent a studio-only story that ignores @Video1. Product name must not change the on-screen object away from @Image1. Do not recreate reference faces, brands, or on-screen text.";

/** Seedance R2V prompt — research-adapted prompt wins; do not append generic fallback (dilutes). */
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
      SILENT_SUFFIX,
    ]
      .filter(Boolean)
      .join(" ");
  }
  const manual = input.videoPrompt?.trim();
  return `${manual || input.fallbackPrompt}${SILENT_SUFFIX}`;
}
