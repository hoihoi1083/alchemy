import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { styleReferencePromptBlock } from "../lib/content-research-promote";
import {
  overrideBriefForContentResearch,
  userReferenceStyleOnlyPromptBlock,
  type UserReferenceBrief,
} from "../lib/user-reference-brief";
import { PROMOTE_PRODUCT, xhsPlan, zodiacCarouselAngle } from "./fixtures/content-research";

const visionBrief: UserReferenceBrief = {
  topic: "水瓶座幸運色",
  contentSummary: "星座水晶攻略",
  visibleText: "水瓶座最旺顏色",
  subjects: "星座插畫",
  contentType: "social-carousel",
  layoutStyle: "soft blue grid",
  colorPalette: "blue pastel",
  typographyStyle: "rounded sans",
  mood: "calm",
  motionHints: "",
};

describe("user-reference-brief content research override", () => {
  it("overrideBriefForContentResearch replaces vision topic with product", () => {
    const overridden = overrideBriefForContentResearch(visionBrief, {
      product: PROMOTE_PRODUCT,
      headline: `${PROMOTE_PRODUCT}｜必看攻略`,
      subline: "8-slide carousel about product",
    });
    assert.equal(overridden.topic, PROMOTE_PRODUCT);
    assert.equal(overridden.visibleText, "");
    assert.ok(overridden.subjects.includes("DO NOT reproduce"));
    assert.ok(!overridden.contentSummary.includes("水瓶座"));
  });

  it("style-only block uses product topic after override", () => {
    const promptExtra = styleReferencePromptBlock(
      zodiacCarouselAngle,
      xhsPlan,
      PROMOTE_PRODUCT,
    );
    const overridden = overrideBriefForContentResearch(visionBrief, {
      product: PROMOTE_PRODUCT,
      headline: `${PROMOTE_PRODUCT}｜必看攻略`,
    });
    const block = userReferenceStyleOnlyPromptBlock(overridden);
    assert.ok(block.includes(PROMOTE_PRODUCT));
    assert.ok(!block.includes("水瓶座幸運色"));
    assert.ok(promptExtra.includes("Do NOT copy reference subject matter"));
  });
});
