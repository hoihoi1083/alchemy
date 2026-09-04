import type { CarouselReferenceVision } from "@/lib/carousel-reference-vision";
import type { ConceptImageVision } from "@/lib/concept-image-vision";
import type { StoryboardLookBible } from "@/lib/shot-recipes";
import type { UserReferenceBrief } from "@/lib/user-reference-brief";
import type { VideoStoryboardPlan } from "@/lib/video-storyboard-types";

/** Align grade bible with analyzed reference so LOOK BIBLE LOCK does not fight series look. */
function lookBibleFromImageAnalysis(
  analysis: ResearchImageReferenceAnalysis,
  existing?: StoryboardLookBible | null,
): StoryboardLookBible {
  const beat = analysis.beats[0];
  return {
    palette:
      beat?.colorPalette?.trim() ||
      existing?.palette?.trim() ||
      "",
    lighting: beat?.mood?.trim() || existing?.lighting?.trim() || "",
    materials:
      analysis.layoutFamily?.trim() ||
      beat?.layoutStyle?.trim() ||
      existing?.materials?.trim() ||
      "",
    negatives:
      existing?.negatives?.trim() ||
      "no generic stock TVC, no inventing a different render medium or layout family than the reference, no ignoring reference mood/palette",
  };
}

/** Rebuild image-reference analysis from the stored creative brief (re-plan / generate fallback). */
export function researchImageAnalysisFromUserBrief(
  brief: UserReferenceBrief,
): ResearchImageReferenceAnalysis {
  const slides = brief.carouselSlides?.filter(Boolean) ?? [];
  if (slides.length > 0) {
    const visualDirection = [
      brief.colorPalette,
      brief.mood,
      brief.typographyStyle,
      brief.contentType || brief.topic,
    ]
      .filter(Boolean)
      .join(" · ");
    return {
      source: "carousel",
      visualDirection:
        visualDirection || brief.contentSummary || brief.topic || "reference carousel",
      motionSummary:
        brief.motionHints || "carousel slide pacing — one beat per reference slide",
      layoutFamily: brief.layoutStyle || brief.contentType || "carousel ad",
      beats: slides.map((slide) => ({
        index: slide.index,
        sceneSummary: slide.sceneSummary || brief.contentSummary || brief.topic,
        layoutStyle: slide.layoutStyle || brief.layoutStyle || "carousel slide",
        motionHint: slide.composition || brief.motionHints || "match slide layout",
        subjects: slide.stagingPose || "",
        colorPalette: slide.colorPalette || brief.colorPalette,
        mood: slide.mood || brief.mood,
      })),
    };
  }

  const visualDirection = [
    brief.colorPalette,
    brief.mood,
    brief.typographyStyle,
    brief.contentType || brief.topic,
  ]
    .filter(Boolean)
    .join(" · ");
  return {
    source: "single",
    visualDirection:
      visualDirection || brief.contentSummary || brief.topic || "reference cover",
    motionSummary:
      brief.motionHints || "subtle motion preserving reference layout",
    layoutFamily: brief.layoutStyle || brief.contentType || "reference cover layout",
    beats: [
      {
        index: 1,
        sceneSummary: brief.contentSummary || brief.topic || "reference cover",
        layoutStyle: brief.layoutStyle || "cover layout",
        motionHint: brief.motionHints || "hold layout, subtle drift",
        subjects: brief.subjects || "",
        colorPalette: brief.colorPalette,
        mood: brief.mood,
      },
    ],
  };
}

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

/** Remove prior REFERENCE BEAT shells so re-pin is idempotent (no stacked prefixes). */
export function stripReferenceBeatShells(
  plan: VideoStoryboardPlan,
): VideoStoryboardPlan {
  return {
    ...plan,
    scenes: plan.scenes.map((scene) => {
      const raw = scene.imagePrompt?.trim() ?? "";
      if (!raw) return scene;
      const cleaned = raw
        .split(/\s*\|\s*/)
        .map((part) => part.trim())
        .filter((part) => part && !/^REFERENCE BEAT\b/i.test(part))
        .join(" | ");
      return { ...scene, imagePrompt: cleaned };
    }),
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
    lookBible: lookBibleFromImageAnalysis(analysis, plan.lookBible),
    productionNotes:
      plan.productionNotes ||
      `Style locked to reference ${analysis.source}: ${lockedVisual.slice(0, 120)}`,
    scenes,
  };
}

/** Always re-pin like reel generate — strip old shells first so prompts stay clean. */
export function refreshStoryboardPlanImageReferencePin(
  plan: VideoStoryboardPlan,
  analysis: ResearchImageReferenceAnalysis,
  userTopic: string,
): VideoStoryboardPlan {
  return pinStoryboardPlanToImageReference(
    stripReferenceBeatShells(plan),
    analysis,
    userTopic,
  );
}
