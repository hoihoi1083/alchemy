import type { CarouselReferenceVision } from "@/lib/carousel-reference-vision";
import type { ConceptImageVision } from "@/lib/concept-image-vision";
import type { VideoStoryboardPlan } from "@/lib/video-storyboard-types";

/** One layout beat from a reference still (cover or carousel slide). */
export type ImageReferenceBeat = {
  index: number;
  sceneSummary: string;
  layoutStyle: string;
  motionHint: string;
  subjects: string;
  colorPalette: string;
  mood: string;
};

/** Normalized image reference analysis — parallel to ResearchReelAnalysis for stills. */
export type ResearchImageReferenceAnalysis = {
  source: "single" | "carousel";
  visualDirection: string;
  motionSummary: string;
  layoutFamily: string;
  beats: ImageReferenceBeat[];
};

export function researchImageAnalysisFromConceptVision(
  vision: ConceptImageVision,
): ResearchImageReferenceAnalysis {
  const visualDirection = [
    vision.colorPalette,
    vision.mood,
    vision.typographyStyle,
    vision.contentType,
  ]
    .filter(Boolean)
    .join(" · ");
  return {
    source: "single",
    visualDirection: visualDirection || vision.sceneSummary || vision.topic,
    motionSummary: vision.motionHints || "subtle motion preserving reference layout",
    layoutFamily: vision.layoutStyle || vision.contentType || "reference cover layout",
    beats: [
      {
        index: 1,
        sceneSummary: vision.sceneSummary || vision.topic,
        layoutStyle: vision.layoutStyle || "cover layout",
        motionHint: vision.motionHints || "hold layout, subtle drift",
        subjects: vision.subjects,
        colorPalette: vision.colorPalette,
        mood: vision.mood,
      },
    ],
  };
}

export function researchImageAnalysisFromCarouselVision(
  vision: CarouselReferenceVision,
): ResearchImageReferenceAnalysis {
  const visualDirection = [
    vision.sharedColorPalette,
    vision.sharedMood,
    vision.sharedTypography,
    vision.seriesSummary,
  ]
    .filter(Boolean)
    .join(" · ");
  return {
    source: "carousel",
    visualDirection: visualDirection || vision.seriesSummary,
    motionSummary: "carousel slide pacing — one beat per reference slide",
    layoutFamily: vision.sharedLayoutFamily || vision.contentType || "carousel ad",
    beats: vision.slides.map((slide) => ({
      index: slide.index,
      sceneSummary: slide.sceneSummary,
      layoutStyle: slide.layoutStyle || vision.sharedLayoutFamily,
      motionHint: slide.compositionHint || slide.stagingPose || "match slide layout",
      subjects: slide.stagingPose,
      colorPalette: slide.colorPalette || vision.sharedColorPalette,
      mood: slide.mood || vision.sharedMood,
    })),
  };
}

/** Lock storyboard plan aesthetic to analyzed reference still(s) — user topic in copy only. */
export function pinStoryboardPlanToImageReference(
  plan: VideoStoryboardPlan,
  analysis: ResearchImageReferenceAnalysis,
  userTopic: string,
): VideoStoryboardPlan {
  const lockedVisual =
    analysis.visualDirection.trim() ||
    plan.visualDirection.trim() ||
    analysis.beats
      .map((b) => `${b.layoutStyle}: ${b.sceneSummary}`)
      .filter(Boolean)
      .join(" · ");

  const scenes = plan.scenes.map((scene, i) => {
    const beat =
      analysis.beats[i] ??
      analysis.beats[Math.min(i, analysis.beats.length - 1)];
    const beatRef = beat
      ? [
          `REFERENCE BEAT ${beat.index} (style shell — do NOT copy subjects):`,
          `layout=${beat.layoutStyle || analysis.layoutFamily}`,
          `motion=${beat.motionHint || analysis.motionSummary}`,
          `reference-look=${analysis.visualDirection || beat.sceneSummary}`,
          "Keep render medium + layout grammar from the reference still — NOT generic stock TVC unless reference is.",
        ].join(" ")
      : "";
    return {
      ...scene,
      imagePrompt: [beatRef, scene.imagePrompt].filter(Boolean).join(" | "),
    };
  });

  return {
    ...plan,
    theme: userTopic.trim() || plan.theme,
    visualDirection: lockedVisual,
    productionNotes:
      plan.productionNotes ||
      `Style locked to reference ${analysis.source}: ${lockedVisual.slice(0, 120)}`,
    scenes,
  };
}
