import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildStoryboardMinimaxH3Prompt,
  clampMinimaxH3Duration,
  normalizeMinimaxH3Resolution,
  seedancePromptToMinimaxH3,
} from "../lib/minimax-h3-run";

describe("MiniMax H3 Seedance fallback helpers", () => {
  it("rewrites Seedance @Image/@Video tags for H3 grammar", () => {
    const out = seedancePromptToMinimaxH3(
      "@Image1 is the product. Copy @Video1 pacing only.",
    );
    assert.equal(out, "Image 1 is the product. Copy Video 1 pacing only.");
  });

  it("clamps duration into H3 5–15s range", () => {
    assert.equal(clampMinimaxH3Duration(3), 5);
    assert.equal(clampMinimaxH3Duration(6), 6);
    assert.equal(clampMinimaxH3Duration(20), 15);
    assert.equal(clampMinimaxH3Duration("auto"), 8);
  });

  it("maps Seedance-style resolution to fal H3 enums (768P not 768p)", () => {
    assert.equal(normalizeMinimaxH3Resolution("768p"), "768P");
    assert.equal(normalizeMinimaxH3Resolution("480p"), "768P");
    assert.equal(normalizeMinimaxH3Resolution("720p"), "768P");
    assert.equal(normalizeMinimaxH3Resolution("1080p"), "2K");
    assert.equal(normalizeMinimaxH3Resolution("2K"), "2K");
    assert.equal(normalizeMinimaxH3Resolution("4K"), "4K");
  });

  it("builds storyboard H3 prompt with Image N beats and no stitch", () => {
    const prompt = buildStoryboardMinimaxH3Prompt({
      theme: "Serum UGC",
      durationSec: 8,
      hasReferenceVideo: true,
      scenes: [
        { role: "hook", cameraMotionEn: "push-in" },
        { role: "demo", cameraMotionEn: "hand apply" },
      ],
      motionPlan: "@Image1 hero product",
    });
    assert.match(prompt, /Image 1 is storyboard frame 1/);
    assert.match(prompt, /Image 2 is storyboard frame 2/);
    assert.match(prompt, /Video 1/);
    assert.match(prompt, /continuous 8s/);
    assert.match(prompt, /Image 1 hero product/);
  });

  it("generate route tries MiniMax H3 before Kling on Seedance 422", () => {
    const src = readFileSync(join(process.cwd(), "app/api/generate/route.ts"), "utf8");
    assert.ok(src.includes("runMinimaxH3Fallback"));
    assert.ok(src.includes("runKlingStoryboardFallback"));
    const h3Idx = src.indexOf("runMinimaxH3Fallback");
    const klingIdx = src.indexOf(
      "[api/generate] Seedance 422 → Kling fallback",
    );
    assert.ok(h3Idx > 0 && klingIdx > h3Idx, "H3 fallback must run before Kling log");
  });

  it("storyboard route tries MiniMax H3 before Kling stitch", () => {
    const src = readFileSync(
      join(process.cwd(), "app/api/generate-kling-storyboard/route.ts"),
      "utf8",
    );
    assert.ok(src.includes("runMinimaxH3Fallback"));
    assert.ok(src.includes("runKlingStoryboardFallback"));
    assert.ok(src.includes("minimax-h3-storyboard"));
    const h3Idx = src.indexOf("MiniMax H3 first");
    const klingIdx = src.indexOf("Kling fallback");
    assert.ok(h3Idx > 0 && klingIdx > h3Idx);
  });
});
