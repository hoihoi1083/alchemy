import type { ImageCreativeMode } from "@/lib/creative-workflow";
import type { ImageOutputMode } from "@/lib/image-output-mode";
import { isPromotionMode, type PromotionMode } from "@/lib/promotion-mode";
import type { ReferenceImageMode } from "@/lib/prompt-variables";
import { isConceptCinematicStyle, isStoryboardVideoStyle, type VisualStyleId } from "@/lib/visual-styles";
import type { WorkflowMode } from "@/lib/workflow-mode";
import type { CarouselSlideReferenceBrief } from "@/lib/user-reference-brief";
import {
  type UserReferenceBrief,
  userReferenceLayoutTransferPromptBlock,
  userReferenceStyleOnlyPromptBlock,
} from "@/lib/user-reference-brief";

/** How reference pixels + brief flow into generation. */
export type ReferenceStrategyKind =
  | "none"
  | "style-only"
  | "layout-transfer"
  | "product-clone"
  | "mood-only";

export type LayerAction = "keep" | "adapt" | "replace" | "ignore";

export type ReferenceLayerPlan = {
  layoutGrammar: LayerAction;
  visualStyle: LayerAction;
  contentLane: LayerAction;
  subjects: LayerAction;
  onImageText: LayerAction;
  moodLighting: LayerAction;
  stagingPose: LayerAction;
};

export type ReferenceStrategy = {
  kind: ReferenceStrategyKind;
  layers: ReferenceLayerPlan;
  useDualImage: boolean;
  sendPixelsToFal: boolean;
  referenceImageMode: ReferenceImageMode;
  useReferenceConceptPrompts: boolean;
};

export type ResolveReferenceStrategyInput = {
  promotionMode: PromotionMode;
  imageOutputMode: ImageOutputMode;
  visualStyleId: VisualStyleId;
  workflowMode?: WorkflowMode;
  imageCreativeMode?: ImageCreativeMode;
  /** Reference ad upload (imageRefPhoto) or analyzed brief from setup. */
  hasReferenceUpload: boolean;
  hasProductPhoto: boolean;
  hasReferenceBrief: boolean;
};

const LAYER_LABELS: Record<keyof ReferenceLayerPlan, string> = {
  layoutGrammar: "Layout",
  visualStyle: "Visual style",
  contentLane: "Topic lane",
  subjects: "Hero subject",
  onImageText: "On-image text",
  moodLighting: "Mood & lighting",
  stagingPose: "Product staging",
};

export function layerPlanLabels(): typeof LAYER_LABELS {
  return LAYER_LABELS;
}

export function resolveReferenceLayers(
  kind: ReferenceStrategyKind,
): ReferenceLayerPlan {
  switch (kind) {
    case "layout-transfer":
      return {
        layoutGrammar: "keep",
        visualStyle: "keep",
        contentLane: "replace",
        subjects: "replace",
        onImageText: "replace",
        moodLighting: "adapt",
        stagingPose: "keep",
      };
    case "style-only":
      return {
        layoutGrammar: "adapt",
        visualStyle: "keep",
        contentLane: "replace",
        subjects: "replace",
        onImageText: "replace",
        moodLighting: "adapt",
        stagingPose: "adapt",
      };
    case "mood-only":
      return {
        layoutGrammar: "ignore",
        visualStyle: "adapt",
        contentLane: "replace",
        subjects: "replace",
        onImageText: "ignore",
        moodLighting: "keep",
        stagingPose: "ignore",
      };
    case "product-clone":
      return {
        layoutGrammar: "adapt",
        visualStyle: "adapt",
        contentLane: "replace",
        subjects: "keep",
        onImageText: "replace",
        moodLighting: "adapt",
        stagingPose: "keep",
      };
    default:
      return {
        layoutGrammar: "ignore",
        visualStyle: "ignore",
        contentLane: "ignore",
        subjects: "ignore",
        onImageText: "ignore",
        moodLighting: "ignore",
        stagingPose: "ignore",
      };
  }
}

