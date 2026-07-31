import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseOrRepairVisionJson } from "../lib/vision-json-repair";

describe("parseOrRepairVisionJson", () => {
  it("parses clean json without DeepSeek", async () => {
    const out = await parseOrRepairVisionJson<{ topic: string }>(
      '{"topic":"power bank"}',
      "test",
      '{"topic":""}',
    );
    assert.equal(out.topic, "power bank");
  });

  it("parses json after think block", async () => {
    const raw = `<think>planning...</think>\n{"topic":"adapter","sceneSummary":"desk"}`;
    const out = await parseOrRepairVisionJson<{ topic: string; sceneSummary: string }>(
      raw,
      "test",
      '{"topic":"","sceneSummary":""}',
    );
    assert.equal(out.topic, "adapter");
  });
});
