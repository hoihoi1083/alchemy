import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyContentAngleToWizard } from "../lib/content-research-apply";
import { applyResearchPostReferences } from "../lib/content-research-apply-refs";
import { wantsResearchVideoReference } from "../lib/content-research-infer";
import { resolveVideoGenerationKind } from "../lib/video-generation-path";
import {
  PROMOTE_PRODUCT,
  reelAngle,
  xhsPlan,
  zodiacCarouselAngle,
} from "./fixtures/content-research";

function mockVideoFile(name = "ref.mp4") {
  return new File([new Uint8Array([1, 2, 3])], name, { type: "video/mp4" });
}

function mockImageFile(name = "cover.jpg") {
  return new File([new Uint8Array([4, 5, 6])], name, { type: "image/jpeg" });
}

describe("wantsResearchVideoReference", () => {
  it("reel angles load reference video", () => {
    assert.equal(wantsResearchVideoReference("reel", 0), true);
    assert.equal(wantsResearchVideoReference("reel", 0, "https://v.mp4"), true);
  });

  it("carousel stills skip reference video", () => {
    assert.equal(wantsResearchVideoReference("teaching-carousel", 8), false);
    assert.equal(wantsResearchVideoReference("campaign", 3), false);
    assert.equal(wantsResearchVideoReference("single", 4), false);
  });

  it("non-reel with explicit video URL loads reference video", () => {
    assert.equal(
      wantsResearchVideoReference("single", 1, "https://example.com/post.mp4"),
      true,
    );
  });
});

