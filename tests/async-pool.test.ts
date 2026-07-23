import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mapPool } from "@/lib/async-pool";

describe("mapPool", () => {
  it("preserves order with concurrency", async () => {
    const started: number[] = [];
    const out = await mapPool([10, 20, 30, 40], 2, async (n, i) => {
      started.push(i);
      await new Promise((r) => setTimeout(r, 20 - i));
      return n * 2;
    });
    assert.deepEqual(out, [20, 40, 60, 80]);
    assert.equal(started.length, 4);
  });
});