export function resolveReferenceStrategy(
  input: ResolveReferenceStrategyInput,
): ReferenceStrategy {
  const kind = pickStrategyKind(input);
  const layers = resolveReferenceLayers(kind);
  const useDualImage = kind === "layout-transfer" && input.hasReferenceUpload && input.hasProductPhoto;
  const sendPixelsToFal =
    kind === "layout-transfer"
      ? useDualImage
      : kind === "product-clone" && input.hasProductPhoto
        ? true
        : (kind === "style-only" || kind === "mood-only") && input.hasReferenceUpload;
  const referenceImageMode: ReferenceImageMode =
    kind === "style-only" || kind === "mood-only"
      ? "style-only"
      : kind === "product-clone" || kind === "layout-transfer"
        ? "clone"
        : "none";

  return {
    kind,
    layers,
    useDualImage,
    sendPixelsToFal,
    referenceImageMode,
    useReferenceConceptPrompts: kind === "layout-transfer",
  };
}

function pickStrategyKind(input: ResolveReferenceStrategyInput): ReferenceStrategyKind {
  const hasRef = input.hasReferenceUpload || input.hasReferenceBrief;

  if (isConceptCinematicStyle(input.visualStyleId)) {
    return hasRef ? "mood-only" : "none";
  }

  if (!hasRef) {
    return input.hasProductPhoto ? "product-clone" : "none";
  }

  if (input.imageOutputMode === "teaching-carousel") {
    if (input.promotionMode === "concept") return "style-only";
    if (input.hasReferenceUpload && input.hasProductPhoto) return "layout-transfer";
    return input.hasProductPhoto ? "product-clone" : "style-only";
  }

  if (
    input.imageOutputMode === "campaign" ||
    input.imageOutputMode === "single" ||
    input.imageOutputMode === "ab"
  ) {
    if (input.hasReferenceUpload && input.hasProductPhoto) return "layout-transfer";
    if (input.imageCreativeMode === "reference-concept") {
      return input.hasReferenceUpload && input.hasProductPhoto
        ? "layout-transfer"
        : "style-only";
    }
    if (input.hasReferenceUpload && !input.hasProductPhoto) return "style-only";
    return input.hasProductPhoto ? "product-clone" : "style-only";
  }

  if (isStoryboardVideoStyle(input.visualStyleId)) {
    if (input.hasReferenceUpload && input.hasProductPhoto) return "layout-transfer";
    if (input.imageCreativeMode === "reference-concept" && input.hasReferenceUpload) {
      return input.hasProductPhoto ? "layout-transfer" : "style-only";
    }
    if (input.hasReferenceUpload || input.hasReferenceBrief) return "style-only";
    return input.hasProductPhoto ? "product-clone" : "none";
  }

  return "style-only";
}

export function referenceStrategyPromptBlock(
  brief: UserReferenceBrief | null | undefined,
  strategy: ReferenceStrategy,
): string {
  if (!brief) return "";
  if (strategy.kind === "layout-transfer") {
    return userReferenceLayoutTransferPromptBlock(brief, strategy.layers);
  }
  if (strategy.kind === "style-only" || strategy.kind === "mood-only") {
    return userReferenceStyleOnlyPromptBlock(brief);
  }
  return "";
}

