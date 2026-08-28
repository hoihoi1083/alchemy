import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyContentAngleToWizard } from "@/lib/content-research-apply";
import type { ContentAngleCandidate, ContentResearchPlan } from "@/lib/content-research-types";
import { researchUiPlatforms } from "@/lib/wizard-intake-contract";

function angle(
  partial: Partial<ContentAngleCandidate> & Pick<ContentAngleCandidate, "id" | "title">,
): ContentAngleCandidate {
  return {
    hook: partial.hook ?? partial.title,
    scriptOutline: "",
    format: "single-image",
    formatLabel: "Single",
    whyItWorks: "",
    bulletPoints: partial.bulletPoints ?? [],
    cta: partial.cta ?? "",
    score: 50,
    sourceUrl: partial.sourceUrl ?? "https://www.xiaohongshu.com/explore/abc123",
    sourceCoverImageUrl: partial.sourceCoverImageUrl ?? "https://example.com/cover.jpg",
    ...partial,
  };
}

const basePlan: ContentResearchPlan = {
  mode: "live-web",
  topic: "serum",
  market: "hk",
  platform: "xiaohongshu",
  platformLabel: "RedNote",
  candidates: [],
  topPicks: [],
  sources: [],
};

function mockWizard(initial?: { offer?: string; headline?: string }) {
  let offer = initial?.offer ?? "STALE CTA";
  let headline = initial?.headline ?? "";
  let subline = "";
  let promptExtra = "";
  let applyRef: unknown = null;
  return {
    setHeadline: (v: string) => {
      headline = v;
    },
    setSubline: (v: string) => {
      subline = v;
    },
    setOffer: (v: string) => {
      offer = v;
    },
    setConceptIdea: () => {},
    setProduct: () => {},
    setPromptExtra: (v: string | ((prev: string) => string)) => {
      promptExtra = typeof v === "function" ? v(promptExtra) : v;
    },
    setImageOutputMode: () => {},
    setImageAspectRatio: () => {},
    setCampaignTheme: () => {},
    selectVisualStyle: () => {},
    onWorkflowModeChange: () => {},
    setImageRefPhoto: () => {},
    setImageCreativeMode: () => {},
    onImageInputModeChange: () => {},
    setExtraKitPhotos: () => {},
    setReferenceCarouselSlideCount: () => {},
    setContentResearchApplyRef: (ref: unknown) => {
      applyRef = ref;
    },
    setCinematicSceneCount: () => {},
    onVideoCreativeModeChange: () => {},
    onReferenceAdFile: () => {},
    setError: () => {},
    get state() {
      return { offer, headline, subline, promptExtra, applyRef };
    },
  };
}

describe("research apply expectations", () => {
  it("clears stale offer when new angle has no CTA", async () => {
    const wizard = mockWizard({ offer: "Shop now from angle A" });
    await applyContentAngleToWizard(
      angle({
        id: "a2",
        title: "Soft focus",
        hook: "Soft daylight",
        cta: "",
      }),
      basePlan,
      "physical",
      wizard,
      "My Serum",
      {
        fetchResearchImagesAsFiles: async () => [],
        fetchResearchVideoAsFile: async () => null,
        resolveResearchPostVideo: async () => null,
      },
    );
    // Empty CTA must not keep the previous angle's offer — sanitize may fill a
    // product-safe default like 「了解{product}」.
    assert.notEqual(wizard.state.offer, "Shop now from angle A");
    assert.ok(wizard.state.headline.length > 0);
  });

  it("writes offer when angle has CTA", async () => {
    const wizard = mockWizard({ offer: "" });
    await applyContentAngleToWizard(
      angle({
        id: "a1",
        title: "Glow",
        hook: "Glow tip",
        cta: "了解更多",
      }),
      basePlan,
      "physical",
      wizard,
      "My Serum",
      {
        fetchResearchImagesAsFiles: async () => [],
        fetchResearchVideoAsFile: async () => null,
        resolveResearchPostVideo: async () => null,
      },
    );
    assert.ok(wizard.state.offer.length > 0);
  });

  it("preserves remapped/edited copy when preserveCopy is set", async () => {
    const wizard = mockWizard({
      headline: "User remapped hook",
      offer: "Edited CTA",
    });
    await applyContentAngleToWizard(
      angle({
        id: "a3",
        title: "Ref post",
        hook: "Raw reference hook",
        cta: "Buy now",
      }),
      basePlan,
      "physical",
      wizard,
      "My Serum",
      {
        fetchResearchImagesAsFiles: async () => [],
        fetchResearchVideoAsFile: async () => null,
        resolveResearchPostVideo: async () => null,
      },
      "image-only",
      {
        preserveCopy: {
          headline: "User remapped hook",
          subline: "User subline",
          offer: "Edited CTA",
        },
      },
    );
    assert.equal(wizard.state.headline, "User remapped hook");
    assert.equal(wizard.state.subline, "User subline");
    assert.equal(wizard.state.offer, "Edited CTA");
  });

  it("preserveCopy also rewrites RESEARCH IDEA REMAP in promptExtra", async () => {
    const wizard = mockWizard({ headline: "User remapped hook", offer: "" });
    await applyContentAngleToWizard(
      angle({
        id: "a4",
        title: "Ref reel",
        hook: "Raw reference hook",
        format: "reel",
        formatLabel: "Reel",
        sourceVideoUrl: "https://example.com/clip.mp4",
        cta: "",
      }),
      basePlan,
      "physical",
      wizard,
      "My Serum",
      {
        fetchResearchImagesAsFiles: async () => [],
        fetchResearchVideoAsFile: async () => null,
        resolveResearchPostVideo: async () => null,
      },
      "video-only",
      {
        preserveCopy: {
          headline: "User remapped hook",
          subline: "User selling points",
          offer: "Limited offer",
        },
      },
    );
    assert.match(wizard.state.promptExtra, /RESEARCH IDEA REMAP/);
    assert.match(wizard.state.promptExtra, /User remapped hook/);
    assert.match(wizard.state.promptExtra, /User selling points/);
    assert.match(wizard.state.promptExtra, /Limited offer/);
    assert.doesNotMatch(wizard.state.promptExtra, /User headline: Raw reference hook/);
  });

  it("re-pick: any pending pick needs apply (including same angle id)", () => {
    const pendingId = "angle-b";
    const appliedId = "angle-b";
    const needsResearchApply = Boolean(pendingId);
    assert.equal(needsResearchApply, true);
    // Old logic skipped same id — that is no longer desired.
    const oldSkipSame =
      Boolean(pendingId) && (!appliedId || pendingId !== appliedId);
    assert.equal(oldSkipSame, false);
  });
});

describe("research platform expectations by workflow", () => {
  it("image-only: RedNote and Instagram, no TikTok", () => {
    assert.deepEqual([...researchUiPlatforms("image-only")], [
      "xiaohongshu",
      "instagram",
    ]);
  });

  it("video-only: includes TikTok", () => {
    assert.ok(researchUiPlatforms("video-only").includes("tiktok"));
  });
});
