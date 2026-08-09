import { callDeepSeekChat } from "@/lib/deepseek-client";
import { parseLlmJsonObject } from "@/lib/parse-llm-json";
import { productIdentityContractLines } from "@/lib/prompt-balance-contract";
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
  conceptMode?: boolean;
}): Promise<RefinedResearchVideoScript> {
  const durationSec = Math.min(15, Math.max(4, Math.round(input.durationSec) || 8));
  const prior = researchReelAnalysisPromptBlock(input.analysis);
  const concept = Boolean(input.conceptMode);

  const raw = await callDeepSeekChat(
    [
      {
        role: "system",
        content: concept
          ? "You are a performance marketing video director. You write EXACT-duration scripts for Seedance/MiniMax reference-to-video for CONCEPT/SERVICE campaigns. Think beat-by-beat before writing. Output valid JSON only."
          : "You are a performance marketing video director. You write EXACT-duration scripts for Seedance/MiniMax reference-to-video. Think beat-by-beat before writing. Output valid JSON only.",
      },
      {
        role: "user",
        content: [
          concept
            ? "Rewrite the video SCRIPT for the user's CONCEPT / SERVICE using the reference-reel analysis."
            : "Rewrite the video SCRIPT for the user's product using the reference-reel analysis.",
          "Think carefully about WHAT HAPPENS on screen each second — not just style adjectives.",
          "Return ONE JSON object only:",
          '{"seedancePrompt":"","motionSummary":"","productionNotesZh":"","scriptBeatsZh":""}',
          "",
          concept
            ? "seedancePrompt (English, for @Video1 R2V — optional @Image1 scene lock):"
            : "seedancePrompt (English, for @Video1 + @Image1 R2V):",
          "- PRIMARY: Follow @Video1's shot sequence, locations, camera moves, cut rhythm, and pacing closely.",
          concept
            ? "- Write a concrete timed script that MAPS those @Video1 beats onto the named SERVICE / IDEA (same places/actions energy)."
            : "- Write a concrete timed script that MAPS those @Video1 beats onto the user's product (same places/actions energy).",
          "- Silent video: no speech/dialogue in the prompt as spoken audio.",
          "- No on-screen text/logos/watermarks in the generated frames.",
          "",
          ...productIdentityContractLines({
            hasReferenceVideo: true,
            conceptMode: concept,
          }),
          "",
          "scriptBeatsZh: short Traditional Chinese (HK) beat list timed to the output length (e.g. 0-2s …).",
          "motionSummary: one English sentence of pacing (should echo @Video1).",
          "productionNotesZh: one short user-facing note in 繁中.",
          "",
          ...videoDurationPlannerBlock(durationSec, { hasReferenceVideo: true }),
          "",
          concept
            ? "PRIOR REEL ANALYSIS (use as the shot/location bible — sell the service/idea, not a SKU packshot):"
            : "PRIOR REEL ANALYSIS (use as the shot/location bible — replace only the SKU with @Image1):",
          prior,
          "",
          input.product
            ? concept
              ? `Campaign / service name (CLAIM): ${input.product}`
              : `Product name (CLAIM only — on-screen object follows photo/@Image1): ${input.product}`
            : "",
          input.headline
            ? concept
              ? `Title / headline (CLAIM): ${input.headline}`
              : `Title / headline (CLAIM — sell this, keep @Image1 look): ${input.headline}`
            : "",
          input.subline ? `Selling points: ${input.subline}` : "",
          input.offer ? `Offer/CTA: ${input.offer}` : "",
          input.productVisionNote
            ? concept
              ? `SCENE / STILL VISION (optional lock — do not change @Video1 structure):\n${input.productVisionNote}`
              : `PRODUCT PHOTO VISION (object identity only — do not change @Video1 structure):\n${input.productVisionNote}`
            : concept
              ? "Optional still: treat @Image1 as scene mood lock if attached; still follow @Video1 shot structure."
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
