import type { CoachTaskKind } from "@/lib/studio-assistant-coach-profile";

/** DOM ids — use data-coach-id on wizard controls */
export const COACH_TARGET = {
  landingAction: "coach-landing-action",
  brandWebsite: "coach-brand-website",
  analyzeBrand: "coach-analyze-brand",
  conceptIdea: "coach-concept-idea",
  productName: "coach-product-name",
  visualStylePaths: "coach-visual-style-paths",
  imageOutputMode: "coach-image-output-mode",
  headline: "coach-headline",
  business: "coach-business",
  storyboardBrief: "coach-storyboard-brief",
  creativeVideoBrief: "coach-creative-video-brief",
  productPhoto: "coach-product-photo",
  styleReference: "coach-style-reference",
  continueSetup: "coach-continue-setup",
  generateImage: "coach-generate-image",
  continueImage: "coach-continue-image",
  adPack: "coach-ad-pack",
  generateVideo: "coach-generate-video",
} as const;

export type CoachTargetId = (typeof COACH_TARGET)[keyof typeof COACH_TARGET];

export function coachTaskToTargetId(task: CoachTaskKind): CoachTargetId | null {
  switch (task) {
    case "route-website-reel":
    case "route-website-image":
    case "route-cinematic-stitch":
    case "route-physical-product":
    case "route-physical-image-post":
    case "route-reference-ad":
    case "route-storyboard":
    case "route-concept-studio":
    case "route-captions":
      return COACH_TARGET.landingAction;
    case "fill-product-name":
      return COACH_TARGET.productName;
    case "choose-visual-style":
      return COACH_TARGET.visualStylePaths;
    case "choose-image-output":
      return COACH_TARGET.imageOutputMode;
    case "enter-brand-url":
      return COACH_TARGET.brandWebsite;
    case "analyze-brand":
    case "analyze-brand-before-image":
      return COACH_TARGET.analyzeBrand;
    case "fill-concept":
      return COACH_TARGET.conceptIdea;
    case "fill-headline":
      return COACH_TARGET.headline;
    case "fill-business":
      return COACH_TARGET.business;
    case "fill-storyboard-brief":
      return COACH_TARGET.storyboardBrief;
    case "fill-creative-video-brief":
      return COACH_TARGET.creativeVideoBrief;
    case "upload-product-photo":
      return COACH_TARGET.productPhoto;
    case "upload-style-reference":
      return COACH_TARGET.styleReference;
    case "continue-setup":
      return COACH_TARGET.continueSetup;
    case "generate-image":
    case "generate-cinematic-keyframe":
    case "generate-cinematic-scenes":
    case "generate-storyboard-scenes":
      return COACH_TARGET.generateImage;
    case "continue-image":
      return COACH_TARGET.continueImage;
    case "plan-ad-pack":
      return COACH_TARGET.adPack;
    case "generate-video":
    case "generate-storyboard-video":
    case "generate-cinematic-video":
    case "generate-creative-video":
      return COACH_TARGET.generateVideo;
    default:
      return null;
  }
}

export function shouldShowSpotlight(task: CoachTaskKind): boolean {
  return coachTaskToTargetId(task) !== null;
}
