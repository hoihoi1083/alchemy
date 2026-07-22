import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { snapshotFromWizard } from "../lib/wizard-project-snapshot";
import type { StudioWizardValue } from "../hooks/useStudioWizard";

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
  });
});
