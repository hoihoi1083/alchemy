import type { ResearchReelAnalysis } from "@/lib/reel-analysis-types";
import type { UserReferenceBrief } from "@/lib/user-reference-brief";
import type { VideoStoryboardPlan } from "@/lib/video-storyboard-types";

/** Structured brief from analyzed reference MP4 — flows to Nano Banana + planners. */
export function briefFromReelAnalysis(
  analysis: ResearchReelAnalysis,
  userInputs?: { headline?: string; conceptIdea?: string; subline?: string },
): UserReferenceBrief {
  const layoutStyles = analysis.shots
    .map((s) => s.layoutStyle)
    .filter(Boolean)
    .join(" · ");
  const subjectHints = analysis.shots
    .map((s) => s.subjects)
    .filter(Boolean)
    .join("; ");
  const shotSummaries = analysis.shots
    .map((s) => `Beat ${s.index}: ${s.sceneSummary}`)
    .filter(Boolean)
    .join(" | ");

  return {
    topic: analysis.visualDirection || "reference reel",
    contentSummary: shotSummaries,
    visibleText: "",
    subjects: subjectHints
      ? `Reference subjects (DO NOT reproduce — style only): ${subjectHints}`
      : "",
    contentType: "reference-reel-video",
    layoutStyle: layoutStyles || analysis.shots[0]?.layoutStyle || "",
    colorPalette: analysis.visualDirection,
    typographyStyle: analysis.shots.map((s) => s.visibleText).filter(Boolean).join(" ") || "",
    mood: analysis.visualDirection,
    motionHints: analysis.motionSummary,
    userConceptIdea: userInputs?.conceptIdea?.trim() || undefined,
    userHeadline: userInputs?.headline?.trim() || undefined,
    userSubline: userInputs?.subline?.trim() || undefined,
  };
}

/** Lock storyboard plan aesthetic to analyzed reference reel — user topic in copy only. */
export function pinStoryboardPlanToReelAnalysis(
  plan: VideoStoryboardPlan,
  analysis: ResearchReelAnalysis,
  userTopic: string,
): VideoStoryboardPlan {
  const lockedVisual =
    analysis.visualDirection.trim() ||
    plan.visualDirection.trim() ||
    analysis.shots
      .map((s) => `${s.layoutStyle}: ${s.sceneSummary}`)
      .filter(Boolean)
      .join(" · ");

  const scenes = plan.scenes.map((scene, i) => {
    const shot =
      analysis.shots[i] ??
      analysis.shots[Math.min(i, analysis.shots.length - 1)];
    const beatRef = shot
      ? [
          `REFERENCE BEAT ${shot.index} (style shell — do NOT copy subjects):`,
          `layout=${shot.layoutStyle || "match reference frame"}`,
          `motion=${shot.motionHint || analysis.motionSummary}`,
          `reference-look=${analysis.visualDirection || shot.sceneSummary}`,
          "Keep render medium + layout grammar from IMAGE 1 / reference reel — NOT generic travel infographic unless reference is.",
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
      analysis.productionNotesZh ||
      `Style locked to reference reel: ${lockedVisual.slice(0, 120)}`,
    scenes,
  };
}

export function sanitizeStoryboardSeedancePrompt(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  if (/^https?:\/\//i.test(trimmed) && !/@Image/i.test(trimmed)) {
    return "";
  }
  return trimmed.replace(/https?:\/\/\S+/gi, "").trim();
}
