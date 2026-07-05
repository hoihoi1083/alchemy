import type { WorkflowMode } from "@/lib/workflow-mode";

/** Fal Nano Banana 2 aspect ratios supported by generate-image API. */
export type ImageAspectRatio = "9:16" | "4:5" | "1:1";

export const IMAGE_ASPECT_RATIOS: ImageAspectRatio[] = ["9:16", "4:5", "1:1"];

export function defaultImageAspectRatioForWorkflow(mode: WorkflowMode): ImageAspectRatio {
  return mode === "image-only" ? "4:5" : "9:16";
}

export function isImageAspectRatio(value: string): value is ImageAspectRatio {
  return IMAGE_ASPECT_RATIOS.includes(value as ImageAspectRatio);
}
