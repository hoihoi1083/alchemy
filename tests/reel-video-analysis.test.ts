import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { researchReelAnalysisPromptBlock } from "../lib/reel-analysis-types";
import { buildResearchReelAdaptPromptForTest } from "../lib/reel-video-analysis";

describe("reel video analysis prompts", () => {
  it("adapt prompt references analyzed frames not cover only", () => {
    const prompt = buildResearchReelAdaptPromptForTest({
      product: "马达加斯加粉水晶手链",
      headline: "粉晶魅力",
      subline: "天然能量",
      offer: "",
      promptExtra: "Style reference (小紅書)",
      market: "hk",
      sourceDurationSec: 180,
      referenceClipSec: 15,
      outputDurationSec: 6,
      digestMontage: true,
      frames: [
        {
          index: 1,
          timeSec: 1.5,
          sceneSummary: "Hands hold bracelets up",
          layoutStyle: "centered hero with top text band",
          motionHint: "static then slight wrist tilt",
          subjects: "woman hands jewelry",
          visibleText: "水晶手串",
        },
        {
          index: 2,
          timeSec: 4,
          sceneSummary: "Macro bead detail",
          layoutStyle: "full bleed close-up",
          motionHint: "slow push-in",
          subjects: "crystal beads",
          visibleText: "",
        },
      ],
    });
    assert.match(prompt, /Analyzed frames/i);
    assert.match(prompt, /Hands hold bracelets/i);
    assert.match(prompt, /seedancePrompt/i);
    assert.match(prompt, /COMPLETE standalone ad/i);
    assert.match(prompt, /DIGEST MONTAGE/i);
    assert.match(prompt, /180s source/i);
  });

  it("prompt block marks research reel analysis source", () => {
    const block = researchReelAnalysisPromptBlock({
      durationSec: 8,
      frameCount: 4,
      shots: [
        {
          index: 1,
          timeSec: 1,
          sceneSummary: "Hook",
          layoutStyle: "text band",
          motionHint: "cut",
          subjects: "hands",
          visibleText: "",
        },
      ],
      visualDirection: "High-energy product reel",
      motionSummary: "Fast cuts every 2s",
      seedancePrompt: "Scene 1: hard cut @Video1 opening",
      productionNotesZh: "跟參考片節奏",
    });
    assert.match(block, /RESEARCH REEL ANALYSIS/i);
    assert.match(block, /Fast cuts every 2s/);
  });
});
