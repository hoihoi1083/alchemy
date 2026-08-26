import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveCreativeCopyFieldHints } from "../lib/creative-copy-field-hints";

describe("resolveCreativeCopyFieldHints", () => {
  it("marks food-bullet-time and product-assistant as textless mood-only", () => {
    for (const mode of ["food-bullet-time", "product-assistant", "product-promo"] as const) {
      const hints = resolveCreativeCopyFieldHints({
        workflowMode: "video-only",
        videoCreativeMode: mode,
      });
      assert.equal(hints.hintKind, "textless-video");
      assert.equal(hints.badge.hook, "mood-only");
      assert.equal(hints.badge.supporting, "mood-only");
      assert.equal(hints.emphasize.hook, false);
    }
  });

  it("marks motion-poster hook/supporting for end still only", () => {
    const hints = resolveCreativeCopyFieldHints({
      workflowMode: "video-only",
      videoCreativeMode: "motion-poster",
    });
    assert.equal(hints.hintKind, "end-still");
    assert.equal(hints.badge.hook, "on-end-still");
    assert.equal(hints.badge.supporting, "on-end-still");
    assert.equal(hints.badge.offer, "mood-only");
    assert.equal(hints.emphasize.hook, true);
  });

  it("marks social-drip hook as IG caption", () => {
    const hints = resolveCreativeCopyFieldHints({
      workflowMode: "video-only",
      videoCreativeMode: "social-drip",
    });
    assert.equal(hints.hintKind, "ig-caption");
    assert.equal(hints.badge.hook, "ig-caption");
    assert.equal(hints.badge.supporting, "mood-only");
  });

  it("marks integrated image fields as on-image", () => {
    const hints = resolveCreativeCopyFieldHints({
      workflowMode: "image-only",
      imageTextMode: "integrated",
      visualStyleId: "product",
    });
    assert.equal(hints.hintKind, "prints");
    assert.equal(hints.badge.hook, "on-image");
    assert.equal(hints.badge.supporting, "on-image");
    assert.equal(hints.emphasize.hook, true);
  });

  it("marks textless image as mood-only", () => {
    const hints = resolveCreativeCopyFieldHints({
      workflowMode: "image-only",
      imageTextMode: "textless",
      visualStyleId: "product",
    });
    assert.equal(hints.hintKind, "textless-image");
    assert.equal(hints.badge.hook, "mood-only");
    assert.equal(hints.emphasize.hook, false);
  });

  it("marks campaign / teaching carousel as planner-on-image", () => {
    for (const mode of ["campaign", "teaching-carousel"] as const) {
      const hints = resolveCreativeCopyFieldHints({
        workflowMode: "image-only",
        imageOutputMode: mode,
        imageTextMode: "textless",
      });
      assert.equal(hints.hintKind, "prints");
      assert.equal(hints.badge.hook, "on-image");
      assert.equal(hints.emphasize.hook, true);
    }
  });

  it("does not claim video shows user copy for kinetic H3 recipes", () => {
    const hints = resolveCreativeCopyFieldHints({
      workflowMode: "video-only",
      videoCreativeMode: "h3-showreel",
    });
    assert.equal(hints.hintKind, "textless-video");
    assert.equal(hints.badge.hook, "mood-only");
  });
});
