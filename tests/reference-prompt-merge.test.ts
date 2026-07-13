import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  copyFieldsFromAngle,
  isContentResearchStyleExtra,
  isProductShotReferenceAngle,
  isSingleImageReferenceAngle,
  styleReferencePromptBlock,
} from "../lib/content-research-promote";
import { mergeReferencePromptExtra } from "../lib/reference-strategy";
import { buildReferenceConceptImagePrompt, buildPromptVariables } from "../lib/prompt-variables";
import { USER_REFERENCE_LAYOUT_TRANSFER_MARKER } from "../lib/user-reference-brief";
import { xhsPlan, zodiacCarouselAngle, PROMOTE_PRODUCT, SEARCH_TOPIC } from "./fixtures/content-research";

describe("reference prompt merge", () => {
  it("mergeReferencePromptExtra drops research style when brief exists", () => {
    const researchBlock = styleReferencePromptBlock(zodiacCarouselAngle, xhsPlan, PROMOTE_PRODUCT);
    assert.ok(isContentResearchStyleExtra(researchBlock));
    const brief = {
      topic: "bracelet",
      contentSummary: "",
      visibleText: "",
      subjects: "Silver bracelet",
      contentType: "other",
      layoutStyle: "centered hero with overlaid text",
      colorPalette: "beige and silver",
      typographyStyle: "bold sans-serif",
      mood: "clean",
      motionHints: "",
    };
    const strategy = mergeReferencePromptExtra(researchBlock, brief, {
      kind: "layout-transfer",
      layers: {
        layoutGrammar: "keep",
        visualStyle: "keep",
        contentLane: "replace",
        subjects: "replace",
        onImageText: "replace",
        moodLighting: "adapt",
        stagingPose: "keep",
      },
      useDualImage: true,
      sendPixelsToFal: true,
      referenceImageMode: "dual",
      useReferenceConceptPrompts: true,
    });
    assert.ok(!isContentResearchStyleExtra(strategy));
    assert.ok(strategy.includes(USER_REFERENCE_LAYOUT_TRANSFER_MARKER));
    assert.ok(strategy.includes("centered hero with overlaid text"));
  });

  it("single-image pinned reference leaves copy empty when rewrite is unsafe", () => {
    const angle = {
      ...zodiacCarouselAngle,
      id: "pinned-note-1",
      format: "teaching-carousel" as const,
      sourceImageUrls: ["https://example.com/cover.jpg"],
    };
    assert.ok(isSingleImageReferenceAngle(angle));
    const copy = copyFieldsFromAngle(angle, PROMOTE_PRODUCT, SEARCH_TOPIC);
    assert.equal(copy.headline, "");
    assert.equal(copy.subline, "");
  });

  it("product-shot reference uses planner rewrite for user product", () => {
    const angle = {
      ...zodiacCarouselAngle,
      id: "post-compare",
      format: "teaching-carousel" as const,
      sourceTitle: "两条差价很多的蓝月光，请问酸洗了吗",
      title: `${PROMOTE_PRODUCT} | 戴上就像把星空戴在手上`,
      hook: "被追問的手串，天然粉晶能量",
      bulletPoints: ["天然粉晶", "藍光流轉", "日常百搭"],
      sourceImageUrls: ["https://example.com/a.jpg", "https://example.com/b.jpg"],
    };
    assert.ok(isProductShotReferenceAngle(angle));
    const copy = copyFieldsFromAngle(angle, PROMOTE_PRODUCT, SEARCH_TOPIC);
    assert.equal(copy.headline, angle.title);
    assert.equal(copy.subline, angle.hook);
  });

  it("buildReferenceConceptImagePrompt omits campaign copy when user fields empty", () => {
    const extra = `${USER_REFERENCE_LAYOUT_TRANSFER_MARKER}: Reference layout grammar: flat lay`;
    const prompt = buildReferenceConceptImagePrompt(
      buildPromptVariables({
        product: PROMOTE_PRODUCT,
        extra,
      }),
      { structuredReferenceBrief: true, aspectRatio: "4:5" },
    );
    assert.ok(!prompt.includes("Campaign copy"));
    assert.ok(prompt.includes("no on-image copy"));
  });

  it("buildReferenceConceptImagePrompt includes user headline when provided", () => {
    const prompt = buildReferenceConceptImagePrompt(
      buildPromptVariables({
        product: PROMOTE_PRODUCT,
        headline: "我的主標",
        extra: `${USER_REFERENCE_LAYOUT_TRANSFER_MARKER}: layout`,
      }),
      { structuredReferenceBrief: true },
    );
    assert.ok(prompt.includes("我的主標"));
    assert.ok(prompt.includes("Campaign copy"));
  });

  it("buildReferenceConceptImagePrompt skips LAYER essay when brief marker in extra", () => {
    const extra = `${USER_REFERENCE_LAYOUT_TRANSFER_MARKER}: Reference layout grammar: flat lay`;
    const prompt = buildReferenceConceptImagePrompt(
      buildPromptVariables({
        product: PROMOTE_PRODUCT,
        headline: `${PROMOTE_PRODUCT}｜推介`,
        extra,
      }),
      { structuredReferenceBrief: true, aspectRatio: "4:5" },
    );
    assert.ok(!prompt.includes("LAYER A"));
    assert.ok(!prompt.includes("HOW TO USE IMAGE 1"));
    assert.ok(prompt.includes("4:5"));
    assert.ok(prompt.includes(USER_REFERENCE_LAYOUT_TRANSFER_MARKER));
  });
});
