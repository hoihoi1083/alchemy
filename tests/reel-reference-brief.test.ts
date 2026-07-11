import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ResearchReelAnalysis } from "../lib/reel-analysis-types";
import type { VideoStoryboardPlan } from "../lib/video-storyboard-types";
import {
  briefFromReelAnalysis,
  pinStoryboardPlanToReelAnalysis,
  sanitizeStoryboardSeedancePrompt,
} from "../lib/reel-reference-brief";

const sampleAnalysis: ResearchReelAnalysis = {
  durationSec: 8,
  frameCount: 2,
  visualDirection: "absurd 3D caricature meme ad, bold studio lighting",
  motionSummary: "fast punch-in cuts",
  seedancePrompt: "Scene 1 zoom",
  productionNotesZh: "跟參考片節奏",
  shots: [
    {
      index: 1,
      sceneSummary: "hero close-up caricature",
      layoutStyle: "centered hero 3D",
      motionHint: "slow zoom",
      subjects: "footballer caricature",
      visibleText: "BIG TEXT",
    },
    {
      index: 2,
      sceneSummary: "product punchline frame",
      layoutStyle: "split meme panel",
      motionHint: "hard cut",
      subjects: "abstract props",
      visibleText: "",
    },
  ],
};

const samplePlan: VideoStoryboardPlan = {
  theme: "Korea travel tips",
  visualDirection: "clean 2D infographic",
  productionNotes: "",
  totalDurationSec: 8,
  seedancePrompt: "https://xhslink.com/foo",
  scenes: [
    {
      index: 1,
      durationSec: 4,
      imagePrompt: "Seoul skyline infographic",
      onImageCopyZh: "首爾",
      motionHint: "pan",
    },
    {
      index: 2,
      durationSec: 4,
      imagePrompt: "street food icons",
      onImageCopyZh: "美食",
      motionHint: "cut",
    },
  ],
};

describe("reel-reference-brief", () => {
  it("builds style-only brief from reel analysis with user copy fields", () => {
    const brief = briefFromReelAnalysis(sampleAnalysis, {
      headline: "韓國旅遊",
      conceptIdea: "5-day Seoul",
    });
    assert.equal(brief.contentType, "reference-reel-video");
    assert.match(brief.colorPalette ?? "", /3D caricature/);
    assert.equal(brief.userHeadline, "韓國旅遊");
    assert.match(brief.subjects ?? "", /DO NOT reproduce/i);
  });

  it("pins storyboard plan visual direction to reel analysis", () => {
    const pinned = pinStoryboardPlanToReelAnalysis(
      samplePlan,
      sampleAnalysis,
      "韓國旅遊",
    );
    assert.equal(pinned.theme, "韓國旅遊");
    assert.match(pinned.visualDirection, /3D caricature/);
    assert.match(pinned.scenes[0]?.imagePrompt ?? "", /REFERENCE BEAT 1/);
    assert.match(pinned.scenes[0]?.imagePrompt ?? "", /layout=centered hero 3D/);
    assert.doesNotMatch(pinned.visualDirection, /2D infographic/);
  });

  it("strips bare URL seedance prompts", () => {
    assert.equal(sanitizeStoryboardSeedancePrompt("https://xhslink.com/o/foo"), "");
    assert.match(
      sanitizeStoryboardSeedancePrompt("@Image1 slow zoom, @Image2 cut"),
      /@Image1/,
    );
  });
});
