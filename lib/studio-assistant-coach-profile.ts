import type { StudioAssistantIntent } from "@/lib/studio-assistant-intent";
import { isPhysicalProductRequest, wantsImageOnlyPost } from "@/lib/studio-assistant-product-intent";
import { isCoachTaskAcked } from "@/lib/studio-assistant-coach-progress";
import {
  detectStudioCoachMode,
  nextTaskFromSequence,
  setupSequenceForMode,
} from "@/lib/studio-assistant-coach-modes";
import type { StudioAssistantSnapshot } from "@/lib/studio-assistant-types";
import { isSlotRequired, setupSlotsFor } from "@/lib/template-slots";
import type { TemplateSlotId } from "@/lib/template-slots";
import {
  getVisualStyle,
  isBrandVideoStyle,
  isBrandVisualStyle,
  isConceptCinematicStyle,
  isCreativeVideoStyle,
  isStoryboardVideoStyle,
  requiresBrandProfileForImages,
} from "@/lib/visual-styles";

export type CoachTaskKind =
  | "route-website-reel"
  | "route-website-image"
  | "route-cinematic-stitch"
  | "route-physical-product"
  | "route-physical-image-post"
  | "route-reference-ad"
  | "route-storyboard"
  | "route-concept-studio"
  | "route-captions"
  | "route-pro-canvas"
  | "fix-error"
  | "enter-brand-url"
  | "fill-product-name"
  | "fill-business"
  | "fill-headline"
  | "fill-subline"
  | "fill-offer"
  | "fill-concept"
  | "fill-storyboard-brief"
  | "fill-creative-video-brief"
  | "choose-visual-style"
  | "choose-image-output"
  | "upload-product-photo"
  | "upload-style-reference"
  | "upload-concept-reference-photo"
  | "analyze-brand"
  | "analyze-concept-ai"
  | "continue-setup"
  | "analyze-brand-before-image"
  | "generate-cinematic-keyframe"
  | "generate-cinematic-scenes"
  | "generate-storyboard-scenes"
  | "generate-image"
  | "continue-image"
  | "plan-ad-pack"
  | "generate-storyboard-video"
  | "generate-cinematic-video"
  | "generate-creative-video"
  | "generate-video"
  | "done-download";

export function isCinematicStitch(snapshot: StudioAssistantSnapshot): boolean {
  return isConceptCinematicStyle(snapshot.visualStyleId) && snapshot.cinematicSceneCount > 1;
}

export function isCinematicSingle(snapshot: StudioAssistantSnapshot): boolean {
  return isConceptCinematicStyle(snapshot.visualStyleId) && snapshot.cinematicSceneCount === 1;
}

export function brandWebsiteRecommended(snapshot: StudioAssistantSnapshot): boolean {
  const id = snapshot.visualStyleId;
  return (
    isBrandVisualStyle(id) ||
    id === "website-launch" ||
    id === "service-promo" ||
    Boolean(snapshot.brandWebsiteUrl.trim())
  );
}

function slotEmpty(snapshot: StudioAssistantSnapshot, slot: TemplateSlotId): boolean {
  switch (slot) {
    case "product":
      return !snapshot.product.trim();
    case "headline":
      return !snapshot.headline.trim();
    case "subline":
      return !snapshot.subline.trim();
    case "business":
      return !snapshot.business.trim();
    case "offer":
      return !snapshot.offer.trim();
    case "productPhoto":
      return !snapshot.hasProductPhoto;
    default:
      return false;
  }
}

function firstMissingSetupSlot(
  snapshot: StudioAssistantSnapshot,
  slotIds: TemplateSlotId[],
): TemplateSlotId | null {
  const templateId = getVisualStyle(snapshot.visualStyleId).templateId;
  for (const slot of slotIds) {
    if (!setupSlotsFor(templateId).some((s) => s.id === slot)) continue;
    if (isSlotRequired(templateId, slot) && slotEmpty(snapshot, slot)) {
      return slot;
    }
  }
  return null;
}

