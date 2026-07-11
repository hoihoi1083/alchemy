export type WorkflowMode = "image-only" | "video-only" | "combined";

export const WORKFLOW_MODES: WorkflowMode[] = ["image-only", "video-only", "combined"];

export type WorkflowStepKey = "setup" | "image" | "video" | "done";

export function stepsForMode(
  mode: WorkflowMode,
  options?: { storyboardKeyframes?: boolean },
): WorkflowStepKey[] {
  switch (mode) {
    case "image-only":
      return ["setup", "image", "done"];
    case "video-only":
      return options?.storyboardKeyframes
        ? ["setup", "image", "video", "done"]
        : ["setup", "video", "done"];
    case "combined":
      return ["setup", "image", "video", "done"];
  }
}

export function stepNumberForKey(
  mode: WorkflowMode,
  key: WorkflowStepKey,
  options?: { storyboardKeyframes?: boolean },
): number {
  return stepsForMode(mode, options).indexOf(key) + 1;
}
