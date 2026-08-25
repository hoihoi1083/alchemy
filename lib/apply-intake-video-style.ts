/**
 * Apply Step 4 Template video-recipe picks onto wizard + micro videoSubpath.
 * Mirrors route.video_subpath ChoiceCard handlers.
 */

import type { VideoCreativeMode } from "@/lib/creative-workflow";
import { subpathToH3ShotRecipe } from "@/lib/h3-shot-recipes";
import type { VideoSubpath } from "@/lib/wizard-micro-steps.types";

export type IntakeVideoStyleWizardApi = {
  applyPrimaryPathVideoOnly: (
    path: "assistant" | "storyboard" | "brand" | "creative" | "ugc-presenter",
  ) => void;
  applyPrimaryPathConceptVideo: (path: "creative" | "brand") => void;
  onVideoCreativeModeChange: (mode: VideoCreativeMode) => void;
};

export function applyIntakeVideoStyle(
  subpath: VideoSubpath,
  opts: {
    isConcept: boolean;
    wizard: IntakeVideoStyleWizardApi;
    setVideoSubpath: (subpath: VideoSubpath) => void;
  },
): void {
  const { isConcept, wizard, setVideoSubpath } = opts;
  setVideoSubpath(subpath);

  const h3 = subpathToH3ShotRecipe(subpath);
  if (h3) {
    wizard.onVideoCreativeModeChange(h3);
    return;
  }

  switch (subpath) {
    case "product_promo":
      wizard.applyPrimaryPathVideoOnly("assistant");
      return;
    case "creative_video":
      if (isConcept) wizard.applyPrimaryPathConceptVideo("creative");
      return;
    case "brand_video":
      if (isConcept) wizard.applyPrimaryPathConceptVideo("brand");
      else wizard.applyPrimaryPathVideoOnly("brand");
      return;
    case "motion_poster":
      wizard.onVideoCreativeModeChange("motion-poster");
      return;
    case "blockbuster":
      wizard.onVideoCreativeModeChange("blockbuster");
      return;
    case "vacuum_inflate":
      wizard.onVideoCreativeModeChange("vacuum-inflate");
      return;
    case "creative_motion":
      wizard.onVideoCreativeModeChange("creative-motion");
      return;
    case "hand_throw_scene":
      wizard.onVideoCreativeModeChange("hand-throw-scene");
      return;
    case "product_explode":
      wizard.onVideoCreativeModeChange("product-explode");
      return;
    case "social_drip":
      wizard.onVideoCreativeModeChange("social-drip");
      return;
    case "reference_reel":
      wizard.onVideoCreativeModeChange("reference-concept");
      return;
    case "ugc_presenter":
      wizard.applyPrimaryPathVideoOnly("ugc-presenter");
      return;
    case "storyboard_video":
      wizard.applyPrimaryPathVideoOnly("storyboard");
      return;
    default:
      return;
  }
}