export function parseReferenceBriefJson(raw: string | null | undefined): UserReferenceBrief | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<UserReferenceBrief>;
    if (!parsed || typeof parsed !== "object") return null;
    return {
      topic: String(parsed.topic ?? "").trim(),
      contentSummary: String(parsed.contentSummary ?? "").trim(),
      visibleText: String(parsed.visibleText ?? "").trim(),
      subjects: String(parsed.subjects ?? "").trim(),
      contentType: String(parsed.contentType ?? "").trim(),
      layoutStyle: String(parsed.layoutStyle ?? "").trim(),
      colorPalette: String(parsed.colorPalette ?? "").trim(),
      typographyStyle: String(parsed.typographyStyle ?? "").trim(),
      mood: String(parsed.mood ?? "").trim(),
      motionHints: String(parsed.motionHints ?? "").trim(),
      userConceptIdea: parsed.userConceptIdea?.trim() || undefined,
      userHeadline: parsed.userHeadline?.trim() || undefined,
      userSubline: parsed.userSubline?.trim() || undefined,
      carouselSlideCount:
        typeof parsed.carouselSlideCount === "number" && parsed.carouselSlideCount > 0
          ? parsed.carouselSlideCount
          : undefined,
      carouselSlides: Array.isArray(parsed.carouselSlides)
        ? parsed.carouselSlides
            .map((raw, i) => {
              const s = raw as Partial<CarouselSlideReferenceBrief>;
              return {
                index: Math.max(1, Number(s.index) || i + 1),
                sceneSummary: String(s.sceneSummary ?? "").trim(),
                layoutStyle: String(s.layoutStyle ?? "").trim(),
                colorPalette: String(s.colorPalette ?? "").trim(),
                typographyStyle: String(s.typographyStyle ?? "").trim(),
                mood: String(s.mood ?? "").trim(),
                composition: String(s.composition ?? "").trim(),
                stagingPose: String(s.stagingPose ?? "").trim(),
              };
            })
            .filter((s) => s.layoutStyle || s.composition || s.sceneSummary)
        : undefined,
    };
  } catch {
    return null;
  }
}

export function referenceStrategyUiSummary(
  strategy: ReferenceStrategy,
): { borrow: (keyof ReferenceLayerPlan)[]; replace: (keyof ReferenceLayerPlan)[] } {
  const borrow: (keyof ReferenceLayerPlan)[] = [];
  const replace: (keyof ReferenceLayerPlan)[] = [];
  for (const key of Object.keys(strategy.layers) as (keyof ReferenceLayerPlan)[]) {
    const action = strategy.layers[key];
    if (action === "keep" || action === "adapt") borrow.push(key);
    if (action === "replace" || action === "ignore") replace.push(key);
  }
  return { borrow, replace };
}

export function resolveStrategyFromFormData(input: {
  promotionMode: PromotionMode;
  imageOutputMode: ImageOutputMode;
  visualStyleId: VisualStyleId;
  imageCreativeMode?: ImageCreativeMode;
  hasStyleRef: boolean;
  hasProductRef: boolean;
  referenceBrief?: UserReferenceBrief | null;
}): ReferenceStrategy {
  return resolveReferenceStrategy({
    promotionMode: input.promotionMode,
    imageOutputMode: input.imageOutputMode,
    visualStyleId: input.visualStyleId,
    imageCreativeMode: input.imageCreativeMode,
    hasReferenceUpload: input.hasStyleRef,
    hasProductPhoto: input.hasProductRef,
    hasReferenceBrief: Boolean(input.referenceBrief),
  });
}

export function parseStrategyFromFormData(formData: FormData): {
  strategy: ReferenceStrategy;
  brief: UserReferenceBrief | null;
} {
  const promotionModeRaw = String(formData.get("promotion_mode") ?? "physical").trim();
  const promotionMode = isPromotionMode(promotionModeRaw) ? promotionModeRaw : "physical";
  const imageOutputMode = (String(formData.get("image_output_mode") ?? "single").trim() ||
    "single") as ImageOutputMode;
  const visualStyleId = (String(formData.get("visual_style") ?? "product").trim() ||
    "product") as VisualStyleId;
  const imageCreativeMode = (String(formData.get("image_creative_mode") ?? "promo-ai").trim() ||
    "promo-ai") as ImageCreativeMode;
  const styleRef = formData.get("style_reference_image");
  const productRef = formData.get("reference_image");
  const hasStyle = styleRef instanceof File && styleRef.size > 0;
  const hasProduct = productRef instanceof File && productRef.size > 0;
  const brief = parseReferenceBriefJson(
    (formData.get("reference_brief") as string | null)?.trim(),
  );
  return {
    strategy: resolveStrategyFromFormData({
      promotionMode,
      imageOutputMode,
      visualStyleId,
      imageCreativeMode,
      hasStyleRef: hasStyle,
      hasProductRef: hasProduct,
      referenceBrief: brief,
    }),
    brief,
  };
}
