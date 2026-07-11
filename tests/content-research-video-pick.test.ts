import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyContentAngleToWizard } from "../lib/content-research-apply";
import { displayResearchAngles } from "../lib/content-research-enrich";
import { reelAngle, xhsPlan } from "./fixtures/content-research";

describe("content research video pick flow", () => {
  it("displayResearchAngles prefers MP4-ready angles in video-only mode", () => {
    const plan = {
      ...xhsPlan,
      candidates: [
        {
          ...reelAngle,
          id: "post-a",
          sourceVideoUrl: "http://sns-video-v3.xhscdn.com/stream/foo.mp4",
          sourceCoverImageUrl: undefined,
          sourceImageUrls: undefined,
        },
        {
          ...reelAngle,
          id: "post-b",
          sourceVideoUrl: undefined,
          sourceUrl: "https://example.com/not-a-post",
        },
      ],
      topPicks: [],
    };
    const { angles } = displayResearchAngles(plan, { videoOnly: true });
    assert.equal(angles.length, 1);
    assert.equal(angles[0]?.id, "post-a");
  });

  it("applyContentAngleToWizard attaches reel MP4 without note-detail resolve", async () => {
    const angle = {
      ...reelAngle,
      sourceVideoUrl: "http://sns-video-v3.xhscdn.com/stream/foo.mp4",
      sourceCoverImageUrl: "https://sns-i10.rednotecdn.com/cover.jpg?sign=1",
      sourceImageUrls: ["https://sns-i10.rednotecdn.com/cover.jpg?sign=1"],
    };
    const calls: string[] = [];
    const wizard = {
      setHeadline: () => calls.push("headline"),
      setSubline: () => {},
      setOffer: () => {},
      setConceptIdea: () => {},
      setProduct: () => calls.push("product"),
      setPromptExtra: () => {},
      setImageOutputMode: () => {},
      setImageCreativeMode: () => calls.push("imageMode"),
      setImageRefPhoto: () => calls.push("imageRef"),
      onVideoCreativeModeChange: () => calls.push("videoMode"),
      onReferenceAdFile: (file: File | null) => calls.push(`video:${file?.size ?? 0}`),
      onWorkflowModeChange: () => calls.push("workflow"),
      selectVisualStyle: () => calls.push("style"),
    };

    const { refs } = await applyContentAngleToWizard(
      angle,
      xhsPlan,
      "physical",
      wizard,
      "粉水晶手串",
      {
        fetchResearchImagesAsFiles: async () => [new File(["x"], "cover.jpg", { type: "image/jpeg" })],
        fetchResearchVideoAsFile: async () =>
          new File([new Uint8Array(2048)], "xiaohongshu-reference.mp4", { type: "video/mp4" }),
        resolveResearchPostVideo: async () => {
          throw new Error("resolve should not run when sourceVideoUrl exists");
        },
      },
    );

    assert.equal(refs.videoAttached, true);
    assert.ok(calls.includes("video:2048"));
    assert.ok(calls.includes("workflow"));
    assert.ok(calls.includes("style"));
  });
});
