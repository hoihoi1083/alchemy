/**
 * Step 4 Template tab options — "template" means the style the user wants.
 * Video-only → shot recipes (Quick Ad, Blockbuster, H3 paths…).
 * Combined (storyboard 圖+片) → narrative storyboard recipes (Classic TVC, Luxury birth).
 * Image-only → look styles (excluding paper-layout + storyboard-video card).
 */

import { videoModePreviewSrc } from "@/lib/creative-workflow";
import {
  h3ShotRecipeToSubpath,
} from "@/lib/h3-shot-recipes";
import { h3ShotModesForPromotion } from "@/lib/recipe-path-ux";
import type { PromotionMode } from "@/lib/promotion-mode";
import {
  STORYBOARD_RECIPE_IDS,
  storyboardRecipePreviewSrc,
  type StoryboardRecipeId,
} from "@/lib/storyboard-recipes";
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

/**
 * Product (physical) image Template — hide video/brand paths that belong
 * elsewhere (UGC = video; brand-fit / brand-campaign = brand-analysis flows).
 */
export const INTAKE_TEMPLATE_EXCLUDED_PHYSICAL_IMAGE = new Set<VisualStyleId>([
  "ugc-presenter",
  "brand-fit",
  "brand-campaign",
]);

export type IntakeTemplateCard = {
  id: string;
  titleKey?: string;
  title: string;
  description: string;
  previewSrc: string;
  kind: "visual" | "video" | "storyboard";
  visualStyleId?: VisualStyleId;
  videoSubpath?: VideoSubpath;
  storyboardRecipeId?: StoryboardRecipeId;
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
  storyboardRecipes: Record<string, { title: string; desc: string }>;
};

/** Shot recipes only for pure video. */
export function intakeShowsVideoRecipes(workflowMode: WorkflowMode): boolean {
  return workflowMode === "video-only";
}

/** Narrative recipes for 圖+片 / storyboard path. */
export function intakeShowsStoryboardRecipes(workflowMode: WorkflowMode): boolean {
  return workflowMode === "combined";
}

export function intakeImageVisualStyleIds(
  workflowMode: WorkflowMode,
  promotionMode: PromotionMode,
): VisualStyleId[] {
  return visualStylesForWorkflow(workflowMode, promotionMode)
    .map((s) => s.id)
    .filter((id) => !INTAKE_TEMPLATE_EXCLUDED_VISUAL_STYLES.has(id))
    .filter(
      (id) =>
        promotionMode !== "physical" ||
        !INTAKE_TEMPLATE_EXCLUDED_PHYSICAL_IMAGE.has(id),
    );
}

/** Combined Template — Classic TVC (+ Luxury birth for physical). */
export function buildStoryboardTemplateCards(
  copy: IntakeTemplateCopy,
  isConcept: boolean,
): IntakeTemplateCard[] {
  const ids = isConcept
    ? STORYBOARD_RECIPE_IDS.filter((id) => id !== "luxury-birth")
    : [...STORYBOARD_RECIPE_IDS];
  return ids.map((id) => {
    const label = copy.storyboardRecipes[id];
    return {
      id,
      kind: "storyboard" as const,
      storyboardRecipeId: id,
      title: label?.title ?? id,
      description: label?.desc ?? "",
      previewSrc: storyboardRecipePreviewSrc(id),
    };
  });
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
  if (intakeShowsStoryboardRecipes(workflowMode)) {
    return buildStoryboardTemplateCards(copy, isConcept);
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
