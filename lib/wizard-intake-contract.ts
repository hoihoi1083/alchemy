/**
 * Step 3 (route.intake) UX contract:
 * Research XOR Template (with Direct = blank template).
 * Copy fields live on Step 3; Step 4 is style / size / resolution / count.
 */

import type { IntakePath } from "@/lib/wizard-micro-steps.types";
import type { ContentPlatform } from "@/lib/content-research-types";
import type { WorkflowMode } from "@/lib/workflow-mode";

/** Image research: RedNote / IG. TikTok is video-only — include when workflow needs video. */
export const RESEARCH_IMAGE_PLATFORMS: readonly ContentPlatform[] = [
  "xiaohongshu",
  "instagram",
] as const;

/** Platforms shown in research UI for the current workflow. */
export function researchUiPlatforms(
  workflowMode?: WorkflowMode | null,
): readonly ContentPlatform[] {
  if (workflowMode === "video-only" || workflowMode === "combined") {
    return [...RESEARCH_IMAGE_PLATFORMS, "tiktok"];
  }
  return RESEARCH_IMAGE_PLATFORMS;
}

/** @deprecated Prefer researchUiPlatforms(workflowMode) — kept for tests/imports. */
export const RESEARCH_UI_PLATFORMS = RESEARCH_IMAGE_PLATFORMS;

export type IntakeTabId = "research" | "template";

/** Product path fields edited on Step 3 after research or template. */
export const PRODUCT_INTAKE_COPY_FIELDS = [
  "headline",
  "subline",
  "offer",
] as const;

/** Concept assistant fields (mapped to headline/subline/offer on apply). */
export const CONCEPT_INTAKE_BRIEF_FIELDS = [
  "audience",
  "painPoint",
  "promise",
  "proof",
  "cta",
  "visualMetaphor",
] as const;

export type TemplatePickMode = "template" | "direct";

/** Map UI tab → intake path used by the micro-step graph. */
export function intakePathForTab(tab: IntakeTabId): IntakePath {
  return tab === "research" ? "research" : "direct";
}

export function intakeTabFromPath(path: IntakePath | null | undefined): IntakeTabId | null {
  if (path === "research") return "research";
  if (path === "direct") return "template";
  return null;
}

/**
 * Soft mutual exclusivity: switching tabs should clear the other path's payload.
 * Callers pass wizard clear callbacks.
 */
export type IntakePathSwitchCleanup = {
  clearResearch: () => void;
  clearTemplate: () => void;
};

export function runIntakeTabSwitch(
  next: IntakeTabId,
  cleanup: IntakePathSwitchCleanup,
): void {
  if (next === "research") {
    cleanup.clearTemplate();
  } else {
    cleanup.clearResearch();
  }
}
