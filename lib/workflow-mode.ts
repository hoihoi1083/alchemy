export type WorkflowMode = "image-only" | "video-only" | "combined";

export const WORKFLOW_MODES: WorkflowMode[] = ["image-only", "video-only", "combined"];

export type WorkflowStepKey = "setup" | "image" | "video" | "done";

export function stepsForMode(mode: WorkflowMode): WorkflowStepKey[] {
  switch (mode) {
    case "image-only":
      return ["setup", "image", "done"];
    case "video-only":
      return ["setup", "video", "done"];
    case "combined":
      return ["setup", "image", "video", "done"];
  }
}

export function stepNumberForKey(mode: WorkflowMode, key: WorkflowStepKey): number {
  return stepsForMode(mode).indexOf(key) + 1;
}
