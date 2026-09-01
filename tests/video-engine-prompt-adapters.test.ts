import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  adaptScriptForKlingFallback,
  adaptScriptForMinimaxH3,
  ensureSeedanceReferenceTags,
  friendlyAutoFallbackNote,
} from "../lib/video-engine-prompt-adapters";
import { buildH3ReferenceReelProductPrompt } from "../lib/h3-product-swap-prompt";

const DEEPSEEK_SCRIPT = [
  "UGC-style review video, cozy home setting.",
  "@Video1 provides quick energetic editing.",
  "@Image1 is a white dropper bottle with white cap.",
  "0-2s: Close-up of hands holding the white dropper bottle, squeezing dropper.",
  "2-5s: Cut to a young woman applying the serum to her cheek.",
  "5-10s: She smiles, gives a thumbs up to camera.",
  "Silent video output: no speech.",
].join(" ");

describe("video-engine-prompt-adapters (auto Seedance→H3→Kling)", () => {
  it("Seedance tags stay @Image/@Video", () => {
    const { prompt, added } = ensureSeedanceReferenceTags(
      "Hero the product with soft light.",
      1,
      1,
      0,
    );
    assert.deepEqual(added, ["@Image1", "@Video1"]);
    assert.match(prompt, /^@Image1 @Video1 /);
  });

  it("motion poster H3 stays textless so ffmpeg can burn type", () => {
    const h3 = adaptScriptForMinimaxH3({
      seedancePrompt:
        "Designed motion poster. Image 1 is the textless poster scene plate. TEXTLESS FRAME: do not invent on-screen text.",
      imageCount: 1,
      videoCount: 0,
      preserveOnScreenType: false,
    });
    assert.match(h3, /do not invent on-screen text/i);
    assert.doesNotMatch(h3, /Keep poster wording identical/i);
  });

  it("storyboard 有字 H3 keeps existing typography", () => {
    const h3 = adaptScriptForMinimaxH3({
      seedancePrompt: "Image 1 is storyboard frame 1 with printed headline.",
      imageCount: 1,
      videoCount: 0,
      preserveOnScreenType: true,
    });
    assert.match(h3, /Keep poster wording|Type may fade|KINETIC TYPE/i);
    assert.doesNotMatch(h3, /Do not invent on-screen text/);
  });

  it("H3 reel product swap prompt locks Image 1 and strips reel SKU role", () => {
    const prompt = buildH3ReferenceReelProductPrompt({
      durationSec: 6,
      productName: "Portable power bank",
      motionSummary: "Quick handheld cuts",
    });
    assert.match(prompt, /Image 1 is the ONLY on-screen product/i);
    assert.match(prompt, /Video 1 is camera path/i);
    assert.match(prompt, /Quick handheld cuts/);
    assert.doesNotMatch(prompt, /@Video1|@Image1/);
  });

  it("MiniMax R2V prepends explicit product-swap roles when video + image", () => {
    const h3 = adaptScriptForMinimaxH3({
      seedancePrompt: DEEPSEEK_SCRIPT,
      imageCount: 1,
      videoCount: 1,
    });
    assert.match(h3, /Video 1 = camera path/i);
    assert.match(h3, /Image 1 = the ONLY product/i);
    assert.match(h3, /Do NOT copy the product object/i);
  });

  it("MiniMax gets Image/Video grammar + same timed beats", () => {
    const h3 = adaptScriptForMinimaxH3({
      seedancePrompt: DEEPSEEK_SCRIPT,
      imageCount: 1,
      videoCount: 1,
    });
    assert.match(h3, /Image 1/);
    assert.match(h3, /Video 1/);
    assert.doesNotMatch(h3, /@Image|@Video/);
    assert.match(h3, /0-2s:|dropper/i);
    assert.match(h3, /thumbs up/i);
  });

  it("Kling gets English beat plan, not raw Seedance marketing blob", () => {
    const plan = adaptScriptForKlingFallback({
      seedancePrompt: DEEPSEEK_SCRIPT,
      totalDurationSec: 10,
      imageUrls: ["https://example.com/product.png"],
    });
    assert.equal(plan.imageUrls.length, 2);
    assert.ok(plan.motionPrompt.length > 20);
    assert.doesNotMatch(plan.motionPrompt, /@Image|Silent video output/i);
    assert.ok(plan.scenesMeta.every((s) => (s.cameraMotionEn?.length ?? 0) > 8));
    assert.match(friendlyAutoFallbackNote("kling", 2), /combined/i);
  });

  it("Kling theme is concept promo when conceptMode", () => {
    const plan = adaptScriptForKlingFallback({
      seedancePrompt: DEEPSEEK_SCRIPT,
      totalDurationSec: 10,
      imageUrls: ["https://example.com/scene.png"],
      conceptMode: true,
    });
    assert.equal(plan.theme, "concept promo");
  });

  it("generate route wires adapters for automatic fallback", () => {
    const { readFileSync } = require("node:fs") as typeof import("node:fs");
    const { join } = require("node:path") as typeof import("node:path");
    const src = readFileSync(join(process.cwd(), "app/api/generate/route.ts"), "utf8");
    assert.ok(src.includes("adaptScriptForMinimaxH3"));
    assert.ok(src.includes("adaptScriptForKlingFallback"));
    assert.ok(src.includes("friendlyAutoFallbackNote"));
    assert.ok(src.includes("REFERENCE_VIDEO_REQUIRED"));
    assert.ok(src.includes("formDataExpectsReferenceVideo"));
  });
});
