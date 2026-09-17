import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildSwiftChromaRunStillPrompt,
  buildSwiftChromaRunVideoPrompt,
  clampSwiftChromaRunDurationSec,
  resolveSwiftChromaRunDialect,
  swiftChromaRunDurationOptions,
  swiftChromaRunMotionStrength,
} from "../lib/swift-chroma-run";
import {
  isRecipeOwnedVideoMode,
  videoModeHidesAutoDuration,
} from "../lib/creative-workflow";
import { isLandingRecipeId, LANDING_RECIPES } from "../lib/landing-recipes";
import { resolveVideoGenerationKind } from "../lib/video-generation-path";

describe("swift-chroma-run", () => {
  it("registers as recipe-owned mode with no auto duration", () => {
    assert.equal(isRecipeOwnedVideoMode("swift-chroma-run"), true);
    assert.equal(videoModeHidesAutoDuration("swift-chroma-run"), true);
    assert.deepEqual(swiftChromaRunDurationOptions(), ["8", "10"]);
    assert.equal(clampSwiftChromaRunDurationSec("auto"), 8);
    assert.equal(clampSwiftChromaRunDurationSec("8"), 8);
    assert.equal(clampSwiftChromaRunDurationSec(14), 10);
  });

  it("resolves Street / Vault / Lockup dialects", () => {
    assert.equal(
      resolveSwiftChromaRunDialect({ pick: "street-chase" }),
      "street-chase",
    );
    assert.equal(
      resolveSwiftChromaRunDialect({ pick: "vault-punch" }),
      "vault-punch",
    );
    assert.equal(
      resolveSwiftChromaRunDialect({ pick: "graphic-lockup" }),
      "graphic-lockup",
    );
    assert.equal(
      resolveSwiftChromaRunDialect({
        pick: "auto",
        headline: "vault leap jump",
      }),
      "vault-punch",
    );
    assert.equal(
      resolveSwiftChromaRunDialect({ pick: "auto" }),
      "street-chase",
    );
  });

  it("builds still and video prompts with 疾行幻彩 DNA", () => {
    const still = buildSwiftChromaRunStillPrompt({
      dialect: "street-chase",
      product: "portable power station",
      frame: "start",
    });
    assert.match(still, /MID-JOG|run|neon|triangle|chroma|疾行/i);
    assert.match(still, /3:4/);
    assert.match(still, /PRODUCT STAGING|runner|SKU/i);
    assert.match(still, /FULL-BODY|natural|hug|strap|disembodied/i);
    assert.match(still, /FORBIDDEN:.*type-behind|NOT type-behind|Not type-behind/i);

    const concept = buildSwiftChromaRunStillPrompt({
      dialect: "vault-punch",
      product: "street model",
      frame: "start",
      conceptMode: true,
    });
    assert.match(concept, /CONCEPT STAGING|runner/i);
    assert.doesNotMatch(concept, /PRODUCT STAGING/);

    const video = buildSwiftChromaRunVideoPrompt({
      dialect: "street-chase",
      product: "portable power station",
      durationSec: 8,
    });
    assert.match(video, /8/);
    assert.match(video, /STREET CHASE|jog|neon|chroma/i);
    assert.match(video, /FULL-BODY|disembodied|FAILED|packshot/i);
    assert.equal(swiftChromaRunMotionStrength("street-chase"), 78);
    assert.equal(swiftChromaRunMotionStrength("vault-punch"), 82);
  });

  it("has concept + product landing recipes at 8s", () => {
    assert.ok(isLandingRecipeId("product-swift-chroma-run-8s"));
    assert.ok(isLandingRecipeId("concept-swift-chroma-run-8s"));
    assert.equal(
      LANDING_RECIPES["product-swift-chroma-run-8s"].videoCreativeMode,
      "swift-chroma-run",
    );
    assert.equal(LANDING_RECIPES["product-swift-chroma-run-8s"].duration, "8");
  });

  it("resolves generation kind and wires wizard", () => {
    assert.equal(
      resolveVideoGenerationKind({
        videoCreativeMode: "swift-chroma-run",
        workflowMode: "video-only",
      }),
      "swift-chroma-run",
    );
    const wiz = readFileSync(
      join(process.cwd(), "hooks/useStudioWizard.ts"),
      "utf8",
    );
    assert.match(wiz, /case "swift-chroma-run"/);
    assert.match(wiz, /makeSwiftChromaRunVideo/);
    assert.match(wiz, /swiftChromaDialectPick/);
    assert.match(wiz, /makeSwiftChromaRunVideo[\s\S]*?keepNativeAudio:\s*true/);
  });
});
