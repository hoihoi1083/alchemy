import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveReferenceStrategy } from "../lib/reference-strategy";

describe("reference-strategy for content research flows", () => {
  it("teaching carousel + style ref only → style-only (physical)", () => {
    const s = resolveReferenceStrategy({
      promotionMode: "physical",
      imageOutputMode: "teaching-carousel",
      visualStyleId: "product",
      imageCreativeMode: "reference-concept",
      hasReferenceUpload: true,
      hasProductPhoto: false,
      hasReferenceBrief: true,
    });
    assert.equal(s.kind, "style-only");
    assert.equal(s.layers.contentLane, "replace");
    assert.equal(s.useDualImage, false);
    assert.equal(s.sendPixelsToFal, true);
  });

  it("teaching carousel + product + ref → layout-transfer", () => {
    const s = resolveReferenceStrategy({
      promotionMode: "physical",
      imageOutputMode: "teaching-carousel",
      visualStyleId: "product",
      imageCreativeMode: "reference-concept",
      hasReferenceUpload: true,
      hasProductPhoto: true,
      hasReferenceBrief: true,
    });
    assert.equal(s.kind, "layout-transfer");
    assert.equal(s.useDualImage, true);
  });

  it("single image reference-concept without product → style-only", () => {
    const s = resolveReferenceStrategy({
      promotionMode: "physical",
      imageOutputMode: "single",
      visualStyleId: "product",
      imageCreativeMode: "reference-concept",
      hasReferenceUpload: true,
      hasProductPhoto: false,
      hasReferenceBrief: false,
    });
    assert.equal(s.kind, "style-only");
    assert.equal(s.useDualImage, false);
  });

  it("storyboard-video + ref + product → layout-transfer", () => {
    const s = resolveReferenceStrategy({
      promotionMode: "physical",
      imageOutputMode: "single",
      visualStyleId: "storyboard-video",
      workflowMode: "video-only",
      imageCreativeMode: "reference-concept",
      hasReferenceUpload: true,
      hasProductPhoto: true,
      hasReferenceBrief: true,
    });
    assert.equal(s.kind, "layout-transfer");
    assert.equal(s.useDualImage, true);
    assert.equal(s.useReferenceConceptPrompts, true);
  });

  it("reel / video path with ref only is style-only or mood", () => {
    const s = resolveReferenceStrategy({
      promotionMode: "physical",
      imageOutputMode: "single",
      visualStyleId: "storyboard-video",
      workflowMode: "video-only",
      imageCreativeMode: "reference-concept",
      hasReferenceUpload: true,
      hasProductPhoto: false,
      hasReferenceBrief: false,
    });
    assert.ok(s.kind === "style-only" || s.kind === "mood-only");
  });

  it("campaign + style ref only → style-only (concept)", () => {
    const s = resolveReferenceStrategy({
      promotionMode: "concept",
      imageOutputMode: "campaign",
      visualStyleId: "product",
      imageCreativeMode: "reference-concept",
      hasReferenceUpload: true,
      hasProductPhoto: false,
      hasReferenceBrief: true,
    });
    assert.equal(s.kind, "style-only");
    assert.equal(s.referenceImageMode, "style-only");
    assert.equal(s.sendPixelsToFal, true);
  });
});
