import type {
  StudioAssistantActionContext,
  StudioAssistantActionId,
} from "@/lib/studio-assistant-types";
import type { StudioWizardValue } from "@/hooks/useStudioWizard";
import { markAssistantReopenAfterNavigate } from "@/lib/studio-assistant-chat-storage";
import {
  inferProductFromMessage,
  inferSellingPointsFromMessage,
  isPhysicalProductRequest,
  wantsImageOnlyPost,
} from "@/lib/studio-assistant-product-intent";
import { isReferenceAdRequest } from "@/lib/studio-assistant-reference-intent";
import type { StudioAssistantHandoffRecipe } from "@/lib/studio-assistant-handoff";
import { writeStudioAssistantHandoff } from "@/lib/studio-assistant-handoff";
import { studioHref } from "@/lib/promotion-mode";

function campaignFields(context: StudioAssistantActionContext, url?: string) {
  const campaign = context.campaignMessage?.trim();
  if (campaign && isPhysicalProductRequest(campaign)) {
    const product = inferProductFromMessage(campaign);
    const sellingPoints = inferSellingPointsFromMessage(campaign);
    return {
      ...(product ? { product } : {}),
      ...(sellingPoints ? { promptExtra: sellingPoints } : {}),
    };
  }
  if (campaign) {
    return {
      campaignGoal: campaign,
      conceptIdea: campaign,
      creativeVideoBrief: campaign,
    };
  }
  if (url) {
    return {
      conceptIdea: `Promote: ${url}`,
      creativeVideoBrief: `Website promo: ${url}`,
    };
  }
  return {};
}

function goStudio(
  mode: "physical" | "concept",
  context: StudioAssistantActionContext,
  handoff: Parameters<typeof writeStudioAssistantHandoff>[0],
): boolean {
  writeStudioAssistantHandoff(handoff);
  markAssistantReopenAfterNavigate();
  const path = studioHref(mode);
  if (context.navigate) {
    context.navigate(path);
    return true;
  }
  if (typeof window !== "undefined") {
    window.location.href = path;
  }
  return true;
}

function physicalHandoffRecipe(context: StudioAssistantActionContext): StudioAssistantHandoffRecipe {
  const msg = context.campaignMessage ?? "";
  if (isReferenceAdRequest(msg)) {
    return "reference-ad-layout";
  }
  if (wantsImageOnlyPost(msg)) return "physical-image-post";
  if (/storyboard|分鏡|分镜/i.test(msg)) return "physical-storyboard";
  return "physical-quick";
}

