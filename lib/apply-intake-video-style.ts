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
  applyPrimaryPathConceptVideo: (
    path: "creative" | "brand" | "explosion-unbox",
  ) => void;
  onVideoCreativeModeChange: (mode: VideoCreativeMode) => void;
};

/** Map micro videoSubpath → wizard videoCreativeMode (for badges / copy hints). */
export function videoSubpathToCreativeMode(
  subpath: VideoSubpath | string | null | undefined,
): VideoCreativeMode | null {
  if (!subpath) return null;
  const h3 = subpathToH3ShotRecipe(subpath as VideoSubpath);
  if (h3) return h3;
  switch (subpath) {
    case "product_promo":
      return "product-promo";
    case "motion_poster":
      return "motion-poster";
    case "impact_poster":
      return "impact-poster";
    case "blockbuster":
      return "blockbuster";
    case "vacuum_inflate":
      return "vacuum-inflate";
    case "creative_motion":
      return "creative-motion";
    case "hand_throw_scene":
      return "hand-throw-scene";
    case "web_boundary_break":
      return "web-boundary-break";
    case "type_behind_cutout":
      return "type-behind-cutout";
    case "social_frame_break":
      return "social-frame-break";
    case "wet_glass_reveal":
      return "wet-glass-reveal";
    case "torn_paper_reveal":
      return "torn-paper-reveal";
    case "orbit_type":
      return "orbit-type";
    case "cloche_reveal":
      return "cloche-reveal";
    case "swift_chroma_run":
      return "swift-chroma-run";
    case "magazine_cover_morph":
      return "magazine-cover-morph";
    case "product_explode":
      return "product-explode";
    case "bullet_product_elevate":
      return "bullet-product-elevate";
    case "social_drip":
      return "social-drip";
    case "reference_reel":
      return "reference-concept";
    case "explosion_unbox":
      return "image-to-video";
    default:
      return null;
  }
}

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
    case "explosion_unbox":
      if (isConcept) wizard.applyPrimaryPathConceptVideo("explosion-unbox");
      return;
    case "brand_video":
      if (isConcept) wizard.applyPrimaryPathConceptVideo("brand");
      else wizard.applyPrimaryPathVideoOnly("brand");
      return;
    case "motion_poster":
      wizard.onVideoCreativeModeChange("motion-poster");
      return;
    case "impact_poster":
      wizard.onVideoCreativeModeChange("impact-poster");
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
    case "web_boundary_break":
      wizard.onVideoCreativeModeChange("web-boundary-break");
      return;
    case "type_behind_cutout":
      wizard.onVideoCreativeModeChange("type-behind-cutout");
      return;
    case "social_frame_break":
      wizard.onVideoCreativeModeChange("social-frame-break");
      return;
    case "wet_glass_reveal":
      wizard.onVideoCreativeModeChange("wet-glass-reveal");
      return;
    case "torn_paper_reveal":
      wizard.onVideoCreativeModeChange("torn-paper-reveal");
      return;
    case "orbit_type":
      wizard.onVideoCreativeModeChange("orbit-type");
      return;
    case "cloche_reveal":
      wizard.onVideoCreativeModeChange("cloche-reveal");
      return;
    case "swift_chroma_run":
      wizard.onVideoCreativeModeChange("swift-chroma-run");
      return;
    case "magazine_cover_morph":
      wizard.onVideoCreativeModeChange("magazine-cover-morph");
      return;
    case "product_explode":
      wizard.onVideoCreativeModeChange("product-explode");
      return;
    case "bullet_product_elevate":
      wizard.onVideoCreativeModeChange("bullet-product-elevate");
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
