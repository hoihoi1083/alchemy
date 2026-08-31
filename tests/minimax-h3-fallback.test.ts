import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildStoryboardMinimaxH3Prompt,
  clampMinimaxH3Duration,
  clampMinimaxH3ResolutionForPlan,
  formDataExpectsReferenceVideo,
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

  it("maps UI resolution to H3 enums (480p stays 480P)", () => {
    assert.equal(normalizeMinimaxH3Resolution("768p"), "768P");
    assert.equal(normalizeMinimaxH3Resolution("480p"), "480P");
    assert.equal(normalizeMinimaxH3Resolution("720p"), "768P");
    assert.equal(normalizeMinimaxH3Resolution("1080p"), "2K");
    assert.equal(normalizeMinimaxH3Resolution("2K"), "2K");
    assert.equal(normalizeMinimaxH3Resolution("4K"), "4K");
  });

  it("clamps H3 resolution to the plan cap", () => {
    assert.equal(clampMinimaxH3ResolutionForPlan("free", "2K"), "480P");
    assert.equal(clampMinimaxH3ResolutionForPlan("free", "768P"), "480P");
    assert.equal(clampMinimaxH3ResolutionForPlan("standard", "2K"), "768P");
    assert.equal(clampMinimaxH3ResolutionForPlan("standard", "480P"), "480P");
    assert.equal(clampMinimaxH3ResolutionForPlan("pro", "480P"), "480P");
    assert.equal(clampMinimaxH3ResolutionForPlan("master", "4K"), "2K");
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
    assert.match(prompt, /spine/i);
    assert.doesNotMatch(prompt, /optional/i);
    assert.match(prompt, /wardrobe/i);
  });

  it("storyboard H3 keeps type when preserveOnScreenType", () => {
    const prompt = buildStoryboardMinimaxH3Prompt({
      durationSec: 8,
      hasReferenceVideo: false,
      preserveOnScreenType: true,
      scenes: [{ role: "hook" }],
    });
    assert.match(prompt, /Keep existing on-screen wording/i);
    assert.doesNotMatch(prompt, /do not invent on-screen text, logos, or watermarks/i);
  });

  it("omits Video 1 spine when no reference reel", () => {
    const prompt = buildStoryboardMinimaxH3Prompt({
      durationSec: 8,
      hasReferenceVideo: false,
      scenes: [{ role: "establish" }],
    });
    assert.doesNotMatch(prompt, /Video 1 is the spine/i);
    assert.doesNotMatch(prompt, /optional/i);
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

  it("storyboard stills path tries MiniMax H3 before Kling stitch", () => {
    const src = readFileSync(
      join(process.cwd(), "app/api/generate-storyboard-video/route.ts"),
      "utf8",
    );
    assert.ok(src.includes("runMinimaxH3Fallback"));
    assert.ok(src.includes("runKlingStoryboardFallback"));
    assert.ok(src.includes("minimax-h3-storyboard"));
    const h3Idx = src.indexOf("MiniMax H3 first");
    const klingIdx = src.indexOf("Kling fallback");
    assert.ok(h3Idx > 0 && klingIdx > h3Idx);
  });

  it("H3 reference mode accepts wizard `images` as well as reference_images", () => {
    const src = readFileSync(
      join(process.cwd(), "app/api/generate-minimax-h3/route.ts"),
      "utf8",
    );
    assert.match(src, /getAll\("reference_images"\)/);
    assert.match(src, /getAll\("images"\)/);
    // H3 always returns native stereo — do not send Seedance generate_audio.
    assert.doesNotMatch(src, /generate_audio/);
    assert.match(src, /burnMotionPosterTypeOverlay/);
    assert.match(src, /!hasEndFrame/);
    assert.match(src, /preserveOnScreenType: Boolean\(endUrl\)/);
    assert.match(src, /motion_poster_dialect/);
  });

  it("detects @Video1 / reference MP4 as required spine", () => {
    const withUrl = new FormData();
    withUrl.set("reference_video_url", "https://example.com/reel.mp4");
    assert.equal(formDataExpectsReferenceVideo(withUrl), true);

    const withPrompt = new FormData();
    assert.equal(formDataExpectsReferenceVideo(withPrompt, "Follow @Video1 spine."), true);

    const stillsOnly = new FormData();
    stillsOnly.set("prompt", "Orbit the bottle.");
    assert.equal(formDataExpectsReferenceVideo(stillsOnly, "Orbit the bottle."), false);
  });
});
