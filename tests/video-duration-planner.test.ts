import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { videoDurationPlannerBlock } from "../lib/video-duration-planner";

describe("videoDurationPlannerBlock script quality", () => {
  it("gives different script beats for 4s vs 10s", () => {
    const short = videoDurationPlannerBlock(4).join("\n");
    const longer = videoDurationPlannerBlock(10).join("\n");
    assert.match(short, /EXACTLY 4 seconds/);
    assert.match(short, /ONE continuous beat|0\.0–1\.0s HOOK/i);
    assert.match(longer, /EXACTLY 10 seconds/);
    assert.match(longer, /DEMO \/ proof|SETUP/i);
    assert.notEqual(short, longer);
  });

  it("allows flexible scene count while requiring a complete arc", () => {
    const block = videoDurationPlannerBlock(8).join("\n");
    assert.match(block, /Scene\/shot COUNT is flexible/i);
    assert.match(block, /standalone complete short ad/i);
  });
});
