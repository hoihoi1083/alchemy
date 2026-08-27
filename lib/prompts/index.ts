/**
 * Prompt builders for wizard image/video generation.
 * Implementation lives in lib/prompt-variables.ts — import from here for clarity.
 */
export {
  buildCampaignSlideImagePrompt,
  buildEndFrameImagePrompt,
  buildMotionPosterStillPrompt,
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
  asPromptMarket,
  parsePromptMarket,
  SUBJECT_FRAMINGS,
  type PromptMarket,
  type PromptVariables,
  type SubjectFraming,
  type VideoPromptOpts,
} from "@/lib/prompt-variables";
