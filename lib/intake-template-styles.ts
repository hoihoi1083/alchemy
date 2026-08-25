/**
 * Step 4 Template tab options — "template" means the style the user wants.
 * Video / combined → shot recipes (Quick Ad, Blockbuster, H3 paths…).
 * Image-only → look styles, excluding paper-layout + storyboard-video.
 */

import { videoModePreviewSrc } from "@/lib/creative-workflow";
import {
  h3ShotRecipeToSubpath,
} from "@/lib/h3-shot-recipes";
import { h3ShotModesForPromotion } from "@/lib/recipe-path-ux";
import type { PromotionMode } from "@/lib/promotion-mode";
import {
  getVisualStyle,
  visualStylesForWorkflow,
  type VisualStyleId,
} from "@/lib/visual-styles";
import type { VideoSubpath } from "@/lib/wizard-micro-steps.types";
import type { WorkflowMode } from "@/lib/workflow-mode";

/** Look styles that must not appear as Step 4 "Template" cards. */
export const INTAKE_TEMPLATE_EXCLUDED_VISUAL_STYLES = new Set<VisualStyleId>([
  "paper-layout",
  "storyboard-video",
]);

export type IntakeTemplateCard = {
  id: string;
  titleKey?: string;
  title: string;
  description: string;
  previewSrc: string;
  kind: "visual" | "video";
  visualStyleId?: VisualStyleId;
  videoSubpath?: VideoSubpath;
};

export type IntakeTemplateCopy = {
  pathQuickTitle: string;
  pathQuickVideoDesc: string;
  pathReferenceVideoTitle: string;
  pathReferenceVideoDesc: string;
  sceneReelTitle: string;
  sceneReelDesc: string;
  videoCreativeModes: Record<string, { title: string; description: string }>;
  visualStyles: Record<
    string,
    { title?: string; name?: string; description?: string }
  >;
};

export function intakeShowsVideoRecipes(workflowMode: WorkflowMode): boolean {
  return workflowMode === "video-only" || workflowMode === "combined";
}

export function intakeImageVisualStyleIds(
  workflowMode: WorkflowMode,
  promotionMode: PromotionMode,
): VisualStyleId[] {
  return visualStylesForWorkflow(workflowMode, promotionMode)
    .map((s) => s.id)
    .filter((id) => !INTAKE_TEMPLATE_EXCLUDED_VISUAL_STYLES.has(id));
}

/** Product video recipe cards — same set as PreVideoSetupPanel productStyleOptions. */
export function buildProductVideoTemplateCards(
  copy: IntakeTemplateCopy,
): IntakeTemplateCard[] {
  const modes = copy.videoCreativeModes;
  const cards: IntakeTemplateCard[] = [
    {
      id: "product_promo",
      kind: "video",
      videoSubpath: "product_promo",
      title: copy.pathQuickTitle,
      description: copy.pathQuickVideoDesc,
      previewSrc: videoModePreviewSrc("product-promo"),
    },
    {
      id: "motion_poster",
      kind: "video",
      videoSubpath: "motion_poster",
      title: modes["motion-poster"].title,
      description: modes["motion-poster"].description,
      previewSrc: videoModePreviewSrc("motion-poster"),
    },
    {
      id: "blockbuster",
      kind: "video",
      videoSubpath: "blockbuster",
      title: modes.blockbuster.title,
      description: modes.blockbuster.description,
      previewSrc: videoModePreviewSrc("blockbuster"),
    },
    {
      id: "vacuum_inflate",
      kind: "video",
      videoSubpath: "vacuum_inflate",
      title: modes["vacuum-inflate"].title,
      description: modes["vacuum-inflate"].description,
      previewSrc: videoModePreviewSrc("vacuum-inflate"),
    },
    {
      id: "creative_motion",
      kind: "video",
      videoSubpath: "creative_motion",
      title: modes["creative-motion"].title,
      description: modes["creative-motion"].description,
      previewSrc: videoModePreviewSrc("creative-motion"),
    },
    {
      id: "hand_throw_scene",
      kind: "video",
      videoSubpath: "hand_throw_scene",
      title: modes["hand-throw-scene"].title,
      description: modes["hand-throw-scene"].description,
      previewSrc: videoModePreviewSrc("hand-throw-scene"),
    },
    {
      id: "product_explode",
      kind: "video",
      videoSubpath: "product_explode",
      title: modes["product-explode"].title,
      description: modes["product-explode"].description,
      previewSrc: videoModePreviewSrc("product-explode"),
    },
  ];

  for (const mode of h3ShotModesForPromotion("physical")) {
    const sub = h3ShotRecipeToSubpath(mode);
    cards.push({
      id: sub,
      kind: "video",
      videoSubpath: sub,
      title: modes[mode].title,
      description: modes[mode].description,
      previewSrc: videoModePreviewSrc(mode),
    });
  }

  cards.push(
    {
      id: "social_drip",
      kind: "video",
      videoSubpath: "social_drip",
      title: modes["social-drip"].title,
      description: modes["social-drip"].description,
      previewSrc: videoModePreviewSrc("social-drip"),
    },
    {
      id: "reference_reel",
      kind: "video",
      videoSubpath: "reference_reel",
      title: copy.pathReferenceVideoTitle,
      description: copy.pathReferenceVideoDesc,
      previewSrc: videoModePreviewSrc("reference-concept"),
    },
  );

  return cards;
}

