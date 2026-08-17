import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("Stitched-fallback coach / facts / planner contract", () => {
  it("coach generate-storyboard-video teaches stitch fallback not reference-reel per-scene", () => {
    const src = readFileSync(join(process.cwd(), "lib/studio-assistant-coach.ts"), "utf8");
    assert.match(src, /stitched fallback video/i);
    assert.doesNotMatch(
      src,
      /generate storyboard video \(Seedance per scene, then stitch\)/,
    );
  });

  it("facts mention stitched multi-clip token ballpark", () => {
    const src = readFileSync(join(process.cwd(), "lib/studio-assistant-facts.ts"), "utf8");
    assert.match(src, /1136/);
    assert.match(src, /stitched fallback/i);
    assert.doesNotMatch(src, /Pay-per-use fal pricing; 8s fast ~\$1\.5 ballpark\./);
  });

  it("storyboard planner prompts do not name video vendors", () => {
    const src = readFileSync(join(process.cwd(), "lib/video-storyboard-plan.ts"), "utf8");
    assert.match(src, /per-still clips then stitch/);
    assert.doesNotMatch(src, /for Seedance API/);
    assert.doesNotMatch(src, /Seedance prompt must reference/);
    assert.doesNotMatch(src, /Kling I2V per still/);
    assert.doesNotMatch(src, /MiniMax H3/);
  });
});
