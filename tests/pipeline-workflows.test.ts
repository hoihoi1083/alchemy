import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildContentAngleHandoff } from "../lib/content-research-apply";
import { isContentResearchStyleExtra } from "../lib/content-research-promote";
import { resolveReferenceStrategy } from "../lib/reference-strategy";
import {
  PROMOTE_PRODUCT,
  reelAngle,
  xhsPlan,
  zodiacCarouselAngle,
} from "./fixtures/content-research";

type WorkflowCase = {
  id: string;
  angle: typeof zodiacCarouselAngle;
  promoteProduct: string;
  expectWorkflow: "image-only" | "video-only";
  expectOutput: "teaching-carousel" | "single" | "campaign" | undefined;
  expectRefs: "images" | "video";
};

const WORKFLOWS: WorkflowCase[] = [
  {
    id: "image-teaching-carousel",
    angle: zodiacCarouselAngle,
    promoteProduct: PROMOTE_PRODUCT,
    expectWorkflow: "image-only",
    expectOutput: "teaching-carousel",
    expectRefs: "images",
  },
  {
    id: "video-reel",
    angle: reelAngle,
    promoteProduct: PROMOTE_PRODUCT,
    expectWorkflow: "video-only",
    expectOutput: "single",
    expectRefs: "video",
  },
];

describe("end-to-end workflow handoff matrix", () => {
  for (const wf of WORKFLOWS) {
    it(`${wf.id}: product-centric prompt + correct mode`, () => {
      const handoff = buildContentAngleHandoff(
        wf.angle,
        xhsPlan,
        "physical",
        wf.promoteProduct,
      );
      assert.equal(handoff.workflowMode, wf.expectWorkflow);
      assert.equal(handoff.product, wf.promoteProduct);
      assert.ok(isContentResearchStyleExtra(handoff.promptExtra));
      assert.ok(handoff.promptExtra?.includes(wf.promoteProduct));
      if (wf.expectOutput) {
        assert.equal(handoff.imageOutputMode, wf.expectOutput);
      }
      if (wf.expectRefs === "images") {
        assert.ok((handoff.referencePostImageUrls?.length ?? 0) >= 2);
      }
      if (wf.expectRefs === "video") {
        assert.ok(handoff.referencePostVideoUrl);
      }

      const strategy = resolveReferenceStrategy({
        promotionMode: "physical",
        imageOutputMode: handoff.imageOutputMode ?? "single",
        visualStyleId: handoff.visualStyleId ?? "product",
        imageCreativeMode: "reference-concept",
        hasReferenceUpload: true,
        hasProductPhoto: false,
        hasReferenceBrief: true,
      });
      assert.ok(
        strategy.kind === "style-only" || strategy.kind === "mood-only",
        `expected style-only for ${wf.id}, got ${strategy.kind}`,
      );
    });
  }

  it("combined workflow: image handoff can proceed to video with same product fields", () => {
    const imageHandoff = buildContentAngleHandoff(
      zodiacCarouselAngle,
      xhsPlan,
      "physical",
      PROMOTE_PRODUCT,
    );
    assert.equal(imageHandoff.workflowMode, "image-only");
    const videoHandoff = buildContentAngleHandoff(
      reelAngle,
      xhsPlan,
      "physical",
      PROMOTE_PRODUCT,
    );
    assert.equal(videoHandoff.workflowMode, "video-only");
    assert.equal(imageHandoff.product, videoHandoff.product);
  });
});
