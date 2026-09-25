import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  creationPathPhaseIndex,
  generateWaitPhaseIndex,
  imageReviewPhaseIndex,
  promoteSubjectPhaseIndex,
  setupContentPhaseIndex,
  videoReviewPhaseIndex,
  videoSetupPhaseIndex,
} from "../lib/studio-phases";

describe("studio phase indices (1-based eyebrow = index + 1)", () => {
  it("early rails match STEP 1 / STEP 2 eyebrows", () => {
    assert.equal(promoteSubjectPhaseIndex() + 1, 1);
    assert.equal(creationPathPhaseIndex() + 1, 2);
  });

  it("image / storyboard / video-only generate wait is step 4", () => {
    assert.equal(generateWaitPhaseIndex("image-only", "image") + 1, 4);
    assert.equal(generateWaitPhaseIndex("combined", "image") + 1, 4);
    assert.equal(generateWaitPhaseIndex("combined", "storyboard") + 1, 4);
    assert.equal(generateWaitPhaseIndex("video-only", "video") + 1, 4);
  });

  it("combined video generate wait is step 5", () => {
    assert.equal(generateWaitPhaseIndex("combined", "video") + 1, 5);
  });

  it("setup / review indices stay aligned with the rail", () => {
    assert.equal(setupContentPhaseIndex() + 1, 3);
    assert.equal(videoSetupPhaseIndex("combined") + 1, 4);
    assert.equal(videoSetupPhaseIndex("video-only") + 1, 3);
    assert.equal(imageReviewPhaseIndex("image-only") + 1, 5);
    assert.equal(imageReviewPhaseIndex("combined") + 1, 4);
    assert.equal(videoReviewPhaseIndex() + 1, 5);
  });
});
