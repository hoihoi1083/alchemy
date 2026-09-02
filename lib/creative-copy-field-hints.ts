import { conceptCopyFieldEmphasis } from "@/lib/concept-copy-focus";
import type { VideoCreativeMode } from "@/lib/creative-workflow";
import {
  h3ShotRecipeAllowsKineticType,
  h3ShotRecipeIsTextlessFrames,
  isH3ShotRecipeMode,
  type H3ShotRecipeMode,
} from "@/lib/h3-shot-recipes";
import type { ImageOutputMode } from "@/lib/image-output-mode";
import type { ImageTextMode } from "@/lib/image-text-mode";
import type { VisualStyleId } from "@/lib/visual-styles";
import type { WorkflowMode } from "@/lib/workflow-mode";

/** How a copy field relates to what the user sees in the output. */
export type CopyFieldRole =
  | "on-image"
  | "on-end-still"
  | "ig-caption"
  | "planner-on-image"
  | "mood-only";

export type CopyFieldBadgeKind =
  | "on-image"
  | "on-video"
  | "on-end-still"
  | "ig-caption"
  | "mood-only"
  | null;

export type CreativeCopyFieldHints = {
  hook: CopyFieldRole;
  supporting: CopyFieldRole;
  offer: CopyFieldRole;
  /** Violet highlight when the field is painted onto the creative. */
  emphasize: { hook: boolean; supporting: boolean; offer: boolean };
  badge: {
    hook: CopyFieldBadgeKind;
    supporting: CopyFieldBadgeKind;
    offer: CopyFieldBadgeKind;
  };
  /** Panel hint mode for Product assistant / setup copy. */
  hintKind: "prints" | "textless-video" | "textless-image" | "end-still" | "ig-caption";
};

function roleBadge(role: CopyFieldRole): CopyFieldBadgeKind {
  switch (role) {
    case "on-image":
    case "planner-on-image":
      return "on-image";
    case "on-end-still":
      return "on-end-still";
    case "ig-caption":
      return "ig-caption";
    case "mood-only":
      return "mood-only";
    default:
      return null;
  }
}

function fromRoles(
  roles: { hook: CopyFieldRole; supporting: CopyFieldRole; offer: CopyFieldRole },
  hintKind: CreativeCopyFieldHints["hintKind"],
): CreativeCopyFieldHints {
  return {
    ...roles,
    emphasize: {
      hook: roles.hook !== "mood-only",
      supporting: roles.supporting !== "mood-only",
      offer: roles.offer !== "mood-only",
    },
    badge: {
      hook: roleBadge(roles.hook),
      supporting: roleBadge(roles.supporting),
      offer: roleBadge(roles.offer),
    },
    hintKind,
  };
}

function moodOnly(hintKind: CreativeCopyFieldHints["hintKind"]): CreativeCopyFieldHints {
  return fromRoles(
    { hook: "mood-only", supporting: "mood-only", offer: "mood-only" },
    hintKind,
  );
}

/**
 * Resolve accurate on-output indication for headline / supporting / offer.
 * Prefer this over assuming “video workflow ⇒ shows in video”.
 */
export function resolveCreativeCopyFieldHints(input: {
  workflowMode: WorkflowMode;
  visualStyleId?: VisualStyleId | null;
  videoCreativeMode?: VideoCreativeMode | string | null;
  imageTextMode?: ImageTextMode | null;
  imageOutputMode?: ImageOutputMode | null;
}): CreativeCopyFieldHints {
  const videoMode = input.videoCreativeMode ?? null;
  const isVideoWorkflow =
    input.workflowMode === "video-only" || input.workflowMode === "combined";
  const isImageWorkflow =
    input.workflowMode === "image-only" || input.workflowMode === "combined";

  // --- Video / recipe modes first (combined stills+video still need accurate video truth) ---
  if (isVideoWorkflow && videoMode) {
    if (videoMode === "motion-poster" || videoMode === "impact-poster") {
      return fromRoles(
        {
          hook: "on-end-still",
          supporting: "on-end-still",
          offer: "mood-only",
        },
        "end-still",
      );
    }
    if (videoMode === "social-drip") {
      return fromRoles(
        {
          hook: "ig-caption",
          supporting: "mood-only",
          offer: "mood-only",
        },
        "ig-caption",
      );
    }
    if (isH3ShotRecipeMode(videoMode)) {
      const mode = videoMode as H3ShotRecipeMode;
      if (h3ShotRecipeIsTextlessFrames(mode)) {
        return moodOnly("textless-video");
      }
      // Kinetic masthead may appear, but not as verbatim user fields — treat as mood.
      if (h3ShotRecipeAllowsKineticType(mode)) {
        return moodOnly("textless-video");
      }
      return moodOnly("textless-video");
    }
    if (
      videoMode === "blockbuster" ||
      videoMode === "vacuum-inflate" ||
      videoMode === "creative-motion" ||
      videoMode === "hand-throw-scene" ||
      videoMode === "product-explode" ||
      videoMode === "bullet-product-elevate" ||
      videoMode === "product-assistant" ||
      videoMode === "product-promo" ||
      videoMode === "image-to-video" ||
      videoMode === "reference-concept"
    ) {
      return moodOnly("textless-video");
    }
  }

  // --- Image / still path ---
  if (isImageWorkflow) {
    if (
      input.imageOutputMode === "campaign" ||
      input.imageOutputMode === "teaching-carousel" ||
      input.imageOutputMode === "carousel"
    ) {
      return fromRoles(
        {
          hook: "planner-on-image",
          supporting: "planner-on-image",
          offer: "planner-on-image",
        },
        "prints",
      );
    }

    if (input.imageTextMode === "textless") {
      return moodOnly("textless-image");
    }

    const emphasis = conceptCopyFieldEmphasis(input.visualStyleId);
    return fromRoles(
      {
        hook: emphasis.hook ? "on-image" : "mood-only",
        supporting: emphasis.supporting ? "on-image" : "mood-only",
        offer: emphasis.offer ? "on-image" : "mood-only",
      },
      "prints",
    );
  }

  // Video-only with unknown mode — default textless (safer than false "shows in video").
  if (isVideoWorkflow) {
    return moodOnly("textless-video");
  }

  return moodOnly("textless-image");
}
