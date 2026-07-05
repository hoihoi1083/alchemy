export type CinematicScenePlan = {
  sceneIndex: number;
  role: string;
  startSec: number;
  endSec: number;
  sceneDescriptionZh: string;
  imagePrompt: string;
  videoMotionPrompt: string;
};

export type CinematicReelPlan = {
  title: string;
  theme: string;
  totalDurationSec: number;
  scenes: CinematicScenePlan[];
  productionNotes: string;
};

export type CinematicSceneResult = {
  sceneIndex: number;
  role: string;
  startSec: number;
  endSec: number;
  sceneDescriptionZh: string;
  imagePrompt: string;
  videoMotionPrompt: string;
  imageUrl: string;
};
