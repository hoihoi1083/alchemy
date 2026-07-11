import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCampaignSlideImagePrompt,
  buildPromptVariables,
  resolveImagePromptMode,
} from "../lib/prompt-variables";
import { resolveReferenceStrategy } from "../lib/reference-strategy";

describe("campaign style-only reference prompts", () => {
  it("campaign + style ref only → style-only strategy", () => {
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

  it("buildCampaignSlideImagePrompt includes style-only block when referenceImageMode is style-only", () => {
    const vars = buildPromptVariables({
      product: "手串",
      business: "泰享珠寶",
      headline: "手串佩戴有講究",
      subline: "戴對才能顯品味",
      offer: "",
      market: "hk",
      framing: "auto",
      extra: "USER REFERENCE (match content + style): cream background, symmetrical layout",
      artStyle: "realistic",
    });
    const mode = resolveImagePromptMode("product", "promo-ai", {
      promotionMode: "concept",
      workflowMode: "image-only",
    });
    const prompt = buildCampaignSlideImagePrompt(
      vars,
      {
        role: "hero",
        title: "主打",
        headline: "手串佩戴有講究",
        subline: "",
        composition: "Hero — symmetrical infographic layout",
      },
      { theme: "手串文化", visualDna: "cream bg, black/red type" },
      mode,
      null,
      0,
      3,
      false,
      { referenceImageMode: "style-only" },
    );
    assert.match(prompt, /STYLE-ONLY REFERENCE/i);
    assert.match(prompt, /手串佩戴有講究/);
    assert.doesNotMatch(prompt, /IMAGE 1 IS MANDATORY.*hero subject/s);
  });
});
