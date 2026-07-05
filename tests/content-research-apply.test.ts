import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildContentAngleHandoff } from "../lib/content-research-apply";
import { isContentResearchStyleExtra } from "../lib/content-research-promote";
import {
  PROMOTE_PRODUCT,
  SEARCH_TOPIC,
  reelAngle,
  xhsPlan,
  zodiacCarouselAngle,
} from "./fixtures/content-research";

describe("content-research-apply handoff", () => {
  it("image carousel handoff uses product not search topic", () => {
    const handoff = buildContentAngleHandoff(
      zodiacCarouselAngle,
      xhsPlan,
      "physical",
      PROMOTE_PRODUCT,
    );
    assert.equal(handoff.product, PROMOTE_PRODUCT);
    assert.ok(handoff.headline?.includes(PROMOTE_PRODUCT));
    assert.ok(!handoff.headline?.includes("水瓶座"));
    assert.equal(handoff.imageOutputMode, "teaching-carousel");
    assert.equal(handoff.workflowMode, "image-only");
    assert.ok(handoff.referencePostImageUrls?.length === 8);
    assert.ok(isContentResearchStyleExtra(handoff.promptExtra));
    assert.ok(handoff.promptExtra?.includes(PROMOTE_PRODUCT));
    assert.ok(!handoff.promptExtra?.includes("Slide1:"));
  });

  it("video reel handoff sets video workflow and reference MP4", () => {
    const plan = { ...xhsPlan, topic: "水晶手串" };
    const handoff = buildContentAngleHandoff(reelAngle, plan, "physical", PROMOTE_PRODUCT);
    assert.equal(handoff.workflowMode, "video-only");
    assert.equal(handoff.referencePostVideoUrl, reelAngle.sourceVideoUrl);
    assert.equal(handoff.product, PROMOTE_PRODUCT);
    assert.ok(handoff.promptExtra?.includes("Do NOT copy reference subject matter"));
  });

  it("without promote product falls back to search topic", () => {
    const handoff = buildContentAngleHandoff(zodiacCarouselAngle, xhsPlan, "physical");
    assert.equal(handoff.product, SEARCH_TOPIC);
  });

  it("campaign theme is product-centric when angle format is campaign", () => {
    const campaignAngle = {
      ...zodiacCarouselAngle,
      id: "campaign-1",
      format: "campaign" as const,
      formatLabel: "Campaign",
      sourceUrl: undefined,
      sourceImageUrls: undefined,
      sourceCoverImageUrl: undefined,
    };
    const handoff = buildContentAngleHandoff(
      campaignAngle,
      xhsPlan,
      "physical",
      PROMOTE_PRODUCT,
    );
    assert.equal(handoff.campaignTheme, `${PROMOTE_PRODUCT} series`);
    assert.equal(handoff.imageOutputMode, "campaign");
  });
});
