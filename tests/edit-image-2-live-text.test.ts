import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  LIVE_TEXT_EFFECTS,
  LIVE_TEXT_FONTS,
  liveTextEffectNeedsEffectColor,
  liveTextEffectNeedsStroke,
  liveTextKonvaEffectProps,
  normalizeLiveTextEffect,
} from "../lib/edit-image-2-live-text";

describe("edit-image-2 live text library", () => {
  it("ships a useful font catalog", () => {
    assert.ok(LIVE_TEXT_FONTS.length >= 20);
    const groups = new Set(LIVE_TEXT_FONTS.map((f) => f.group));
    assert.ok(groups.has("cjk"));
    assert.ok(groups.has("display"));
  });

  it("ships multiple effects beyond outline/shadow", () => {
    assert.ok(LIVE_TEXT_EFFECTS.length >= 7);
    const ids = LIVE_TEXT_EFFECTS.map((e) => e.id);
    assert.ok(ids.includes("glow"));
    assert.ok(ids.includes("neon"));
    assert.ok(ids.includes("hardShadow"));
  });

  it("maps legacy shadow to softShadow", () => {
    assert.equal(normalizeLiveTextEffect("shadow"), "softShadow");
  });

  it("uses independent stroke and effect colors", () => {
    const soft = liveTextKonvaEffectProps("softShadow", 40, {
      effectColor: "#ff00aa",
    });
    assert.equal(soft.shadowEnabled, true);
    assert.equal(soft.shadowColor, "#ff00aa");

    const outline = liveTextKonvaEffectProps("outline", 40, {
      strokeColor: "#00ff88",
    });
    assert.equal(outline.stroke, "#00ff88");
    assert.ok((outline.strokeWidth ?? 0) > 0);

    assert.equal(liveTextEffectNeedsStroke("neon"), true);
    assert.equal(liveTextEffectNeedsEffectColor("glow"), true);
    assert.equal(liveTextEffectNeedsStroke("softShadow"), false);
  });
});
