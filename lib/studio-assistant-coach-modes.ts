import type { CoachTaskKind } from "@/lib/studio-assistant-coach-profile";
import type { StudioAssistantSnapshot } from "@/lib/studio-assistant-types";
import {
  isConceptCinematicStyle,
  isCreativeVideoStyle,
  isStoryboardVideoStyle,
} from "@/lib/visual-styles";
import { isCoachTaskAcked } from "@/lib/studio-assistant-coach-progress";
import { isCoachTaskComplete } from "@/lib/studio-assistant-coach-completion";

export type StudioCoachMode =
  | "landing"
  | "physical-image-post"
  | "physical-reference-ad"
  | "physical-combined"
  | "physical-storyboard"
  | "concept-8s-reel"
  | "concept-cinematic-stitch"
  | "concept-website-image"
  | "concept-brand"
  | "concept-service"
  | "concept-creative-video"
  | "concept-storyboard"
  | "captions"
  | "pro-canvas";

export function detectStudioCoachMode(snapshot: StudioAssistantSnapshot): StudioCoachMode {
  if (snapshot.surface !== "studio") return "landing";
  if (snapshot.promotionMode === "physical") {
    if (snapshot.imageCreativeMode === "reference-concept") return "physical-reference-ad";
    if (isStoryboardVideoStyle(snapshot.visualStyleId)) return "physical-storyboard";
    if (snapshot.workflowMode === "image-only") return "physical-image-post";
    return "physical-combined";
  }
  if (snapshot.visualStyleId === "website-launch" && snapshot.workflowMode === "image-only") {
    return "concept-website-image";
  }
  if (isStoryboardVideoStyle(snapshot.visualStyleId)) {
    return "concept-storyboard";
  }
  if (isConceptCinematicStyle(snapshot.visualStyleId)) {
    return snapshot.cinematicSceneCount > 1 ? "concept-cinematic-stitch" : "concept-8s-reel";
  }
  if (isCreativeVideoStyle(snapshot.visualStyleId)) return "concept-creative-video";
  if (snapshot.visualStyleId === "service-promo") return "concept-service";
  if (
    snapshot.visualStyleId === "brand-fit" ||
    snapshot.visualStyleId === "brand-campaign" ||
    snapshot.visualStyleId === "brand-video"
  ) {
    return "concept-brand";
  }
  return "concept-8s-reel";
}

export function conceptSetupSequence(snapshot: StudioAssistantSnapshot): CoachTaskKind[] {
  const style = snapshot.visualStyleId;
  const seq: CoachTaskKind[] = [];

  if (
    isConceptCinematicStyle(style) ||
    style === "service-promo" ||
    isCreativeVideoStyle(style) ||
    snapshot.workflowMode !== "image-only"
  ) {
    seq.push("fill-concept");
  }

  if (
    style === "website-launch" ||
    style === "brand-fit" ||
    style === "brand-campaign" ||
    isConceptCinematicStyle(style)
  ) {
    seq.push("enter-brand-url");
  }

  if (
    style === "brand-fit" ||
    style === "brand-campaign" ||
    isConceptCinematicStyle(style)
  ) {
    seq.push("analyze-brand");
  }

  seq.push("continue-setup");
  return seq;
}

export function storyboardSetupSequence(): CoachTaskKind[] {
  return [
    "fill-product-name",
    "fill-storyboard-brief",
    "upload-product-photo",
    "continue-setup",
  ];
}

export function conceptStoryboardSetupSequence(snapshot: StudioAssistantSnapshot): CoachTaskKind[] {
  const seq: CoachTaskKind[] = [];
  if (!snapshot.conceptIdea.trim() && !snapshot.headline.trim()) {
    seq.push("fill-concept");
  }
  seq.push("continue-setup");
  return seq;
}

export function physicalImagePostSetupSequence(): CoachTaskKind[] {
  return [
    "fill-product-name",
    "choose-visual-style",
    "choose-image-output",
    "upload-product-photo",
    "continue-setup",
  ];
}

export function referenceAdSetupSequence(): CoachTaskKind[] {
  return [
    "fill-product-name",
    "choose-image-output",
    "continue-setup",
  ];
}

export function physicalCombinedSetupSequence(): CoachTaskKind[] {
  return [
    "fill-product-name",
    "choose-visual-style",
    "upload-product-photo",
    "continue-setup",
  ];
}

export function setupSequenceForMode(
  mode: StudioCoachMode,
  snapshot: StudioAssistantSnapshot,
): CoachTaskKind[] {
  switch (mode) {
    case "physical-image-post":
      return physicalImagePostSetupSequence();
    case "physical-reference-ad":
      return referenceAdSetupSequence();
    case "physical-combined":
      return physicalCombinedSetupSequence();
    case "physical-storyboard":
      return storyboardSetupSequence();
    case "concept-website-image":
    case "concept-8s-reel":
    case "concept-cinematic-stitch":
    case "concept-brand":
    case "concept-service":
    case "concept-creative-video":
      return conceptSetupSequence(snapshot);
    case "concept-storyboard":
      return conceptStoryboardSetupSequence(snapshot);
    default:
      return [];
  }
}

function taskStillNeeded(task: CoachTaskKind, snapshot: StudioAssistantSnapshot): boolean {
  if (task === "continue-setup") return snapshot.stepKey === "setup";
  if (task === "choose-visual-style" || task === "choose-image-output") {
    return !isCoachTaskAcked(task, snapshot.coachAck);
  }
  return !isCoachTaskComplete(task, snapshot);
}

export function nextTaskFromSequence(
  sequence: CoachTaskKind[],
  snapshot: StudioAssistantSnapshot,
): CoachTaskKind | null {
  for (const task of sequence) {
    if (taskStillNeeded(task, snapshot)) return task;
  }
  return null;
}

export function coachStepNumber(
  task: CoachTaskKind,
  snapshot: StudioAssistantSnapshot,
): number | null {
  if (task.startsWith("route-")) return 1;
  const mode = detectStudioCoachMode(snapshot);
  const seq = setupSequenceForMode(mode, snapshot);
  const idx = seq.indexOf(task);
  return idx >= 0 ? idx + 1 : null;
}

export function coachStepPrefix(
  task: CoachTaskKind,
  snapshot: StudioAssistantSnapshot,
  en: boolean,
): string {
  const n = coachStepNumber(task, snapshot);
  if (n === null) return en ? "Step" : "呢步";
  if (n === 1) return en ? "Step 1" : "第一步";
  return en ? `Step ${n}` : `第${n}步`;
}