function slotToTask(slot: TemplateSlotId): CoachTaskKind {
  switch (slot) {
    case "product":
      return "fill-product-name";
    case "headline":
      return "fill-headline";
    case "subline":
      return "fill-subline";
    case "business":
      return "fill-business";
    case "offer":
      return "fill-offer";
    default:
      return "continue-setup";
  }
}

export function landingRoute(
  intent: StudioAssistantIntent,
  snapshot: StudioAssistantSnapshot,
  userText?: string,
): CoachTaskKind {
  const t = userText ?? "";
  if (intent === "captions_only") return "route-captions";
  if (intent === "pro_canvas") return "route-pro-canvas";
  if (/storyboard|分鏡|分镜|multi.?scene|多場|多场/i.test(t)) return "route-storyboard";
  if (intent === "reference_ad") return "route-reference-ad";
  if (intent === "physical_image_post" || (isPhysicalProductRequest(t) && wantsImageOnlyPost(t))) {
    return "route-physical-image-post";
  }
  if (intent === "physical_product" || isPhysicalProductRequest(t)) {
    return "route-physical-product";
  }
  if (intent === "website_image") return "route-website-image";
  if (/stitch|拼接|24\s*s|3\s*scene|三場|三场|longer/i.test(t)) return "route-cinematic-stitch";
  if (intent === "website_video") return "route-website-reel";
  if (snapshot.promotionMode === "physical") return "route-physical-product";
  if (snapshot.promotionMode === "concept") return "route-concept-studio";
  return "route-concept-studio";
}

export function needsBrandUrlField(
  snapshot: StudioAssistantSnapshot,
  detectedUrl?: string,
): boolean {
  if (snapshot.brandWebsiteUrl.trim()) return false;
  if (detectedUrl?.trim()) return true;
  return brandWebsiteRecommended(snapshot);
}

function nextPhysicalSetupTask(snapshot: StudioAssistantSnapshot): CoachTaskKind | null {
  const ack = (task: CoachTaskKind) => isCoachTaskAcked(task, snapshot.coachAck);
  const style = snapshot.visualStyleId;

  if (!snapshot.product.trim()) return "fill-product-name";

  if (!isStoryboardVideoStyle(style) && !ack("choose-visual-style")) {
    return "choose-visual-style";
  }

  const wantsImageGoal =
    snapshot.workflowMode === "image-only" ||
    (snapshot.workflowMode === "combined" && !isStoryboardVideoStyle(style));

  if (wantsImageGoal && !ack("choose-image-output") && snapshot.stepKey === "setup") {
    return "choose-image-output";
  }

  if (!snapshot.hasProductPhoto && !isStoryboardVideoStyle(style)) {
    return "upload-product-photo";
  }

  return null;
}

