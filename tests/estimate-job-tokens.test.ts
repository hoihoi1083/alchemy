import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  cannotAfford,
  estimateImageJobTokens,
  estimateVideoPipelineTokens,
} from "@/lib/billing/estimate-job-tokens";
import {
  estimateH3Tokens,
  estimateSocialDripTokens,
  TOKEN_COST,
} from "@/lib/billing/token-costs";

describe("estimateVideoPipelineTokens", () => {
  it("social-drip includes two stills + H3", () => {
    const got = estimateVideoPipelineTokens({
      kind: "social-drip",
      resolution: "480P",
      durationSec: 6,
    });
    assert.equal(
      got,
      estimateSocialDripTokens({ resolution: "480P", duration: 6 }),
    );
    assert.ok(got > estimateH3Tokens({ resolution: "480P", duration: 6 }));
  });

  it("dual-frame recipes include two stills when willGenerateStills", () => {
    const withStills = estimateVideoPipelineTokens({
      kind: "motion-poster",
      resolution: "480P",
      durationSec: 6,
      willGenerateStills: true,
    });
    const without = estimateVideoPipelineTokens({
      kind: "motion-poster",
      resolution: "480P",
      durationSec: 6,
      willGenerateStills: false,
    });
    assert.equal(withStills - without, TOKEN_COST.image * 2);
  });

  it("reference-r2v bills H3 output + reference seconds", () => {
    const got = estimateVideoPipelineTokens({
      kind: "reference-r2v",
      resolution: "720p",
      durationSec: 6,
      willGenerateStills: false,
    });
    assert.equal(
      got,
      estimateH3Tokens({
        resolution: "720p",
        duration: 6,
        referenceVideoSec: 6,
      }),
    );
    assert.ok(got < 1476);
  });

  it("does not clamp long non-recipe durations to 8s", () => {
    const short = estimateVideoPipelineTokens({
      kind: "image-to-video",
      resolution: "480P",
      durationSec: 8,
      willGenerateStills: false,
    });
    const long = estimateVideoPipelineTokens({
      kind: "image-to-video",
      resolution: "480P",
      durationSec: 12,
      willGenerateStills: false,
    });
    assert.ok(long > short);
  });
});

describe("estimateImageJobTokens", () => {
  it("charges A/B and campaign packs", () => {
    assert.equal(estimateImageJobTokens({ mode: "ab" }), TOKEN_COST.image_ab);
    assert.equal(
      estimateImageJobTokens({ mode: "campaign" }),
      TOKEN_COST.campaign,
    );
  });
});

describe("cannotAfford", () => {
  it("blocks when balance is below required", () => {
    assert.equal(cannotAfford(100, 200), true);
    assert.equal(cannotAfford(200, 200), false);
    assert.equal(cannotAfford(null, 200), false);
  });
});
