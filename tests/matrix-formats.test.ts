import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CONTENT_ANGLE_FORMATS } from "../lib/content-research-types";
import { buildContentAngleHandoff } from "../lib/content-research-apply";
import { isImageCarouselAngle } from "../lib/content-research-infer";
import { makeAngle, makePlan } from "./fixtures/angle-factory";
import { PROMOTE_PRODUCT, SEARCH_TOPIC } from "./fixtures/content-research";

const EXPECTED: Record<
  (typeof CONTENT_ANGLE_FORMATS)[number],
  {
    workflow?: "image-only" | "video-only";
    output: string;
    hasImages?: boolean;
    hasVideo?: boolean;
  }
> = {
  "teaching-carousel": {
    workflow: "image-only",
    output: "teaching-carousel",
    hasImages: true,
  },
  "single-image": { workflow: "image-only", output: "single", hasImages: true },
  campaign: { workflow: "image-only", output: "campaign", hasImages: true },
  reel: { workflow: "video-only", output: "single", hasVideo: true },
  "model-wear": { workflow: "image-only", output: "single", hasImages: true },
};

describe("all angle formats — handoff wiring", () => {
  for (const format of CONTENT_ANGLE_FORMATS) {
    it(`format ${format} → correct workflow and refs`, () => {
      const angle = makeAngle(format, { id: `post-${format}-1` });
      const plan = makePlan(SEARCH_TOPIC, "xiaohongshu", [angle]);
      const handoff = buildContentAngleHandoff(angle, plan, "physical", PROMOTE_PRODUCT);
      const exp = EXPECTED[format];

      if (exp.workflow) assert.equal(handoff.workflowMode, exp.workflow);
      assert.equal(handoff.imageOutputMode, exp.output);
      assert.equal(handoff.product, PROMOTE_PRODUCT);

      if (exp.hasImages) {
        assert.ok((handoff.referencePostImageUrls?.length ?? 0) >= 1);
      }
      if (exp.hasVideo) {
        assert.ok(handoff.referencePostVideoUrl);
      }

      const imageCount = handoff.referencePostImageUrls?.length ?? 0;
      if (format === "teaching-carousel") {
        assert.equal(isImageCarouselAngle(format, imageCount), true);
      }
      if (format === "reel") {
        assert.equal(isImageCarouselAngle(format, imageCount), false);
      }
    });
  }
});