describe("applyResearchPostReferences video handoff", () => {
  it("sets reference-concept mode and MP4 when video resolves", async () => {
    const videoFile = mockVideoFile();
    const modes: string[] = [];
    let referenceFile: File | null = null;

    await applyResearchPostReferences(
      {
        platform: "xiaohongshu",
        promotionMode: "physical",
        loadVideo: true,
        videoUrl: "https://example.com/ref.mp4",
      },
      {
        setImageCreativeMode: () => {},
        setImageRefPhoto: () => {},
        onVideoCreativeModeChange: (mode) => modes.push(mode),
        onReferenceAdFile: (file) => {
          referenceFile = file;
        },
      },
      {
        fetchResearchImagesAsFiles: async () => [],
        fetchResearchVideoAsFile: async () => videoFile,
        resolveResearchPostVideo: async () => null,
      },
    );

    assert.deepEqual(modes, ["reference-concept"]);
    assert.equal(referenceFile, videoFile);
  });

  it("returns videoAttached when download succeeds", async () => {
    const result = await applyResearchPostReferences(
      {
        platform: "xiaohongshu",
        promotionMode: "physical",
        loadVideo: true,
        videoUrl: "https://example.com/ref.mp4",
      },
      {
        setImageCreativeMode: () => {},
        setImageRefPhoto: () => {},
        onVideoCreativeModeChange: () => {},
        onReferenceAdFile: () => {},
      },
      {
        fetchResearchImagesAsFiles: async () => [],
        fetchResearchVideoAsFile: async () => mockVideoFile(),
        resolveResearchPostVideo: async () => null,
      },
    );

    assert.equal(result.videoAttached, true);
    assert.equal(result.videoRequested, true);
  });

  it("returns download_failed when proxy fetch fails", async () => {
    const result = await applyResearchPostReferences(
      {
        platform: "xiaohongshu",
        promotionMode: "physical",
        loadVideo: true,
        videoUrl: "https://example.com/missing.mp4",
      },
      {
        setImageCreativeMode: () => {},
        setImageRefPhoto: () => {},
        onVideoCreativeModeChange: () => {},
        onReferenceAdFile: () => {},
      },
      {
        fetchResearchImagesAsFiles: async () => [],
        fetchResearchVideoAsFile: async () => null,
        resolveResearchPostVideo: async () => null,
      },
    );

    assert.equal(result.videoAttached, false);
    assert.equal(result.videoError, "download_failed");
  });

  it("resolves video URL from post id when sourceVideoUrl missing", async () => {
    const calls: string[] = [];
    const videoFile = mockVideoFile("resolved.mp4");

    await applyResearchPostReferences(
      {
        platform: "tiktok",
        promotionMode: "physical",
        loadVideo: true,
        postId: "abc123",
        postUrl: "https://tiktok.com/@x/video/abc123",
      },
      {
        setImageCreativeMode: () => {},
        setImageRefPhoto: () => {},
        onVideoCreativeModeChange: () => {},
        onReferenceAdFile: () => {},
      },
      {
        fetchResearchImagesAsFiles: async () => [],
        fetchResearchVideoAsFile: async (url) => {
          calls.push(url);
          return videoFile;
        },
        resolveResearchPostVideo: async (_platform, postId) => {
          calls.push(`resolve:${postId}`);
          return "https://cdn.example.com/resolved.mp4";
        },
      },
    );

    assert.deepEqual(calls, ["resolve:abc123", "https://cdn.example.com/resolved.mp4"]);
  });

  it("skips video when loadVideo is false", async () => {
    let videoModeCalled = false;

    await applyResearchPostReferences(
      {
        platform: "xiaohongshu",
        promotionMode: "physical",
        loadVideo: false,
        videoUrl: "https://example.com/ref.mp4",
      },
      {
        setImageCreativeMode: () => {},
        setImageRefPhoto: () => {},
        onVideoCreativeModeChange: () => {
          videoModeCalled = true;
        },
        onReferenceAdFile: () => {
          assert.fail("should not attach video");
        },
      },
      {
        fetchResearchImagesAsFiles: async () => [],
        fetchResearchVideoAsFile: async () => mockVideoFile(),
        resolveResearchPostVideo: async () => null,
      },
    );

    assert.equal(videoModeCalled, false);
  });

  it("does not attach MP4 when video fetch fails", async () => {
    const modes: string[] = [];
    let referenceAttached = false;

    await applyResearchPostReferences(
      {
        platform: "xiaohongshu",
        promotionMode: "physical",
        loadVideo: true,
        videoUrl: "https://example.com/missing.mp4",
      },
      {
        setImageCreativeMode: () => {},
        setImageRefPhoto: () => {},
        onVideoCreativeModeChange: (mode) => modes.push(mode),
        onReferenceAdFile: () => {
          referenceAttached = true;
        },
      },
      {
        fetchResearchImagesAsFiles: async () => [],
        fetchResearchVideoAsFile: async () => null,
        resolveResearchPostVideo: async () => null,
      },
    );

    assert.deepEqual(modes, ["reference-concept"]);
    assert.equal(referenceAttached, false);
  });
});

