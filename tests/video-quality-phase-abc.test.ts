import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  parseSceneMotionHintsFromPlan,
  resolveSceneMotionHint,
  sanitizeKlingMotionHint,
} from "../lib/kling-motion-from-plan";
import {
  buildResearchIdeaRemapBlock,
  mergeResearchIdeaRemapIntoPromptExtra,
  stripResearchIdeaRemapBlock,
} from "../lib/research-idea-remap";
import { klingSceneMotionPrompt } from "../lib/kling-storyboard-fallback";
import { refreshContentResearchPromptExtra } from "../lib/content-research-promote";
import type { ContentAngleCandidate } from "../lib/content-research-types";

describe("kling-motion-from-plan", () => {
  it("parses Scene N motion blocks", () => {
    const plan = [
      "9:16 product short (~8s).",
      "Scene 1 [0-2s]: hook open — slow push-in with soft parallax",
      "Scene 2 [2-5s]: product demo — gentle orbit around bottle",
      "Scene 3 [5-8s]: cta end — bold push-in on end card",
    ].join("\n");
    const hints = parseSceneMotionHintsFromPlan(plan);
    assert.match(String(hints.get(1)), /push-in/i);
    assert.match(String(hints.get(2)), /orbit/i);
    assert.match(String(hints.get(3)), /push-in/i);
  });

  it("rejects Chinese-heavy marketing as Kling motion", () => {
    assert.equal(sanitizeKlingMotionHint("限時優惠 全場八折 立即購買吧"), undefined);
  });

  it("prefers cameraMotionEn over plan", () => {
    const hint = resolveSceneMotionHint({
      sceneIndex1Based: 1,
      cameraMotionEn: "handheld drift with light sweep",
      motionPlan: "Scene 1 [0-2s]: hook — slow push-in only",
    });
    assert.match(String(hint), /handheld/i);
  });

  it("feeds DeepSeek camera into Kling prompt", () => {
    const prompt = klingSceneMotionPrompt({
      sceneIndex: 1,
      sceneCount: 3,
      role: "hook",
      cameraMotionEn: "confident slow push-in with parallax bokeh",
    });
    assert.match(prompt, /confident slow push-in with parallax bokeh/);
  });
});

describe("research-idea-remap", () => {
  it("builds remap block without copying brand", () => {
    const block = buildResearchIdeaRemapBlock({
      promotionMode: "physical",
      productOrConcept: "Alchemy sunscreen",
      referenceHook: "cream + heroine fly + punchline",
      referenceStructure: "apply → hero flight → CTA",
    });
    assert.match(block, /RESEARCH IDEA REMAP/);
    assert.match(block, /Alchemy sunscreen/);
    assert.match(block, /do NOT copy/i);
  });

  it("merges without stacking duplicate remap blocks", () => {
    const once = mergeResearchIdeaRemapIntoPromptExtra("STYLE: clean", {
      promotionMode: "concept",
      productOrConcept: "booking app",
      referenceHook: "hero fly",
    });
    const twice = mergeResearchIdeaRemapIntoPromptExtra(once, {
      promotionMode: "concept",
      productOrConcept: "booking app",
      referenceHook: "hero fly v2",
    });
    assert.equal(twice.match(/RESEARCH IDEA REMAP/g)?.length, 1);
    assert.match(stripResearchIdeaRemapBlock(twice), /STYLE: clean/);
  });

  it("refreshContentResearchPromptExtra keeps RESEARCH IDEA REMAP", () => {
    const style =
      "Style reference (小紅書) | Match reference visual style family and layout grammar. Do NOT copy reference subject matter.";
    const withRemap = mergeResearchIdeaRemapIntoPromptExtra(style, {
      promotionMode: "physical",
      productOrConcept: "Alchemy sunscreen",
      referenceHook: "cream heroine punchline",
    });
    const angle = {
      id: "post-1",
      title: "t",
      hook: "h",
      scriptOutline: "s",
      format: "reel",
      formatLabel: "Reel",
      whyItWorks: "w",
      bulletPoints: [],
      cta: "c",
      score: 1,
      sourceUrl: "https://example.com",
      sourceTitle: "ref",
    } as ContentAngleCandidate;
    const refreshed = refreshContentResearchPromptExtra(
      withRemap,
      {
        angle,
        plan: { platformLabel: "小紅書", topic: "sunscreen", market: "hk" },
      },
      "physical",
      { product: "Alchemy sunscreen", headline: "SPF50", conceptIdea: "" },
      "hk",
    );
    assert.match(refreshed, /RESEARCH IDEA REMAP/);
    assert.match(refreshed, /Alchemy sunscreen/);
    assert.match(refreshed, /Style reference/);
  });
});
