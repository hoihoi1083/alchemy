import type { CampaignSlide } from "@/hooks/useWizardState";
import type { CinematicSceneResult } from "@/lib/cinematic-reel-types";
import type { ImageOutputMode } from "@/lib/image-output-mode";
import type { StoryboardSceneResult } from "@/lib/video-storyboard-types";

/** Display mode for generated stills — mirrors classic ImageStep branching order. */
export type GeneratedImageResultViewKind =
  | "empty"
  | "original"
  | "storyboard"
  | "cinematic"
  | "carousel"
  | "ab"
  | "single";

export type GeneratedImageResultView = {
  kind: GeneratedImageResultViewKind;
  /** Set when kind === "carousel". */
  carouselVariant?: "teaching" | "campaign";
};

export type ResolveGeneratedImageResultViewInput = {
  imageUrl: string | null;
  useOriginalImage: boolean;
  imageVariantUrls: string[];
  campaignSlides: CampaignSlide[];
  storyboardScenes: StoryboardSceneResult[];
  cinematicScenes: CinematicSceneResult[];
  effectiveImageOutputMode: ImageOutputMode;
  isStoryboardOutput: boolean;
  isCinematicStitchOutput: boolean;
};

/**
 * Single source of truth for how generated images should be labeled in the UI.
 * Used by micro-wizard ImageResultPanel and parity-tested against ImageStep.
 */
export function resolveGeneratedImageResultView(
  input: ResolveGeneratedImageResultViewInput,
): GeneratedImageResultView {
  if (input.useOriginalImage && input.imageUrl) {
    return { kind: "original" };
  }
  if (input.storyboardScenes.length > 0) {
    return { kind: "storyboard" };
  }
  if (input.cinematicScenes.length > 0) {
    return { kind: "cinematic" };
  }
  if (input.imageUrl && input.campaignSlides.length > 1) {
    return {
      kind: "carousel",
      carouselVariant:
        input.effectiveImageOutputMode === "teaching-carousel" ? "teaching" : "campaign",
    };
  }
  if (
    input.imageUrl &&
    !input.isStoryboardOutput &&
    !input.isCinematicStitchOutput &&
    input.campaignSlides.length <= 1 &&
    input.imageVariantUrls.length > 1 &&
    input.effectiveImageOutputMode === "ab"
  ) {
    return { kind: "ab" };
  }
  if (input.imageUrl) {
    return { kind: "single" };
  }
  return { kind: "empty" };
}
