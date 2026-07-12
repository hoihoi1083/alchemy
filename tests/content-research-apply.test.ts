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

  it("concept reel video-only handoff uses direct R2V (product style)", () => {
    const handoff = buildContentAngleHandoff(reelAngle, xhsPlan, "concept", undefined, "video-only");
    assert.equal(handoff.workflowMode, "video-only");
    assert.equal(handoff.visualStyleId, "product");
    assert.equal(handoff.product, undefined);
    assert.ok(handoff.conceptIdea);
  });

  it("concept reel combined handoff uses storyboard under image-to-video", () => {
    const handoff = buildContentAngleHandoff(reelAngle, xhsPlan, "concept", undefined, "combined");
    assert.equal(handoff.workflowMode, "combined");
    assert.equal(handoff.visualStyleId, "storyboard-video");
    assert.equal(handoff.referencePostVideoUrl, reelAngle.sourceVideoUrl);
    assert.ok(handoff.conceptIdea);
  });

  it("physical reel combined handoff uses storyboard under image-to-video", () => {
    const plan = { ...xhsPlan, topic: "水晶手串" };
    const handoff = buildContentAngleHandoff(
      reelAngle,
      plan,
      "physical",
      PROMOTE_PRODUCT,
      "combined",
    );
    assert.equal(handoff.workflowMode, "combined");
    assert.equal(handoff.visualStyleId, "storyboard-video");
    assert.equal(handoff.referencePostVideoUrl, reelAngle.sourceVideoUrl);
    assert.equal(handoff.product, PROMOTE_PRODUCT);
  });

  it("physical reel video-only handoff uses direct R2V path", () => {
    const plan = { ...xhsPlan, topic: "水晶手串" };
    const handoff = buildContentAngleHandoff(
      reelAngle,
      plan,
      "physical",
      PROMOTE_PRODUCT,
      "video-only",
    );
    assert.equal(handoff.workflowMode, "video-only");
    assert.equal(handoff.visualStyleId, "product");
    assert.equal(handoff.referencePostVideoUrl, reelAngle.sourceVideoUrl);
    assert.equal(handoff.product, PROMOTE_PRODUCT);
    assert.ok(handoff.promptExtra?.includes("MATCH reference visual style"));
  });

  it("reference-sourced angle without product leaves product empty and does not promote reference topic", () => {
    const pinnedAngle = { ...zodiacCarouselAngle, id: "pinned-note-1" };
    const handoff = buildContentAngleHandoff(pinnedAngle, xhsPlan, "physical");
    assert.equal(handoff.product, undefined);
    assert.equal(handoff.headline, "");
    assert.ok(handoff.promptExtra?.includes("MATCH reference visual style"));
    assert.ok(!handoff.promptExtra?.includes("All copy and visuals must promote: 水晶手串"));
    assert.ok(handoff.promptExtra?.includes("NEVER the reference post title"));
  });

  it("search post without promote product falls back to search topic", () => {
    const handoff = buildContentAngleHandoff(zodiacCarouselAngle, xhsPlan, "physical");
    assert.equal(handoff.product, SEARCH_TOPIC);
  });

  it("reference-sourced with user product promotes product not reference title", () => {
    const obsidianPlan = {
      ...xhsPlan,
      topic: "",
      candidates: [
        {
          ...zodiacCarouselAngle,
          id: "pinned-note-1",
          sourceTitle: "一篇看懂黑曜石｜种类颜色、真假、产地怎么分",
        },
      ],
    };
    const angle = obsidianPlan.candidates[0]!;
    const handoff = buildContentAngleHandoff(angle, obsidianPlan, "physical", PROMOTE_PRODUCT);
    assert.equal(handoff.product, PROMOTE_PRODUCT);
    assert.ok(handoff.promptExtra?.includes(`All copy and visuals must promote: ${PROMOTE_PRODUCT}`));
    assert.ok(!handoff.promptExtra?.includes("All copy and visuals must promote: 一篇看懂黑曜石"));
  });

  it("concept handoff uses angle hook and per-angle conceptIdea", () => {
    const koreaAngle = {
      ...zodiacCarouselAngle,
      title: "2026最新韓國行程避雷指南",
      hook: "2026年韓國最新規定！這些坑千萬別踩。",
      bulletPoints: ["2026年簽證新變化", "推薦支付方式"],
    };
    const plan = { ...xhsPlan, topic: "5天韓國旅行行程" };
    const handoff = buildContentAngleHandoff(koreaAngle, plan, "concept");
    assert.equal(handoff.headline, "2026年韓國最新規定！這些坑千萬別踩。");
    assert.ok(handoff.subline?.includes("2026年簽證新變化"));
    assert.ok(handoff.conceptIdea?.includes("5天韓國旅行行程"));
    assert.ok(!handoff.headline?.includes("必看攻略"));
    assert.equal(handoff.product, undefined);
  });

  it("concept handoff keeps the user's promote target and never copies a reference hook", () => {
    const referenceAngle = {
      ...zodiacCarouselAngle,
      id: "pinned-world-cup",
      title: "世界杯互動帖",
      hook: "留下你支持的4支球隊",
      sourceTitle: "世界杯四強競猜",
    };
    const plan = { ...xhsPlan, topic: "世界杯" };
    const conceptIdea = "餐廳世界杯訂位推广";
    const handoff = buildContentAngleHandoff(
      referenceAngle,
      plan,
      "concept",
      conceptIdea,
    );

    assert.equal(handoff.conceptIdea, conceptIdea);
    assert.ok(handoff.headline?.includes("餐廳"));
    assert.ok(handoff.headline?.includes("訂位"));
    assert.ok(!handoff.headline?.includes("留下你支持的4支球隊"));
    assert.ok(!handoff.headline?.includes("世界杯四強競猜"));
  });

  it("concept pinned reference without promote target does not leak search topic into conceptIdea", () => {
    const referenceAngle = {
      ...zodiacCarouselAngle,
      id: "pinned-world-cup",
      title: "世界杯互動帖",
      hook: "留下你支持的4支球隊",
      sourceTitle: "世界杯四強競猜",
    };
    const plan = { ...xhsPlan, topic: "世界杯" };
    const handoff = buildContentAngleHandoff(referenceAngle, plan, "concept");
    assert.equal(handoff.conceptIdea, "");
    assert.ok(!handoff.promptExtra?.includes("All copy and visuals must promote: 世界杯"));
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

  it("teaching-carousel with stray videoUrl stays image-only under combined picker", () => {
    const carouselWithVideo = {
      ...zodiacCarouselAngle,
      sourceVideoUrl: "https://example.com/stray.mp4",
    };
    const handoff = buildContentAngleHandoff(
      carouselWithVideo,
      xhsPlan,
      "concept",
      undefined,
      "combined",
    );
    assert.equal(handoff.imageOutputMode, "teaching-carousel");
    assert.equal(handoff.workflowMode, "image-only");
    assert.equal(handoff.visualStyleId, "info-poster");
    assert.equal(handoff.referencePostVideoUrl, undefined);
  });
});
