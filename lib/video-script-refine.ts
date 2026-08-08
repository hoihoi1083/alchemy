import { callDeepSeekChat } from "@/lib/deepseek-client";
import { parseLlmJsonObject } from "@/lib/parse-llm-json";
import type { ResearchReelAnalysis } from "@/lib/reel-analysis-types";
import { researchReelAnalysisPromptBlock } from "@/lib/reel-analysis-types";
import { videoDurationPlannerBlock } from "@/lib/video-duration-planner";

export type RefinedResearchVideoScript = {
  seedancePrompt: string;
  motionSummary: string;
  productionNotesZh: string;
  scriptBeatsZh: string;
};

/**
 * Final DeepSeek pass: reel analysis + product reality + exact duration →
 * one Seedance/H3 R2V script. Scene count stays flexible; arc quality is the goal.
 */
export async function refineResearchVideoScript(input: {
  analysis: ResearchReelAnalysis;
  durationSec: number;
  product: string;
  headline?: string;
  subline?: string;
  offer?: string;
  /** Florence / vision notes about the user's product photo (optional). */
  productVisionNote?: string;
}): Promise<RefinedResearchVideoScript> {
  const durationSec = Math.min(15, Math.max(4, Math.round(input.durationSec) || 8));
  const prior = researchReelAnalysisPromptBlock(input.analysis);

  const raw = await callDeepSeekChat(
    [
      {
        role: "system",
        content:
          "You are a performance marketing video director. You write EXACT-duration scripts for Seedance/MiniMax reference-to-video. Think beat-by-beat before writing. Output valid JSON only.",
      },
      {
        role: "user",
        content: [
          "Rewrite the video SCRIPT for the user's product using the reference-reel analysis.",
          "Think carefully about WHAT HAPPENS on screen each second — not just style adjectives.",
          "Return ONE JSON object only:",
          '{"seedancePrompt":"","motionSummary":"","productionNotesZh":"","scriptBeatsZh":""}',
          "",
          "seedancePrompt (English, for @Video1 + @Image1 R2V):",
          "- PRIMARY: Follow @Video1's shot sequence, locations, camera moves, cut rhythm, and pacing closely.",
          "- Write a concrete timed script that MAPS those @Video1 beats onto the user's product (same places/actions energy).",
          "- @Image1 = ONLY the product object identity (shape, color, packaging). Swap the reference's object for @Image1 in those same shots.",
          "- Do NOT invent a new studio-only beauty story that ignores @Video1 locations/structure.",
          "- PRODUCT PHOTO WINS over product name if they disagree (on-screen object = @Image1, not the name).",
          "- If @Video1 demos a different category (e.g. charging a power bank) but @Image1 is another object,",
          "  keep the SAME scene/setting/camera and show @Image1 as the hero prop (hold it, place it, close-up) —",
          "  do not copy the wrong gadget's UI/cables unless @Image1 actually has them.",
          "- Keep @Image1 identity in every beat; do not let the reference product reappear.",
          "- Do NOT recreate reference faces, brands, or on-screen text.",
          "- Silent video: no speech/dialogue in the prompt as spoken audio.",
          "- No on-screen text/logos/watermarks in the generated frames.",
          "",
          "scriptBeatsZh: short Traditional Chinese (HK) beat list timed to the output length (e.g. 0-2s …).",
          "motionSummary: one English sentence of pacing (should echo @Video1).",
          "productionNotesZh: one short user-facing note in 繁中.",
          "",
          ...videoDurationPlannerBlock(durationSec),
          "",
          "PRIOR REEL ANALYSIS (use as the shot/location bible — replace only the SKU with @Image1):",
          prior,
          "",
          input.product
            ? `Product name (label only — on-screen object follows photo/@Image1): ${input.product}`
            : "",
          input.headline ? `Headline: ${input.headline}` : "",
          input.subline ? `Selling points: ${input.subline}` : "",
          input.offer ? `Offer/CTA: ${input.offer}` : "",
          input.productVisionNote
            ? `PRODUCT PHOTO VISION (object identity only — do not change @Video1 structure):\n${input.productVisionNote}`
            : "Product photo: treat @Image1 as the hero object; still follow @Video1 shot structure.",
        ]
          .filter(Boolean)
          .join("\n"),
      },
    ],
    { temperature: 0.35, max_tokens: 2800, jsonObject: true },
  );

  const parsed = parseLlmJsonObject<Partial<RefinedResearchVideoScript>>(
    raw,
    "Research video script refine",
  );
  const seedancePrompt = String(parsed.seedancePrompt ?? "").trim();
  if (!seedancePrompt) {
    throw new Error("DeepSeek returned an empty refined Seedance prompt.");
  }

  return {
    seedancePrompt,
    motionSummary: String(parsed.motionSummary ?? "").trim(),
    productionNotesZh: String(parsed.productionNotesZh ?? "").trim(),
    scriptBeatsZh: String(parsed.scriptBeatsZh ?? "").trim(),
  };
}
