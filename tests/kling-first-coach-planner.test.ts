import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("Kling-first coach / facts / planner contract", () => {
  it("coach generate-storyboard-video teaches Kling not Seedance stitch", () => {
    const src = readFileSync(join(process.cwd(), "lib/studio-assistant-coach.ts"), "utf8");
    assert.match(src, /Kling I2V per scene/);
    assert.doesNotMatch(
      src,
      /generate storyboard video \(Seedance per scene, then stitch\)/,
    );
  });

  it("facts mention Kling multi-clip token ballpark", () => {
    const src = readFileSync(join(process.cwd(), "lib/studio-assistant-facts.ts"), "utf8");
    assert.match(src, /110 tokens/);
    assert.match(src, /Kling/i);
    assert.doesNotMatch(src, /Pay-per-use fal pricing; 8s fast ~\$1\.5 ballpark\./);
  });

  it("storyboard planner prompts are Kling-first", () => {
    const src = readFileSync(join(process.cwd(), "lib/video-storyboard-plan.ts"), "utf8");
    assert.match(src, /Kling I2V per still/);
    assert.doesNotMatch(src, /for Seedance API/);
    assert.doesNotMatch(src, /Seedance prompt must reference/);
  });
});
