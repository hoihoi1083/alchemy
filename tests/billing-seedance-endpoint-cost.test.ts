import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  seedanceEndpointUsesFastTier,
  videoTokenCostFromSeedanceEndpoint,
} from "@/lib/billing/charge";
import { estimateVideoTokens } from "@/lib/billing/token-costs";

describe("seedance endpoint billing", () => {
  it("detects fast tier from resolved fal endpoint", () => {
    assert.equal(
      seedanceEndpointUsesFastTier(
        "bytedance/seedance-2.0/fast/image-to-video",
      ),
      true,
    );
    assert.equal(
      seedanceEndpointUsesFastTier("bytedance/seedance-2.0/text-to-video"),
      false,
    );
  });

  it("bills standard tier when client sends fast=true but standard endpoint", () => {
    const standard = videoTokenCostFromSeedanceEndpoint({
      resolution: "720p",
      duration: 8,
      endpoint: "bytedance/seedance-2.0/image-to-video",
    });
    const fastOnly = estimateVideoTokens({
      resolution: "720p",
      fast: true,
      duration: 8,
    });
    assert.ok(standard > fastOnly);
    assert.equal(standard, 1968);
    assert.equal(fastOnly, 1568);
  });

  it("bills fast tier when resolved endpoint is /fast/", () => {
    const cost = videoTokenCostFromSeedanceEndpoint({
      resolution: "720p",
      duration: 8,
      endpoint: "bytedance/seedance-2.0/fast/image-to-video",
    });
    assert.equal(cost, 1568);
  });
});
