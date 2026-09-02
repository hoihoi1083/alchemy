import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildH3ShotRecipePrompt,
  buildH3ShotRecipeStillPrompt,
  clampTriangleLightMgDurationSec,
  h3ShotRecipeAllowsKineticType,
  isH3ShotRecipeMode,
  resolveH3TriangleLightMgScheme,
  triangleLightMgDurationOptions,
} from "../lib/h3-shot-recipes";
import { isRecipeOwnedVideoMode } from "../lib/creative-workflow";
import { isLandingRecipeId, LANDING_RECIPES } from "../lib/landing-recipes";
import { videoModeHidesAutoDuration } from "../lib/creative-workflow";

describe("h3-triangle-light-mg", () => {
  it("registers as recipe-owned H3 mode with kinetic type and no auto", () => {
    assert.equal(isH3ShotRecipeMode("h3-triangle-light-mg"), true);
    assert.equal(isRecipeOwnedVideoMode("h3-triangle-light-mg"), true);
    assert.equal(h3ShotRecipeAllowsKineticType("h3-triangle-light-mg"), true);
    assert.equal(videoModeHidesAutoDuration("h3-triangle-light-mg"), true);
    assert.deepEqual(triangleLightMgDurationOptions(), ["10", "12"]);
    assert.equal(clampTriangleLightMgDurationSec("auto"), 10);
    assert.equal(clampTriangleLightMgDurationSec("12"), 12);
  });

  it("resolves Exhibit / Flow schemes", () => {
    assert.equal(
      resolveH3TriangleLightMgScheme({ pick: "exhibit" }),
      "exhibit",
    );
    assert.equal(resolveH3TriangleLightMgScheme({ pick: "flow" }), "flow");
    assert.equal(
      resolveH3TriangleLightMgScheme({
        pick: "auto",
        conceptIdea: "流动三角 mapping",
      }),
      "flow",
    );
    assert.equal(
      resolveH3TriangleLightMgScheme({
        pick: "auto",
        headline: "三角光艺术展",
      }),
      "exhibit",
    );
  });

  it("builds timed prompts for both schemes", () => {
    const exhibit = buildH3ShotRecipePrompt({
      mode: "h3-triangle-light-mg",
      conceptMode: true,
      product: "LIGHTME",
      headline: "从光千里",
      triangleLightMgScheme: "exhibit",
      durationSec: 10,
    });
    assert.match(exhibit, /三角光|Exhibit|艺术展/i);
    assert.match(exhibit, /10s|10 秒|EXACTLY 10|runtime 10/i);

    const flow = buildH3ShotRecipePrompt({
      mode: "h3-triangle-light-mg",
      conceptMode: true,
      product: "LIGHTME",
      triangleLightMgScheme: "flow",
      durationSec: 12,
    });
    assert.match(flow, /Flow|流动/i);
    assert.match(flow, /12/);

    const still = buildH3ShotRecipeStillPrompt({
      mode: "h3-triangle-light-mg",
      conceptMode: true,
      product: "LIGHTME",
      triangleLightMgScheme: "exhibit",
    });
    assert.match(still, /triangle|三角|caustic|frost/i);
  });

  it("has concept + product landing recipes at 10s", () => {
    assert.ok(isLandingRecipeId("concept-h3-triangle-light-mg-10s"));
    assert.ok(isLandingRecipeId("product-h3-triangle-light-mg-10s"));
    assert.equal(
      LANDING_RECIPES["concept-h3-triangle-light-mg-10s"].videoCreativeMode,
      "h3-triangle-light-mg",
    );
    assert.equal(
      LANDING_RECIPES["concept-h3-triangle-light-mg-10s"].duration,
      "10",
    );
  });

  it("wires wizard generate switch and scheme state", () => {
    const src = readFileSync(
      join(process.cwd(), "hooks/useStudioWizard.ts"),
      "utf8",
    );
    assert.match(src, /case "h3-triangle-light-mg":/);
    assert.match(src, /h3TriangleLightMgSchemePick/);
    assert.match(src, /clampTriangleLightMgDurationSec/);
    assert.match(src, /H3_TRIANGLE_LIGHT_MG_NEGATIVE/);
  });
});