describe("applyContentAngleToWizard reel reference", () => {
  it("wires reel angle to reference-concept video with downloaded MP4 (video-only direct R2V)", async () => {
    const videoFile = mockVideoFile("xiaohongshu-reference.mp4");
    const videoModes: string[] = [];
    let referenceAd: File | null = null;

    const { patch, refs } = await applyContentAngleToWizard(
      reelAngle,
      xhsPlan,
      "physical",
      {
        setHeadline: () => {},
        setSubline: () => {},
        setOffer: () => {},
        setConceptIdea: () => {},
        setProduct: () => {},
        setPromptExtra: () => {},
        setImageOutputMode: () => {},
        onWorkflowModeChange: () => {},
        selectVisualStyle: () => {},
        setImageCreativeMode: () => {},
        setImageRefPhoto: () => {},
        onVideoCreativeModeChange: (mode) => videoModes.push(mode),
        onReferenceAdFile: (file) => {
          referenceAd = file;
        },
      },
      PROMOTE_PRODUCT,
      {
        fetchResearchImagesAsFiles: async () => [],
        fetchResearchVideoAsFile: async (url, platform, filename) => {
          assert.equal(url, reelAngle.sourceVideoUrl);
          assert.equal(platform, xhsPlan.platform);
          assert.equal(filename, "xiaohongshu-reference.mp4");
          return videoFile;
        },
        resolveResearchPostVideo: async () => null,
      },
      "video-only",
    );

    assert.equal(patch.visualStyleId, "product");
    assert.equal(patch.workflowMode, "video-only");
    assert.deepEqual(videoModes, ["reference-concept"]);
    assert.equal(referenceAd, videoFile);
    assert.equal(refs.videoAttached, true);
  });

  it("carousel angle does not attach reference video", async () => {
    const unusedVideo = mockVideoFile();
    let lastReferenceAd: File | null | undefined;

    await applyContentAngleToWizard(
      zodiacCarouselAngle,
      xhsPlan,
      "physical",
      {
        setHeadline: () => {},
        setSubline: () => {},
        setOffer: () => {},
        setConceptIdea: () => {},
        setProduct: () => {},
        setPromptExtra: () => {},
        setImageOutputMode: () => {},
        onWorkflowModeChange: () => {},
        selectVisualStyle: () => {},
        setImageCreativeMode: () => {},
        setImageRefPhoto: () => {},
        onVideoCreativeModeChange: () => assert.fail("carousel should not set video mode"),
        // Clearing a previous reel (null) is correct; attaching a File is not.
        onReferenceAdFile: (file) => {
          lastReferenceAd = file;
          if (file != null) assert.fail("carousel should not attach video");
        },
      },
      PROMOTE_PRODUCT,
      {
        fetchResearchImagesAsFiles: async (urls) => urls.map((_, i) => mockImageFile(`s${i}.jpg`)),
        fetchResearchVideoAsFile: async () => unusedVideo,
        resolveResearchPostVideo: async () => "https://should-not-resolve.mp4",
      },
    );

    assert.equal(lastReferenceAd, null);
    assert.ok(unusedVideo);
  });
});

describe("resolveVideoGenerationKind", () => {
  const base = {
    usesCompositor: false,
    isStoryboardOutput: false,
    isUgcPresenterOutput: false,
    shouldCinematicStitch: false,
    isConceptCinematicSingleOutput: false,
    cinematicSceneCount: 0,
    cinematicScenesLength: 0,
    usesProductAssistant: false,
    conceptTextVideoReady: false,
    videoCreativeMode: "reference-concept" as const,
    useReferenceVideo: true,
    hasReferenceAd: true,
    useMultiAngleVideo: false,
  };

  it("content-research reel uses storyboard when storyboard-video style", () => {
    assert.equal(
      resolveVideoGenerationKind({ ...base, isStoryboardOutput: true }),
      "storyboard",
    );
  });

  it("ugc presenter uses digital-presenter path", () => {
    assert.equal(
      resolveVideoGenerationKind({
        ...base,
        isUgcPresenterOutput: true,
        videoCreativeMode: "image-to-video",
        useReferenceVideo: false,
        hasReferenceAd: false,
      }),
      "digital-presenter",
    );
  });

  it("content-research concept reel uses storyboard when storyboard-video style", () => {
    assert.equal(
      resolveVideoGenerationKind({
        ...base,
        isStoryboardOutput: true,
      }),
      "storyboard",
    );
  });

  it("legacy reference-r2v when not storyboard style", () => {
    assert.equal(resolveVideoGenerationKind(base), "reference-r2v");
  });

  it("product assistant wins when plan exists without reference video", () => {
    assert.equal(
      resolveVideoGenerationKind({
        ...base,
        usesProductAssistant: true,
        videoCreativeMode: "product-assistant",
        useReferenceVideo: false,
        hasReferenceAd: false,
      }),
      "product-assistant",
    );
  });

  it("falls back to image-to-video without reference MP4", () => {
    assert.equal(
      resolveVideoGenerationKind({
        ...base,
        videoCreativeMode: "image-to-video",
        useReferenceVideo: false,
        hasReferenceAd: false,
      }),
      "image-to-video",
    );
  });

  it("reference-concept without MP4 does not select reference-r2v", () => {
    assert.equal(
      resolveVideoGenerationKind({
        ...base,
        hasReferenceAd: false,
      }),
      "image-to-video",
    );
  });
});
