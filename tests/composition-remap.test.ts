import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCompositionRemapImagePrompt,
  buildPromptVariables,
} from "../lib/prompt-variables";
import { resolveReferenceStrategy } from "../lib/reference-strategy";
import {
  USER_REFERENCE_COMPOSITION_REMAP_MARKER,
  userReferenceCompositionRemapPromptBlock,
} from "../lib/user-reference-brief";
import { evaluateProceedToImageGate } from "../lib/wizard-setup-gate";

describe("composition-remap strategy", () => {
  it("concept + ref + prefer remap → composition-remap (single, no product)", () => {
    const s = resolveReferenceStrategy({
      promotionMode: "concept",
      imageOutputMode: "single",
      visualStyleId: "info-poster",
      imageCreativeMode: "reference-concept",
      hasReferenceUpload: true,
      hasProductPhoto: false,
      hasReferenceBrief: true,
      preferCompositionRemap: true,
    });
    assert.equal(s.kind, "composition-remap");
    assert.equal(s.layers.layoutGrammar, "keep");
    assert.equal(s.layers.subjects, "replace");
    assert.equal(s.useDualImage, false);
    assert.equal(s.sendPixelsToFal, true);
    assert.equal(s.referenceImageMode, "composition-remap");
    assert.equal(s.useReferenceConceptPrompts, false);
  });

  it("physical + product + ref + prefer remap → dual composition-remap (shell-first)", () => {
    const s = resolveReferenceStrategy({
      promotionMode: "physical",
      imageOutputMode: "single",
      visualStyleId: "product",
      imageCreativeMode: "reference-concept",
      hasReferenceUpload: true,
      hasProductPhoto: true,
      hasReferenceBrief: true,
      preferCompositionRemap: true,
    });
    assert.equal(s.kind, "composition-remap");
    assert.equal(s.useDualImage, true);
    assert.equal(s.referenceImageMode, "composition-remap");
    assert.equal(s.useReferenceConceptPrompts, false);
  });

  it("concept + product photo + prefer remap → shell-only (ignore product dual)", () => {
    const s = resolveReferenceStrategy({
      promotionMode: "concept",
      imageOutputMode: "single",
      visualStyleId: "info-poster",
      imageCreativeMode: "reference-concept",
      hasReferenceUpload: true,
      hasProductPhoto: true,
      hasReferenceBrief: true,
      preferCompositionRemap: true,
    });
    assert.equal(s.kind, "composition-remap");
    assert.equal(s.useDualImage, false);
    assert.equal(s.referenceImageMode, "composition-remap");
  });

  it("campaign + prefer remap does NOT force composition-remap", () => {
    const s = resolveReferenceStrategy({
      promotionMode: "concept",
      imageOutputMode: "campaign",
      visualStyleId: "info-poster",
      imageCreativeMode: "reference-concept",
      hasReferenceUpload: true,
      hasProductPhoto: false,
      hasReferenceBrief: true,
      preferCompositionRemap: true,
    });
    assert.equal(s.kind, "style-only");
  });

  it("without prefer remap, concept + ref stays style-only", () => {
    const s = resolveReferenceStrategy({
      promotionMode: "concept",
      imageOutputMode: "single",
      visualStyleId: "info-poster",
      imageCreativeMode: "reference-concept",
      hasReferenceUpload: true,
      hasProductPhoto: false,
      hasReferenceBrief: true,
      preferCompositionRemap: false,
    });
    assert.equal(s.kind, "style-only");
  });

  it("keep-hero option keeps subjects layer and updates prompts", () => {
    const s = resolveReferenceStrategy({
      promotionMode: "concept",
      imageOutputMode: "single",
      visualStyleId: "info-poster",
      imageCreativeMode: "reference-concept",
      hasReferenceUpload: true,
      hasProductPhoto: false,
      hasReferenceBrief: true,
      preferCompositionRemap: true,
      compositionRemapKeepHero: true,
    });
    assert.equal(s.kind, "composition-remap");
    assert.equal(s.layers.subjects, "keep");
    assert.equal(s.layers.contentLane, "replace");
    assert.equal(s.layers.onImageText, "replace");

    const prompt = buildCompositionRemapImagePrompt(
      buildPromptVariables({
        product: "借貸服務",
        headline: "圍繞你嘅團隊",
      }),
      { aspectRatio: "4:5", keepHero: true },
    );
    assert.match(prompt, /KEEP the central hub person/i);
  });
});

