import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  REFERENCE_STYLE_MATCH_LINE,
  referenceStyleTransferPromptBlock,
} from "../lib/reference-style-transfer";
import { researchReelAnalysisPromptBlock } from "../lib/reel-analysis-types";
import { buildStoryboardSceneImagePrompt } from "../lib/prompt-variables";
import { buildReelStoryboardPlanPromptForTest } from "../lib/video-storyboard-plan";

describe("reference-style-transfer", () => {
  it("prompt block separates style match from content replace", () => {
    const block = referenceStyleTransferPromptBlock({
      visualDirection: "3D cartoon meme ad",
      motionSummary: "fast cuts",
    });
    assert.match(block, /MATCH reference visual style/i);
    assert.match(block, /REPLACE with user campaign/i);
    assert.match(block, /3D cartoon meme ad/);
  });

  it("reel analysis block preserves visual direction", () => {
    const block = researchReelAnalysisPromptBlock({
      durationSec: 8,
      frameCount: 3,
      shots: [],
      visualDirection: "absurd 3D caricature",
      motionSummary: "static hero zoom",
      seedancePrompt: "Scene 1",
      productionNotesZh: "",
    });
    assert.match(block, /Visual direction: absurd 3D caricature/);
    assert.ok(block.includes(REFERENCE_STYLE_MATCH_LINE));
  });

  it("reel storyboard planner locks reference aesthetic in concept mode", () => {
    const prompt = buildReelStoryboardPlanPromptForTest({
      analysis: {
        durationSec: 12,
        frameCount: 2,
        shots: [
          {
            index: 1,
            timeSec: 0,
            sceneSummary: "Cartoon hero close-up",
            layoutStyle: "center hero text overlay",
            motionHint: "push in",
            subjects: "footballer caricature",
            visibleText: "meme caption",
          },
        ],
        visualDirection: "3D meme ad, bright sky",
        motionSummary: "snappy",
        seedancePrompt: "",
        productionNotesZh: "",
      },
      product: "韓國精選",
      business: "",
      headline: "韓國精選手打",
      subline: "",
      offer: "",
      promptExtra: "",
      durationSec: 8,
      market: "hk",
      framing: "auto",
      layoutTransfer: false,
      artStyleId: "realistic",
      conceptMode: true,
    });
    assert.match(prompt, /VISUAL STYLE FAMILY/i);
    assert.match(prompt, /reference post topic is irrelevant/i);
    assert.match(prompt, /Do NOT default to generic photorealistic/i);
    assert.match(prompt, /3D meme ad, bright sky/);
  });

  it("storyboard style-ref scene prompt sends IMAGE 1 style shell language", () => {
    const prompt = buildStoryboardSceneImagePrompt(
      {
        imageIndex: 1,
        role: "hook",
        startSec: 0,
        endSec: 2,
        sceneDescriptionZh: "開場",
        onImageCopyZh: "韓國精選",
        imagePrompt: "center hero with bold text overlay",
      },
      {
        title: "t",
        theme: "韓國手作",
        visualDirection: "3D cartoon meme ad energy",
        totalDurationSec: 8,
        scenes: [],
        seedancePrompt: "",
        productionNotes: "",
      },
      {
        product: "韓國精選",
        headline: "韓國精選手打",
        market: "hk",
        framing: "auto",
        extra: "",
      },
      { storyboardStyleRef: true },
    );
    assert.match(prompt, /REFERENCE STYLE TRANSFER/i);
    assert.match(prompt, /3D cartoon meme ad energy/);
    assert.match(prompt, /韓國精選/);
    assert.match(prompt, /do NOT default to generic photorealistic/i);
  });
});