function nextSetupTask(
  snapshot: StudioAssistantSnapshot,
  detectedUrl?: string,
): CoachTaskKind {
  const style = snapshot.visualStyleId;
  const isConcept = snapshot.promotionMode === "concept";
  const isPhysical = snapshot.promotionMode === "physical";

  const mode = detectStudioCoachMode(snapshot);
  const sequenced = nextTaskFromSequence(setupSequenceForMode(mode, snapshot), snapshot);
  if (sequenced) return sequenced;

  if (isPhysical) {
    const physical = nextPhysicalSetupTask(snapshot);
    if (physical) return physical;
  }

  if (isStoryboardVideoStyle(style) && isPhysical) {
    if (!snapshot.product.trim()) return "fill-product-name";
    if (!snapshot.storyboardBrief.trim()) return "fill-storyboard-brief";
  }

  if (isStoryboardVideoStyle(style) && isConcept) {
    if (!snapshot.conceptIdea.trim() && !snapshot.headline.trim()) {
      return "fill-concept";
    }
  }

  if (isConcept) {
    const needsConceptBox =
      isConceptCinematicStyle(style) ||
      style === "service-promo" ||
      style === "creative-video" ||
      snapshot.workflowMode !== "image-only";
    if (needsConceptBox && !snapshot.conceptIdea.trim()) {
      return "fill-concept";
    }
    if (
      snapshot.workflowMode === "video-only" &&
      isCreativeVideoStyle(style) &&
      !snapshot.creativeVideoBrief.trim() &&
      !snapshot.conceptIdea.trim()
    ) {
      return "fill-creative-video-brief";
    }
  }

  if (snapshot.usesCompositor) {
    const missing = firstMissingSetupSlot(snapshot, ["headline", "product", "business", "offer"]);
    if (missing) return slotToTask(missing);
    if (!snapshot.hasProductPhoto) return "upload-product-photo";
  }

  const templateOrder: TemplateSlotId[] = ["business", "headline", "subline", "offer", "product"];
  const missingSlot = firstMissingSetupSlot(snapshot, templateOrder);
  if (missingSlot) return slotToTask(missingSlot);

  if (needsBrandUrlField(snapshot, detectedUrl)) {
    return "enter-brand-url";
  }

  if (
    snapshot.brandWebsiteUrl.trim() &&
    !snapshot.hasBrandProfile &&
    !snapshot.headline.trim() &&
    !snapshot.business.trim()
  ) {
    if (
      requiresBrandProfileForImages(style) ||
      isBrandVisualStyle(style) ||
      isConceptCinematicStyle(style)
    ) {
      return "analyze-brand";
    }
  }

  if (
    isBrandVideoStyle(style) &&
    snapshot.workflowMode !== "image-only" &&
    isPhysical &&
    snapshot.brandWebsiteUrl.trim() &&
    !snapshot.hasBrandProfile
  ) {
    return "analyze-brand";
  }

  if (isConcept && isConceptCinematicStyle(style) && snapshot.conceptIdea.trim()) {
    // optional AI plan — only nudge if nothing else missing
  }

  return "continue-setup";
}

function nextImageTask(snapshot: StudioAssistantSnapshot): CoachTaskKind {
  const style = snapshot.visualStyleId;

  if (snapshot.imageCreativeMode === "reference-concept" && snapshot.stepKey === "image") {
    if (!snapshot.hasStyleReference) return "upload-style-reference";
    if (!snapshot.hasProductPhoto && !snapshot.usesCompositor) return "upload-product-photo";
    if (!snapshot.hasKeyframe) return "generate-image";
    return "continue-image";
  }

  if (
    snapshot.promotionMode === "physical" &&
    !isStoryboardVideoStyle(style) &&
    !isCoachTaskAcked("choose-image-output", snapshot.coachAck) &&
    !snapshot.hasKeyframe
  ) {
    return "choose-image-output";
  }

  if (
    requiresBrandProfileForImages(style) &&
    !snapshot.hasBrandProfile &&
    snapshot.brandWebsiteUrl.trim()
  ) {
    return "analyze-brand-before-image";
  }

  if (isStoryboardVideoStyle(style)) {
    if (!snapshot.hasStoryboardScenes) return "generate-storyboard-scenes";
    return snapshot.hasKeyframe ? "continue-image" : "generate-storyboard-scenes";
  }

  if (isCinematicStitch(snapshot)) {
    const ready = snapshot.cinematicScenesCount >= snapshot.cinematicSceneCount;
    if (!ready) return "generate-cinematic-scenes";
    return "continue-image";
  }

  if (isCinematicSingle(snapshot)) {
    if (!snapshot.hasKeyframe && snapshot.cinematicScenesCount < 1) {
      return "generate-cinematic-keyframe";
    }
    return "continue-image";
  }

  if (!snapshot.hasProductPhoto && !snapshot.usesCompositor) {
    const photoRequired =
      isSlotRequired(getVisualStyle(style).templateId, "productPhoto") ||
      snapshot.promotionMode === "physical";
    if (photoRequired && snapshot.promotionMode === "physical") {
      return "upload-product-photo";
    }
  }

  if (!snapshot.hasKeyframe) return "generate-image";
  return "continue-image";
}

