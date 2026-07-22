import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isVideoOutputPathLocked,
  resolveVideoOutputPresentation,
} from "../lib/video-output-presentation";

const base = {
  workflowMode: "video-only" as const,
  usesCompositor: false,
  isStoryboardOutput: false,
  isUgcPresenterOutput: false,
  shouldCinematicStitch: false,
  isConceptCinematicSingleOutput: false,
  usesProductAssistant: false,
  conceptTextVideoReady: false,
  videoCreativeMode: "product-promo" as const,
  useReferenceVideo: false,
  hasReferenceAd: false,
};

describe("resolveVideoOutputPresentation", () => {
  it("returns null for image-only workflow", () => {
    assert.equal(
      resolveVideoOutputPresentation({ ...base, workflowMode: "image-only" }),
      null,
    );
  });

  it("storyboard visual style", () => {
    assert.equal(
      resolveVideoOutputPresentation({ ...base, isStoryboardOutput: true }),
      "storyboard-reel",
    );
  });

  it("ugc presenter visual style", () => {
    assert.equal(
      resolveVideoOutputPresentation({ ...base, isUgcPresenterOutput: true }),
      "digital-presenter",
    );
  });

  it("combined + storyboard resolves to storyboard-reel not animate-keyframe", () => {
    assert.equal(
      resolveVideoOutputPresentation({
        workflowMode: "combined",
        usesCompositor: false,
        isStoryboardOutput: true,
        isUgcPresenterOutput: false,
        shouldCinematicStitch: false,
        isConceptCinematicSingleOutput: false,
        usesProductAssistant: false,
        conceptTextVideoReady: false,
        videoCreativeMode: "image-to-video",
        useReferenceVideo: false,
        hasReferenceAd: false,
      }),
      "storyboard-reel",
    );
  });

  it("combined without storyboard flag is animate keyframe", () => {
    assert.equal(
      resolveVideoOutputPresentation({
        ...base,
        workflowMode: "combined",
        videoCreativeMode: "image-to-video",
      }),
      "animate-keyframe",
    );
  });

  it("reference MP4 mode", () => {
    assert.equal(
      resolveVideoOutputPresentation({
        ...base,
        videoCreativeMode: "reference-concept",
        useReferenceVideo: true,
        hasReferenceAd: true,
      }),
      "reference-motion",
    );
  });

  it("locks storyboard path", () => {
    assert.equal(isVideoOutputPathLocked("storyboard-reel"), true);
    assert.equal(isVideoOutputPathLocked("animate-keyframe"), false);
  });
});