describe("composition-remap prompts", () => {
  it("brief block keeps layout and forbids reference text", () => {
    const block = userReferenceCompositionRemapPromptBlock(
      {
        topic: "CR7 stats",
        contentSummary: "Football star board",
        visibleText: "€250M CR7",
        subjects: "Ronaldo and coaches",
        contentType: "infographic",
        layoutStyle: "hub-and-spoke with callout chips",
        colorPalette: "dark red",
        typographyStyle: "bold condensed",
        mood: "intense",
        motionHints: "",
        userConceptIdea: "Loan team system",
        userHeadline: "借貸團隊如何運作",
      },
      {
        layoutGrammar: "keep",
        visualStyle: "keep",
        contentLane: "replace",
        subjects: "replace",
        onImageText: "replace",
        moodLighting: "adapt",
        stagingPose: "adapt",
      },
    );
    assert.ok(block.includes(USER_REFERENCE_COMPOSITION_REMAP_MARKER));
    assert.ok(block.includes("hub-and-spoke"));
    assert.ok(block.includes("FORBIDDEN ON-IMAGE TEXT"));
    assert.ok(block.includes("借貸團隊如何運作"));
  });

  it("single-shell prompt keeps board grammar language", () => {
    const prompt = buildCompositionRemapImagePrompt(
      buildPromptVariables({
        product: "借貸服務",
        headline: "借貸團隊如何運作",
        subline: "審批 · 放款 · 跟進",
      }),
      { aspectRatio: "4:5", dualProduct: false },
    );
    assert.match(prompt, /COMPOSITION REMAP/i);
    assert.match(prompt, /composition SHELL/i);
    assert.match(prompt, /BOARD TRACE/i);
    assert.match(prompt, /hub/i);
    assert.match(prompt, /FORBIDDEN layouts/i);
    assert.match(prompt, /借貸團隊如何運作/);
    assert.doesNotMatch(prompt, /IMAGE 2 = optional SKU/i);
  });

  it("dual-product prompt keeps shell as IMAGE 1 not packshot-first", () => {
    const prompt = buildCompositionRemapImagePrompt(
      buildPromptVariables({
        product: "Aura Bracelet",
        headline: "Why collectors pick Aura",
      }),
      { aspectRatio: "4:5", dualProduct: true },
    );
    assert.match(prompt, /IMAGE 1 = composition SHELL/i);
    assert.match(prompt, /optional SKU/i);
    assert.match(prompt, /BOARD TRACE/i);
    assert.doesNotMatch(prompt, /IMAGE 1 = user product hero/i);
  });
});

describe("composition-remap setup gate", () => {
  it("requires reference image when prefer remap", () => {
    assert.equal(
      evaluateProceedToImageGate({
        promotionMode: "concept",
        workflowMode: "image-only",
        promptExtra: "",
        effectivePromoteName: "借貸",
        hasReferenceImage: false,
        referenceAnalyzeBusy: false,
        imageCreativeMode: "reference-concept",
        headline: "借貸",
        visualStyleId: "info-poster",
        hasProductPhoto: false,
        isStoryboardOutput: false,
        preferCompositionRemap: true,
      }),
      "need_reference_image",
    );
  });

  it("requires headline/topic when prefer remap", () => {
    assert.equal(
      evaluateProceedToImageGate({
        promotionMode: "concept",
        workflowMode: "image-only",
        promptExtra: "",
        effectivePromoteName: "",
        hasReferenceImage: true,
        referenceAnalyzeBusy: false,
        imageCreativeMode: "reference-concept",
        headline: "",
        visualStyleId: "info-poster",
        hasProductPhoto: false,
        isStoryboardOutput: false,
        preferCompositionRemap: true,
      }),
      "need_headline",
    );
  });
});