/** Concept video recipe cards — same set as PreVideoSetupPanel conceptStyleOptions. */
export function buildConceptVideoTemplateCards(
  copy: IntakeTemplateCopy,
): IntakeTemplateCard[] {
  const modes = copy.videoCreativeModes;
  const cards: IntakeTemplateCard[] = [
    {
      id: "creative_video",
      kind: "video",
      videoSubpath: "creative_video",
      title: copy.sceneReelTitle,
      description: copy.sceneReelDesc,
      previewSrc: getVisualStyle("creative-video").previewSrc,
    },
    {
      id: "motion_poster",
      kind: "video",
      videoSubpath: "motion_poster",
      title: modes["motion-poster"].title,
      description: modes["motion-poster"].description,
      previewSrc: videoModePreviewSrc("motion-poster"),
    },
    {
      id: "blockbuster",
      kind: "video",
      videoSubpath: "blockbuster",
      title: modes.blockbuster.title,
      description: modes.blockbuster.description,
      previewSrc: videoModePreviewSrc("blockbuster"),
    },
    {
      id: "vacuum_inflate",
      kind: "video",
      videoSubpath: "vacuum_inflate",
      title: modes["vacuum-inflate"].title,
      description: modes["vacuum-inflate"].description,
      previewSrc: videoModePreviewSrc("vacuum-inflate"),
    },
    {
      id: "creative_motion",
      kind: "video",
      videoSubpath: "creative_motion",
      title: modes["creative-motion"].title,
      description: modes["creative-motion"].description,
      previewSrc: videoModePreviewSrc("creative-motion"),
    },
    {
      id: "hand_throw_scene",
      kind: "video",
      videoSubpath: "hand_throw_scene",
      title: modes["hand-throw-scene"].title,
      description: modes["hand-throw-scene"].description,
      previewSrc: videoModePreviewSrc("hand-throw-scene"),
    },
    {
      id: "product_explode",
      kind: "video",
      videoSubpath: "product_explode",
      title: modes["product-explode"].title,
      description: modes["product-explode"].description,
      previewSrc: videoModePreviewSrc("product-explode"),
    },
  ];

  for (const mode of h3ShotModesForPromotion("concept")) {
    const sub = h3ShotRecipeToSubpath(mode);
    cards.push({
      id: sub,
      kind: "video",
      videoSubpath: sub,
      title: modes[mode].title,
      description: modes[mode].description,
      previewSrc: videoModePreviewSrc(mode),
    });
  }

  cards.push({
    id: "social_drip",
    kind: "video",
    videoSubpath: "social_drip",
    title: modes["social-drip"].title,
    description: modes["social-drip"].description,
    previewSrc: videoModePreviewSrc("social-drip"),
  });

  return cards;
}

export function buildIntakeTemplateCards(input: {
  workflowMode: WorkflowMode;
  isConcept: boolean;
  copy: IntakeTemplateCopy;
}): IntakeTemplateCard[] {
  const { workflowMode, isConcept, copy } = input;
  if (intakeShowsVideoRecipes(workflowMode)) {
    return isConcept
      ? buildConceptVideoTemplateCards(copy)
      : buildProductVideoTemplateCards(copy);
  }

  const promotionMode = isConcept ? "concept" : "physical";
  return intakeImageVisualStyleIds(workflowMode, promotionMode).map((id) => {
    const label = copy.visualStyles[id];
    const def = getVisualStyle(id);
    return {
      id,
      kind: "visual" as const,
      visualStyleId: id,
      title: label?.title ?? label?.name ?? id,
      description: label?.description ?? "",
      previewSrc: def.previewSrc,
    };
  });
}
