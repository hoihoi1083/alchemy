import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MINIMAX_MAX_REFERENCE_SEC,
  VERCEL_SAFE_REFERENCE_BYTES,
} from "../lib/reference-video-prepare";

describe("research reel prepare limits", () => {
  it("documents H3 + Vercel-safe reference clip bounds", () => {
    assert.ok(MINIMAX_MAX_REFERENCE_SEC <= 15);
    assert.ok(VERCEL_SAFE_REFERENCE_BYTES < 4.5 * 1024 * 1024);
  });
});

describe("resolveResearchReelVideoBytes", () => {
  it("rejects when neither URL nor file is provided", async () => {
    const { resolveResearchReelVideoBytes } = await import(
      "../lib/research-reel-analyze-input"
    );
    await assert.rejects(
      () => resolveResearchReelVideoBytes({}),
      /Upload a reference reel MP4/,
    );
  });
});