export function runStudioAssistantAction(
  actionId: StudioAssistantActionId,
  wizard: StudioWizardValue | null,
  context: StudioAssistantActionContext,
): boolean {
  const url = context.websiteUrl?.trim();
  const onStudio = context.surface === "studio" && wizard;
  const fields = campaignFields(context, url);

  switch (actionId) {
    case "open-concept-studio":
      return goStudio("concept", context, {
        promotionMode: "concept",
        brandWebsiteUrl: url,
        ...fields,
        assistantNote: "concept",
      });

    case "open-physical-studio": {
      const recipe = physicalHandoffRecipe(context);
      if (!onStudio) {
        return goStudio("physical", context, {
          promotionMode: "physical",
          recipe,
          workflowMode: recipe === "physical-image-post" || recipe === "reference-ad-layout" ? "image-only" : undefined,
          ...fields,
          assistantNote: "physical",
        });
      }
      wizard!.onWorkflowModeChange(
        recipe === "physical-image-post" || recipe === "reference-ad-layout"
          ? "image-only"
          : "combined",
      );
      if (recipe === "physical-image-post") {
        wizard!.selectVisualStyle("product");
      } else if (recipe === "reference-ad-layout") {
        wizard!.selectVisualStyle("product");
        wizard!.setImageCreativeMode("reference-concept");
      } else if (recipe === "physical-storyboard") {
        wizard!.applyPrimaryPath("storyboard");
      } else {
        wizard!.applyPrimaryPath("quick");
      }
      if ("product" in fields && fields.product) wizard!.setProduct(fields.product);
      wizard!.setStepKey("setup");
      wizard!.setError(null);
      return true;
    }

    case "open-reference-ad-studio":
      if (!onStudio) {
        return goStudio("physical", context, {
          promotionMode: "physical",
          recipe: "reference-ad-layout",
          workflowMode: "image-only",
          ...fields,
          assistantNote: "reference-ad",
        });
      }
      wizard!.onWorkflowModeChange("image-only");
      wizard!.selectVisualStyle("product");
      wizard!.setImageCreativeMode("reference-concept");
      if ("product" in fields && fields.product) wizard!.setProduct(fields.product);
      wizard!.setStepKey("setup");
      wizard!.setError(null);
      return true;

    case "open-storyboard-studio":
      return goStudio("physical", context, {
        promotionMode: "physical",
        recipe: "physical-storyboard",
        ...fields,
      });

    case "setup-website-reel": {
      const handoff = {
        promotionMode: "concept" as const,
        recipe: "8s-website-reel" as const,
        brandWebsiteUrl: url,
        ...fields,
        analyzeBrand: false,
      };
      if (!onStudio) {
        return goStudio("concept", context, handoff);
      }
      wizard!.applyQuickTest8sRecipe();
      if (url) wizard!.setBrandWebsiteUrl(url);
      if (fields.conceptIdea) wizard!.setConceptIdea(fields.conceptIdea);
      if (fields.creativeVideoBrief) wizard!.setCreativeVideoBrief(fields.creativeVideoBrief);
      wizard!.setStepKey("setup");
      wizard!.setError(null);
      return true;
    }

    case "analyze-brand": {
      if (!onStudio) {
        return goStudio("concept", context, {
          promotionMode: "concept",
          brandWebsiteUrl: url,
          ...fields,
          analyzeBrand: true,
        });
      }
      if (url) wizard!.setBrandWebsiteUrl(url);
      if (fields.conceptIdea) wizard!.setConceptIdea(fields.conceptIdea);
      wizard!.setStepKey("setup");
      wizard!.setError(null);
      return true;
    }

    case "apply-8s-recipe":
      if (!onStudio) {
        return goStudio("concept", context, {
          promotionMode: "concept",
          recipe: "8s-website-reel",
          brandWebsiteUrl: url,
          ...fields,
        });
      }
      wizard!.applyQuickTest8sRecipe();
      wizard!.setError(null);
      return true;

    case "apply-cinematic-stitch":
      if (!onStudio) {
        return goStudio("concept", context, {
          promotionMode: "concept",
          recipe: "cinematic-stitch",
          brandWebsiteUrl: url,
          ...fields,
        });
      }
      wizard!.applyCinematicStitchRecipe();
      wizard!.setError(null);
      return true;

    case "concept-cinematic":
      if (!onStudio) {
        return goStudio("concept", context, {
          promotionMode: "concept",
          recipe: "concept-cinematic",
          ...fields,
        });
      }
      wizard!.applyPrimaryPathConceptVideo("cinematic");
      wizard!.setError(null);
      return true;

    case "website-launch-image":
      if (!onStudio) {
        return goStudio("concept", context, {
          promotionMode: "concept",
          recipe: "website-launch-image",
          brandWebsiteUrl: url,
          ...fields,
        });
      }
      wizard!.onWorkflowModeChange("image-only");
      wizard!.applyPrimaryPathConcept("website");
      wizard!.setError(null);
      return true;

    case "open-captions":
      markAssistantReopenAfterNavigate();
      if (context.navigate) {
        context.navigate("/captions");
      } else if (typeof window !== "undefined") {
        window.location.href = "/captions";
      }
      return true;

    default:
      return false;
  }
}

export function parseStudioAssistantActionId(
  href: string,
): StudioAssistantActionId | null {
  if (!href.startsWith("studio-action:")) return null;
  const id = href.slice("studio-action:".length) as StudioAssistantActionId;
  const allowed: StudioAssistantActionId[] = [
    "apply-8s-recipe",
    "apply-cinematic-stitch",
    "concept-cinematic",
    "website-launch-image",
    "open-captions",
    "setup-website-reel",
    "analyze-brand",
    "open-concept-studio",
    "open-physical-studio",
    "open-reference-ad-studio",
    "open-storyboard-studio",
  ];
  return allowed.includes(id) ? id : null;
}

export function actionNeedsBrandAnalyze(actionId: StudioAssistantActionId): boolean {
  return actionId === "analyze-brand";
}

export function actionClosesPanel(actionId: StudioAssistantActionId): boolean {
  return false;
}

export function actionNavigatesAway(actionId: StudioAssistantActionId): boolean {
  return (
    actionId === "open-concept-studio" ||
    actionId === "open-physical-studio" ||
    actionId === "open-reference-ad-studio" ||
    actionId === "open-storyboard-studio" ||
    actionId === "open-captions" ||
    actionId === "setup-website-reel" ||
    actionId === "analyze-brand"
  );
}
