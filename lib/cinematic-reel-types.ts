export type CinematicScenePlan = {
  sceneIndex: number;
  role: string;
  startSec: number;
  endSec: number;
  sceneDescriptionZh: string;
  imagePrompt: string;
  videoMotionPrompt: string;
  /** Spoken VO / dialogue for this beat (English preferred for EN ads). */
  spokenLine?: string;
  /** Who delivers the line, e.g. PersonA / Host / Narrator. */
  speaker?: string;
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
  spokenLine?: string;
  speaker?: string;
};
