import type { ImageAspectRatio } from "@/lib/image-aspect-ratio";
import type { ImageUploadWarning } from "@/lib/image-upload-quality";
import type { WorkflowMode } from "@/lib/workflow-mode";

export type ImagePostflight = {
  width: number;
  height: number;
  aspectRatio: ImageAspectRatio;
  warnings: ImageUploadWarning[];
  /** Heuristic: sharp enough and tall enough for Seedance keyframe. */
  safeForVideo: boolean;
  analyzedAt: string;
};

const MIN_VIDEO_EDGE = 768;

export function computeSafeForVideoKeyframe(opts: {
  width: number;
  height: number;
  aspectRatio: ImageAspectRatio;
  workflowMode: WorkflowMode;
  warnings: ImageUploadWarning[];
}): boolean {
  const minEdge = Math.min(opts.width, opts.height);
  if (opts.warnings.includes("very-small")) return false;
  if (minEdge < MIN_VIDEO_EDGE) return false;
  if (opts.workflowMode === "image-only") return true;
  return opts.aspectRatio === "9:16";
}

export function buildImagePostflight(opts: {
  width: number;
  height: number;
  aspectRatio: ImageAspectRatio;
  workflowMode: WorkflowMode;
  warnings: ImageUploadWarning[];
}): ImagePostflight {
  return {
    width: opts.width,
    height: opts.height,
    aspectRatio: opts.aspectRatio,
    warnings: opts.warnings,
    safeForVideo: computeSafeForVideoKeyframe(opts),
    analyzedAt: new Date().toISOString(),
  };
}
