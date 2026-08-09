import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildContentAngleHandoff } from "../lib/content-research-apply";
import { resolveVideoGenerationKind } from "../lib/video-generation-path";
import { visualStyleAllowedForPromotion } from "../lib/promotion-styles";
import { isVisualStyleAllowedForWorkflow } from "../lib/visual-styles";
import { reelAngle, xhsPlan } from "./fixtures/content-research";

describe("content research reel routing", () => {
  it("physical combined uses storyboard; video-only uses product direct R2V", () => {
    const combined = buildContentAngleHandoff(
      reelAngle,
      xhsPlan,
      "physical",
      "Crystal bracelet",
      "combined",
    );
    const videoOnly = buildContentAngleHandoff(
      reelAngle,
      xhsPlan,
      "physical",
      "Crystal bracelet",
      "video-only",
    );
    assert.equal(combined.visualStyleId, "storyboard-video");
    assert.equal(combined.workflowMode, "combined");
    assert.equal(videoOnly.visualStyleId, "product");
    assert.equal(videoOnly.workflowMode, "video-only");
  });

  it("concept combined uses storyboard; video-only uses direct R2V", () => {
    const combined = buildContentAngleHandoff(reelAngle, xhsPlan, "concept", undefined, "combined");
    const videoOnly = buildContentAngleHandoff(reelAngle, xhsPlan, "concept", undefined, "video-only");
    assert.equal(combined.visualStyleId, "storyboard-video");
    assert.equal(combined.workflowMode, "combined");
    assert.equal(videoOnly.visualStyleId, "creative-video");
    assert.equal(videoOnly.workflowMode, "video-only");
    assert.equal(combined.product, undefined);
  });

  it("storyboard-video is allowed in concept mode and video-only workflow", () => {
    assert.equal(visualStyleAllowedForPromotion("storyboard-video", "concept"), true);
    assert.equal(isVisualStyleAllowedForWorkflow("storyboard-video", "video-only"), true);
  });

  it("storyboard generation kind when physical combined + storyboard style", () => {
    assert.equal(
      resolveVideoGenerationKind({
        usesCompositor: false,
        isStoryboardOutput: true,
        isUgcPresenterOutput: false,
        shouldCinematicStitch: false,
        isConceptCinematicSingleOutput: false,
        cinematicSceneCount: 0,
        cinematicScenesLength: 0,
        usesProductAssistant: false,
        conceptTextVideoReady: false,
        videoCreativeMode: "reference-concept",
        useReferenceVideo: true,
        hasReferenceAd: true,
        useMultiAngleVideo: false,
      }),
      "storyboard",
    );
  });

  it("video-only research reel uses reference-r2v with product photo + MP4", () => {
    assert.equal(
      resolveVideoGenerationKind({
        usesCompositor: false,
        isStoryboardOutput: false,
        isUgcPresenterOutput: false,
        shouldCinematicStitch: false,
        isConceptCinematicSingleOutput: false,
        cinematicSceneCount: 0,
        cinematicScenesLength: 0,
        usesProductAssistant: false,
        conceptTextVideoReady: false,
        videoCreativeMode: "reference-concept",
        useReferenceVideo: true,
        hasReferenceAd: true,
        useMultiAngleVideo: false,
      }),
      "reference-r2v",
    );
  });
});