function nextVideoTask(snapshot: StudioAssistantSnapshot): CoachTaskKind {
  if (snapshot.hasVideo) return "done-download";

  const style = snapshot.visualStyleId;

  if (isStoryboardVideoStyle(style)) {
    return "generate-storyboard-video";
  }

  if (isConceptCinematicStyle(style)) {
    return snapshot.voiceoverEnabled || snapshot.captionBurnEnabled
      ? "plan-ad-pack"
      : "generate-cinematic-video";
  }

  if (isCreativeVideoStyle(style) || isBrandVideoStyle(style)) {
    if (!snapshot.creativeVideoBrief.trim() && !snapshot.conceptIdea.trim()) {
      return "fill-creative-video-brief";
    }
    return "generate-creative-video";
  }

  if (isConceptCinematicStyle(style) || snapshot.captionBurnEnabled || snapshot.voiceoverEnabled) {
    return "plan-ad-pack";
  }

  return "generate-video";
}

export function getNextStudioCoachTask(
  snapshot: StudioAssistantSnapshot,
  opts?: {
    intent?: StudioAssistantIntent;
    detectedUrl?: string;
    userText?: string;
  },
): CoachTaskKind {
  if (snapshot.error?.trim()) return "fix-error";

  if (snapshot.surface !== "studio") {
    return landingRoute(opts?.intent ?? "general", snapshot, opts?.userText);
  }

  switch (snapshot.stepKey) {
    case "setup":
      return nextSetupTask(snapshot, opts?.detectedUrl);
    case "image":
      if (snapshot.workflowMode === "image-only") {
        return snapshot.hasKeyframe ? "done-download" : nextImageTask(snapshot);
      }
      return nextImageTask(snapshot);
    case "video":
      if (snapshot.workflowMode === "video-only") {
        return nextVideoTask(snapshot);
      }
      return nextVideoTask(snapshot);
    case "done":
      return "done-download";
    default:
      return "continue-setup";
  }
}

export function pathLabel(snapshot: StudioAssistantSnapshot, isZh: boolean): string {
  const { visualStyleId: id, workflowMode: wf, promotionMode: pm } = snapshot;
  const stitch = isCinematicStitch(snapshot);
  if (isZh) {
    if (id === "storyboard-video") {
      return pm === "concept" ? "概念 · 分鏡 storyboard" : "實體產品 · 分鏡 storyboard";
    }
    if (stitch) return `概念 · 電影感拼接 ${snapshot.cinematicSceneCount}×8秒`;
    if (isCinematicSingle(snapshot)) return "概念 · 8秒電影感 Reel";
    if (id === "website-launch" && wf === "image-only") return "概念 · 網站上線靜態圖";
    if (wf === "image-only") return `概念/實體 · 只出圖 (${id})`;
    if (wf === "video-only") return `概念/實體 · 只出片 (${id})`;
    return `${pm === "concept" ? "概念" : "實體"} · 圖→片 (${id})`;
  }
  if (id === "storyboard-video") {
    return pm === "concept" ? "Concept · storyboard video" : "Physical · storyboard video";
  }
  if (stitch) return `Concept · cinematic stitch ${snapshot.cinematicSceneCount}×8s`;
  if (isCinematicSingle(snapshot)) return "Concept · 8s cinematic Reel";
  if (id === "website-launch" && wf === "image-only") return "Concept · website launch still";
  if (wf === "image-only") return `Image-only (${id})`;
  if (wf === "video-only") return `Video-only (${id})`;
  return `${pm ?? "studio"} · combined (${id})`;
}
