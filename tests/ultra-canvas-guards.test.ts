import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  shouldBlockUltraCanvasSave,
  tryAcquireRunAllLatch,
} from "../lib/ultra-canvas-guards";

describe("ultra-canvas-guards", () => {
  it("blocks save while board is busy", () => {
    assert.equal(shouldBlockUltraCanvasSave(false), false);
    assert.equal(shouldBlockUltraCanvasSave(true), true);
  });

  it("run-all latch rejects second start", () => {
    assert.equal(tryAcquireRunAllLatch(false), true);
    assert.equal(tryAcquireRunAllLatch(true), false);
  });
});
