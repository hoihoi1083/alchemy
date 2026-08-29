import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { StudioWizardValue } from "../hooks/useStudioWizard";
import { EMPTY_PROJECT_SNAPSHOT } from "../lib/project-snapshot";
import {
  buildProjectResumeHint,
  campaignSlidesFromSnapshot,
  clearProjectResumeHint,
  peekProjectResumeHint,
  shouldBlockEmptyOverwrite,
  snapshotFromWizard,
  snapshotLooksEmpty,
  storyboardScenesFromSnapshot,
  writeProjectResumeHint,
} from "../lib/wizard-project-snapshot";

describe("snapshotFromWizard media URLs", () => {
  it("keeps durable library paths and drops blob/pipeline", () => {
    const wizard = {
      product: "Tea",
      headline: "Fresh",
      subline: "",
      business: "",
      offer: "",
      conceptIdea: "",
      promptExtra: "",
      promptMarket: "hk",
      subjectFraming: "product-only",
      campaignTheme: "",
      brandWebsiteUrl: "",
      brandSocialHint: "",
      creativeVideoBrief: "",
      storyboardBrief: "",
      workflowMode: "simple",
      visualStyleId: "cinematic",
      artStyleId: "photoreal",
      templateId: "product-hero",
      imageCreativeMode: "promo-ai",
      videoCreativeMode: "from-image",
      imageOutputMode: "single",
      imageAspectRatio: "9:16",
      imageInputMode: "upload",
      stepKey: "video",
      imagePrompt: "",
      videoPrompt: "",
      negativePrompt: "",
      brandProfile: null,
      userReferenceBrief: null,
      campaignPlan: null,
      storyboardPlan: null,
      adPackPlan: null,
      imageUrl: "/api/library/download/aaaaaaaaaaaaaaaaaaaaaaaa?inline=1",
      imageVariantUrls: [
        "blob:http://localhost/x",
        "https://cdn.example.com/a.png",
        "/api/pipeline-files/job/x.png",
      ],
      videoUrl: "https://fal.media/video.mp4",
      uploadPreviewUrl: null,
      imageRefPreviewUrl: null,
      campaignSlides: [],
      storyboardScenes: [
        {
          imageIndex: 1,
          startSec: 0,
          endSec: 2,
          sceneDescriptionZh: "a",
          imagePrompt: "a",
          imageUrl: "/api/library/download/bbbbbbbbbbbbbbbbbbbbbbbb?inline=1",
        },
        {
          imageIndex: 2,
          startSec: 2,
          endSec: 4,
          sceneDescriptionZh: "b",
          imagePrompt: "b",
          imageUrl: "blob:http://localhost/y",
        },
      ],
      captionLines: [],
      contentResearchApplyRef: {
        angle: {
          id: "a1",
          title: "Angle",
          hook: "H",
          scriptOutline: "",
          format: "single-image",
          formatLabel: "Single",
          whyItWorks: "",
          bulletPoints: [],
          cta: "",
          score: 1,
          sourceUrl: "https://www.xiaohongshu.com/explore/abc",
          sourceCoverImageUrl: "https://cdn.example.com/cover.jpg",
        },
        plan: {
          platform: "xiaohongshu",
          platformLabel: "小紅書",
          topic: "tea",
          market: "hk",
        },
      },
    } as unknown as StudioWizardValue;

    const snap = snapshotFromWizard(wizard, "concept");
    assert.equal(
      snap.media.imageUrl,
      "/api/library/download/aaaaaaaaaaaaaaaaaaaaaaaa?inline=1",
    );
    assert.deepEqual(snap.media.imageVariantUrls, ["https://cdn.example.com/a.png"]);
    assert.equal(snap.media.videoUrl, "https://fal.media/video.mp4");
    assert.deepEqual(snap.media.storyboardSceneUrls, [
      "/api/library/download/bbbbbbbbbbbbbbbbbbbbbbbb?inline=1",
    ]);
    assert.equal(snap.plans.selectedResearchAngleId, "a1");
    assert.equal(
      snap.plans.contentResearchApplyRef?.angle.sourceUrl,
      "https://www.xiaohongshu.com/explore/abc",
    );
    assert.equal(
      snap.plans.contentResearchApplyRef?.angle.sourceCoverImageUrl,
      "https://cdn.example.com/cover.jpg",
    );
  });
});

