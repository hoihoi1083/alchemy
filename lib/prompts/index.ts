/**
 * Prompt builders for wizard image/video generation.
 * Implementation lives in lib/prompt-variables.ts — import from here for clarity.
 */
export {
  buildCampaignSlideImagePrompt,
  buildEndFrameImagePrompt,
  buildMultiAngleVideoPrompt,
  buildNegativePrompt,
  buildPromptVariables,
  buildReferenceVideoNegative,
  buildReferenceVideoPrompt,
  buildWizardImagePrompt,
  buildWizardVideoPrompt,
  resolveImagePromptMode,
  type ImagePromptContext,
  PROMPT_MARKETS,
  SUBJECT_FRAMINGS,
  type PromptMarket,
  type PromptVariables,
  type SubjectFraming,
  type VideoPromptOpts,
} from "@/lib/prompt-variables";
