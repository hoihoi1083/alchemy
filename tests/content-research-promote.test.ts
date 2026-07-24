import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  copyFieldsFromAngle,
  contentResearchPromoteTarget,
  isContentResearchStyleExtra,
  promoteProductName,
  refreshContentResearchPromptExtra,
  researchProductPromptLines,
  stripContentResearchStyleExtra,
  styleReferencePromptBlock,
} from "../lib/content-research-promote";
import {
  PROMOTE_PRODUCT,
  SEARCH_TOPIC,
  xhsPlan,
  zodiacCarouselAngle,
} from "./fixtures/content-research";

describe("content-research-promote", () => {
  it("promoteProductName prefers explicit product over search topic", () => {
    assert.equal(promoteProductName(PROMOTE_PRODUCT, SEARCH_TOPIC), PROMOTE_PRODUCT);
    assert.equal(promoteProductName("", SEARCH_TOPIC), SEARCH_TOPIC);
  });

  it("copyFieldsFromAngle does not copy reference zodiac hook", () => {
    const copy = copyFieldsFromAngle(zodiacCarouselAngle, PROMOTE_PRODUCT, SEARCH_TOPIC);
    assert.ok(!copy.headline.includes("水瓶座"));
    assert.ok(copy.headline.includes(PROMOTE_PRODUCT));
    assert.ok(!copy.subline.includes("水瓶座性格"));
    assert.ok(copy.subline.includes(PROMOTE_PRODUCT));
    assert.ok(!copy.subline.includes("carousel"));
    assert.ok(!copy.subline.includes("Carousel"));
    assert.ok(!copy.offer.includes("留言"));
    assert.ok(copy.offer.includes(PROMOTE_PRODUCT));
  });

  it("copyFieldsFromAngle in concept mode keeps the user's concept as the copy anchor", () => {
    const koreaAngle = {
      ...zodiacCarouselAngle,
      id: "angle-korea",
      title: "2026最新韓國行程避雷指南",
      hook: "2026年韓國最新規定！這些坑千萬別踩。",
      bulletPoints: ["2026年簽證新變化", "推薦支付方式", "避開人潮景點"],
      cta: "收藏攻略",
    };
    const copy = copyFieldsFromAngle(koreaAngle, "5天韓國旅行行程", "5天韓國旅行行程", {
      promotionMode: "concept",
    });
    assert.equal(copy.headline, "5天韓國旅行行程｜必看攻略");
    assert.ok(copy.subline.includes("5天韓國旅行行程"));
    assert.ok(!copy.headline.includes("韓國最新規定"));
    assert.ok(!copy.subline.includes("簽證新變化"));
  });

  it("stripContentResearchStyleExtra removes old style blocks when picking a new angle", () => {
    const oldBlock = styleReferencePromptBlock(zodiacCarouselAngle, xhsPlan, PROMOTE_PRODUCT);
    const merged = `My notes | ${oldBlock} | keep this`;
    const stripped = stripContentResearchStyleExtra(merged);
    assert.ok(!isContentResearchStyleExtra(stripped));
    assert.ok(stripped.includes("My notes"));
    assert.ok(stripped.includes("keep this"));
  });

  it("styleReferencePromptBlock is style-only and names product", () => {
    const block = styleReferencePromptBlock(
      zodiacCarouselAngle,
      xhsPlan,
      PROMOTE_PRODUCT,
      "8-slide pacing note",
    );
    assert.ok(block.includes("Style reference"));
    assert.ok(block.includes("MATCH reference visual style"));
    assert.ok(block.includes("REPLACE with user campaign"));
    assert.ok(block.includes(PROMOTE_PRODUCT));
    assert.ok(block.includes(SEARCH_TOPIC));
    assert.ok(!block.includes("Slide1: 水瓶座"));
    assert.ok(!block.includes(zodiacCarouselAngle.whyItWorks));
    assert.ok(isContentResearchStyleExtra(block));
  });

  it("copyFieldsFromAngle leaves headline empty for reference post without product", () => {
    const copy = copyFieldsFromAngle(zodiacCarouselAngle, "", SEARCH_TOPIC, {
      promotionMode: "physical",
      referenceSourced: true,
    });
    assert.equal(copy.headline, "");
    assert.equal(copy.subline, "");
  });

  it("styleReferencePromptBlock requires UI copy language", () => {
    const block = styleReferencePromptBlock(
      zodiacCarouselAngle,
      xhsPlan,
      PROMOTE_PRODUCT,
      undefined,
      "cn",
    );
    assert.ok(block.includes("Simplified Chinese"));
    assert.ok(block.includes("never mix English and Chinese"));
    assert.ok(block.includes("user's UI language only"));
  });

  it("copyFieldsFromAngle uses English fallbacks for en market", () => {
    const copy = copyFieldsFromAngle(zodiacCarouselAngle, "Obsidian Bracelet", SEARCH_TOPIC, {
      market: "en",
    });
    assert.ok(copy.headline.includes("Obsidian Bracelet"));
    assert.ok(/must-read|promo|guide/i.test(copy.headline) || copy.headline.includes("Obsidian"));
    assert.ok(!/選購|必看/.test(copy.subline + copy.headline));
  });

  it("refreshContentResearchPromptExtra swaps promote target when user edits product", () => {
    const obsidianAngle = {
      ...zodiacCarouselAngle,
      id: "pinned-note-1",
      sourceTitle: "一篇看懂黑曜石｜种类颜色、真假、产地怎么分",
    };
    const plan = { ...xhsPlan, topic: "" };
    const initial = styleReferencePromptBlock(obsidianAngle, plan, "");
    const refreshed = refreshContentResearchPromptExtra(initial, { angle: obsidianAngle, plan }, "physical", {
      product: PROMOTE_PRODUCT,
      headline: "",
      conceptIdea: "",
    });
    assert.ok(refreshed.includes(`All copy and visuals must promote: ${PROMOTE_PRODUCT}`));
    assert.ok(!refreshed.includes("All copy and visuals must promote: 一篇看懂黑曜石"));
  });

  it("contentResearchPromoteTarget prefers product in physical mode", () => {
    assert.equal(
      contentResearchPromoteTarget("physical", {
        product: PROMOTE_PRODUCT,
        headline: "黑曜石",
        conceptIdea: "",
        searchTopic: SEARCH_TOPIC,
      }),
      PROMOTE_PRODUCT,
    );
  });

  it("researchProductPromptLines splits search vs product", () => {
    const lines = researchProductPromptLines(SEARCH_TOPIC, PROMOTE_PRODUCT);
    assert.ok(lines.some((l) => l.includes(SEARCH_TOPIC)));
    assert.ok(lines.some((l) => l.includes(PROMOTE_PRODUCT)));
    assert.ok(lines.some((l) => l.includes("FORMAT")));
  });
});