describe("wizardFromSnapshot helpers", () => {
  it("rebuilds storyboard scenes from urls + plan", () => {
    const snap = EMPTY_PROJECT_SNAPSHOT("physical");
    snap.media.storyboardSceneUrls = [
      "/api/library/download/cccccccccccccccccccccccc?inline=1",
      "https://cdn.example.com/s2.png",
    ];
    snap.plans.storyboardPlan = {
      title: "T",
      theme: "theme",
      visualDirection: "dir",
      totalDurationSec: 8,
      seedancePrompt: "motion",
      productionNotes: "notes",
      scenes: [
        {
          imageIndex: 1,
          role: "hook",
          startSec: 0,
          endSec: 4,
          sceneDescriptionZh: "開場",
          imagePrompt: "prompt1",
        },
        {
          imageIndex: 2,
          role: "hero",
          startSec: 4,
          endSec: 8,
          sceneDescriptionZh: "產品",
          imagePrompt: "prompt2",
        },
      ],
    };
    const scenes = storyboardScenesFromSnapshot(snap);
    assert.equal(scenes.length, 2);
    assert.equal(scenes[0].role, "hook");
    assert.equal(scenes[0].sceneDescriptionZh, "開場");
    assert.equal(scenes[1].imageUrl, "https://cdn.example.com/s2.png");
  });

  it("rebuilds campaign slides from urls + plan", () => {
    const snap = EMPTY_PROJECT_SNAPSHOT("physical");
    snap.media.campaignSlideUrls = ["https://cdn.example.com/c1.png"];
    snap.plans.campaignPlan = {
      theme: "t",
      visualDna: "dna",
      slides: [
        {
          role: "hero",
          title: "Hero",
          headline: "H",
          subline: "S",
          composition: "c",
        },
      ],
    };
    const slides = campaignSlidesFromSnapshot(snap);
    assert.equal(slides.length, 1);
    assert.equal(slides[0].headline, "H");
    assert.equal(slides[0].imageUrl, "https://cdn.example.com/c1.png");
  });

  it("detects empty snapshots and blocks empty overwrite", () => {
    const empty = EMPTY_PROJECT_SNAPSHOT("concept");
    assert.equal(snapshotLooksEmpty(empty), true);
    const rich = EMPTY_PROJECT_SNAPSHOT("concept");
    rich.media.storyboardSceneUrls = ["https://cdn.example.com/a.png"];
    assert.equal(snapshotLooksEmpty(rich), false);
    assert.equal(shouldBlockEmptyOverwrite(empty, JSON.stringify(rich)), true);
    assert.equal(shouldBlockEmptyOverwrite(rich, JSON.stringify(empty)), false);
    assert.equal(shouldBlockEmptyOverwrite(empty, "__remote_unknown__"), true);
  });

  it("resume hint lands on image.review when scenes exist", () => {
    const snap = EMPTY_PROJECT_SNAPSHOT("physical");
    snap.settings.workflowMode = "combined";
    snap.settings.visualStyleId = "storyboard-video";
    snap.media.storyboardSceneUrls = ["https://cdn.example.com/a.png"];
    const hint = buildProjectResumeHint(snap);
    assert.equal(hint.targetMicroStep, "image.review");
    assert.equal(hint.microContext.workflowMode, "combined");
    assert.equal(hint.microContext.combinedStyle, "storyboard");
    assert.equal(hint.microContext.intakePath, "direct");
  });

  it("clearProjectResumeHint removes session resume payload", () => {
    writeProjectResumeHint({
      targetMicroStep: "image.review",
      microContext: { workflowMode: "combined" },
    });
    clearProjectResumeHint();
    assert.equal(peekProjectResumeHint(), null);
  });
});
