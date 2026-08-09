import {
  R2V_CONCEPT_FAL_GUARDRAILS,
  R2V_FAL_GUARDRAILS,
} from "@/lib/prompt-balance-contract";
import type { ResearchReelAnalysis } from "@/lib/reel-analysis-types";

const SILENT_SUFFIX =
  " Silent video output: no speech, dialogue, vocals, or reference audio.";

/** Seedance R2V prompt — research-adapted prompt wins; do not append generic fallback (dilutes). */
export function buildResearchR2vPrompt(input: {
  researchAnalysis?: ResearchReelAnalysis | null;
  videoPrompt?: string;
  fallbackPrompt: string;
  conceptMode?: boolean;
}): string {
  const guardrails = input.conceptMode
    ? R2V_CONCEPT_FAL_GUARDRAILS
    : R2V_FAL_GUARDRAILS;
  const research = input.researchAnalysis?.seedancePrompt?.trim();
  if (research) {
    const motion = input.researchAnalysis?.motionSummary?.trim();
    return [
      research,
      motion ? `Pacing: ${motion}.` : "",
      guardrails,
      SILENT_SUFFIX,
    ]
      .filter(Boolean)
      .join(" ");
  }
  const manual = input.videoPrompt?.trim();
  return `${manual || input.fallbackPrompt}${SILENT_SUFFIX}`;
}
