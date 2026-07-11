export const MIN_STORYBOARD_SCENES = 3;
export const MAX_STORYBOARD_SCENES = 9;

export type StoryboardScenePlan = {
  /** 1-based — maps to Seedance @Image1, @Image2, … */
  imageIndex: number;
  role: string;
  startSec: number;
  endSec: number;
  /** Short description for the user (Traditional Chinese if HK/TW market). */
  sceneDescriptionZh: string;
  /** Consumer-facing on-image copy for this scene (繁中) — not production labels. */
  onImageCopyZh?: string;
  /** English still-image prompt for Nano Banana (product from IMAGE 1). */
  imagePrompt: string;
};

export type VideoStoryboardPlan = {
  title: string;
  theme: string;
  visualDirection: string;
  totalDurationSec: number;
  scenes: StoryboardScenePlan[];
  /** Full English Seedance reference-to-video prompt with @Image tags and time ranges. */
  seedancePrompt: string;
  productionNotes: string;
};

export type StoryboardSceneResult = {
  imageIndex: number;
  role: string;
  startSec: number;
  endSec: number;
  sceneDescriptionZh: string;
  onImageCopyZh?: string;
  imageUrl: string;
  /** Original per-scene image prompt used for scene regeneration. */
  imagePrompt?: string;
};
