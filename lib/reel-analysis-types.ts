import { referenceStyleTransferPromptBlock } from "@/lib/reference-style-transfer";

/** One sampled frame from a reference reel (timeline order). */
export type ReelShotFrame = {
  index: number;
  timeSec: number;
  sceneSummary: string;
  layoutStyle: string;
  motionHint: string;
  subjects: string;
  visibleText: string;
};

/** Output of analyze-research-reel — drives Seedance R2V prompt (video workflow only). */
export type ResearchReelAnalysis = {
  durationSec: number;
  frameCount: number;
  shots: ReelShotFrame[];
  visualDirection: string;
  motionSummary: string;
  seedancePrompt: string;
  productionNotesZh: string;
};

export const RESEARCH_REEL_ANALYSIS_MARKER = "RESEARCH REEL ANALYSIS (from reference MP4 frames)";

export function researchReelAnalysisPromptBlock(analysis: ResearchReelAnalysis): string {
  const shotLines = analysis.shots
    .map(
      (s) =>
        `Shot ${s.index} @${s.timeSec.toFixed(1)}s: ${s.sceneSummary}. Layout: ${s.layoutStyle}. Motion: ${s.motionHint}.`,
    )
    .join(" ");
  return [
    RESEARCH_REEL_ANALYSIS_MARKER,
    `Reference reel ~${analysis.durationSec.toFixed(1)}s, ${analysis.frameCount} sampled frames.`,
    analysis.visualDirection ? `Visual direction: ${analysis.visualDirection}` : "",
    analysis.motionSummary ? `Motion/pacing: ${analysis.motionSummary}` : "",
    shotLines,
    referenceStyleTransferPromptBlock({
      visualDirection: analysis.visualDirection,
      motionSummary: analysis.motionSummary,
    }),
  ]
    .filter(Boolean)
    .join(" ");
}

export function extractResearchReelMotionNote(extra: string | undefined): string {
  if (!extra?.includes(RESEARCH_REEL_ANALYSIS_MARKER)) return "";
  const motion = extra.match(/Motion\/pacing: ([^.]+(?:\.[^.]+)*)/)?.[1];
  return motion?.trim() ?? "";
}
