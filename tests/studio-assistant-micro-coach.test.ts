import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getNextStudioCoachTask,
  microOutputGoalPending,
  pathLabel,
} from "../lib/studio-assistant-coach-profile";
import { initialCoachTaskAfterHandoff } from "../lib/studio-assistant-handoff-coach";
import type { StudioAssistantSnapshot } from "../lib/studio-assistant-types";

function studioSnapshot(
  partial: Partial<StudioAssistantSnapshot>,
): StudioAssistantSnapshot {
  return {
    surface: "studio",
    promotionMode: "concept",
    workflowMode: "image-only",
    stepKey: "setup",
    visualStyleId: "brand-fit",
    promptMarket: "hk",
    product: "",
    business: "",
    headline: "",
    subline: "",
    offer: "",
    conceptIdea: "AI marketing tool",
    creativeVideoBrief: "",
    brandWebsiteUrl: "",
    hasBrandProfile: false,
    hasProductPhoto: false,
    hasKeyframe: false,
    hasStoryboardScenes: false,
    hasVideo: false,
    cinematicSceneCount: 1,
    cinematicScenesCount: 0,
    storyboardBrief: "",
    usesCompositor: false,
    error: null,
    voiceoverEnabled: false,
    captionBurnEnabled: false,
    ...partial,
  };
}

describe("studio-assistant micro coach", () => {
  it("detects pending output-goal pick on micro step 2", () => {
    const snap = studioSnapshot({
      microStepId: "route.output_goal",
      microCtxWorkflowMode: null,
    });
    assert.equal(microOutputGoalPending(snap), true);
    assert.equal(getNextStudioCoachTask(snap), "choose-workflow-mode");
    assert.match(pathLabel(snap, false), /pick image, video, or both/i);
  });

  it("does not ask for brand URL while still on output-goal picker", () => {
    const snap = studioSnapshot({
      microStepId: "route.output_goal",
      microCtxWorkflowMode: null,
    });
    assert.notEqual(getNextStudioCoachTask(snap), "enter-brand-url");
  });

  it("continues after user picks a workflow card on micro step 2", () => {
    const snap = studioSnapshot({
      microStepId: "route.output_goal",
      microCtxWorkflowMode: "combined",
      workflowMode: "image-only",
    });
    assert.equal(microOutputGoalPending(snap), false);
    assert.equal(getNextStudioCoachTask(snap), "continue-setup");
  });

  it("opens concept studio for video ad with choose-workflow when no preset", () => {
    const task = initialCoachTaskAfterHandoff({
      promotionMode: "concept",
      campaignGoal: "video ad for my AI marketing tool",
      conceptIdea: "video ad for my AI marketing tool",
    });
    assert.equal(task, "choose-workflow-mode");
  });

  it("skips output picker when handoff preselects combined for video intent", () => {
    const task = initialCoachTaskAfterHandoff({
      promotionMode: "concept",
      workflowMode: "combined",
      campaignGoal: "video ad for my AI marketing tool",
      conceptIdea: "video ad for my AI marketing tool",
    });
    assert.notEqual(task, "choose-workflow-mode");
  });
});
