import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { preferDrawtextCaptionBurn } from "@/lib/pipeline/caption-burn";

describe("caption burn method preference", () => {
  it("can force drawtext via env", () => {
    const prev = process.env.CAPTION_BURN_DRAWTEXT;
    process.env.CAPTION_BURN_DRAWTEXT = "1";
    assert.equal(preferDrawtextCaptionBurn(), true);
    process.env.CAPTION_BURN_DRAWTEXT = "0";
    assert.equal(preferDrawtextCaptionBurn(), false);
    if (prev === undefined) delete process.env.CAPTION_BURN_DRAWTEXT;
    else process.env.CAPTION_BURN_DRAWTEXT = prev;
  });

  it("defaults to overlay (path-based Latin) unless forced", () => {
    const prev = process.env.CAPTION_BURN_DRAWTEXT;
    delete process.env.CAPTION_BURN_DRAWTEXT;
    assert.equal(preferDrawtextCaptionBurn(), false);
    if (prev !== undefined) process.env.CAPTION_BURN_DRAWTEXT = prev;
  });
});
