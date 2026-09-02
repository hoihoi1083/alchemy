import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildH3ShotRecipePrompt,
  buildH3ShotRecipeStillPrompt,
  clampDesignStudioMgDurationSec,
  designStudioMgDurationOptions,
  h3ShotRecipeAllowsKineticType,
  isH3ShotRecipeMode,
  resolveH3DesignStudioMgScheme,
} from "../lib/h3-shot-recipes";
import {
  isRecipeOwnedVideoMode,
  videoModeHidesAutoDuration,
} from "../lib/creative-workflow";
import { isLandingRecipeId, LANDING_RECIPES } from "../lib/landing-recipes";

describe("h3-design-studio-mg", () => {
  it("registers as recipe-owned H3 mode with kinetic type and no auto", () => {
    assert.equal(isH3ShotRecipeMode("h3-design-studio-mg"), true);
    assert.equal(isRecipeOwnedVideoMode("h3-design-studio-mg"), true);
    assert.equal(h3ShotRecipeAllowsKineticType("h3-design-studio-mg"), true);
    assert.equal(videoModeHidesAutoDuration("h3-design-studio-mg"), true);
    assert.deepEqual(designStudioMgDurationOptions(), ["10", "12"]);
    assert.equal(clampDesignStudioMgDurationSec("auto"), 12);
    assert.equal(clampDesignStudioMgDurationSec("10"), 10);
    assert.equal(clampDesignStudioMgDurationSec(14), 12);
  });

  it("resolves Form study / Brand desk schemes", () => {
    assert.equal(
      resolveH3DesignStudioMgScheme({ pick: "form-study" }),
      "form-study",
    );
    assert.equal(
      resolveH3DesignStudioMgScheme({ pick: "brand-desk" }),
      "brand-desk",
    );
    assert.equal(
      resolveH3DesignStudioMgScheme({
        pick: "auto",
        headline: "portfolio showreel moodboard",
      }),
      "brand-desk",
    );
    assert.equal(
      resolveH3DesignStudioMgScheme({
        pick: "auto",
        conceptIdea: "form study sphere morph",
      }),
      "form-study",
    );
  });

  it("builds timed bright design-desk prompts", () => {
    const form = buildH3ShotRecipePrompt({
      mode: "h3-design-studio-mg",
      conceptMode: true,
      product: "AG DESIGN",
      designStudioMgScheme: "form-study",
      durationSec: 12,
    });
    assert.match(form, /Form study|形态|设计台|FORM/i);
    assert.match(form, /12/);
    assert.match(form, /绘图台|设计台|明亮/);

    const desk = buildH3ShotRecipePrompt({
      mode: "h3-design-studio-mg",
      conceptMode: true,
      product: "AG DESIGN",
      designStudioMgScheme: "brand-desk",
      durationSec: 10,
    });
    assert.match(desk, /Brand desk|情绪板|UI/i);

    const still = buildH3ShotRecipeStillPrompt({
      mode: "h3-design-studio-mg",
      conceptMode: true,
      product: "AG DESIGN",
      designStudioMgScheme: "form-study",
    });
    assert.match(still, /drafting|glass|cursor|design/i);
  });

  it("has concept + product landing recipes at 12s", () => {
    assert.ok(isLandingRecipeId("concept-h3-design-studio-mg-12s"));
    assert.ok(isLandingRecipeId("product-h3-design-studio-mg-12s"));
    assert.equal(
      LANDING_RECIPES["concept-h3-design-studio-mg-12s"].videoCreativeMode,
      "h3-design-studio-mg",
    );
    assert.equal(
      LANDING_RECIPES["concept-h3-design-studio-mg-12s"].duration,
      "12",
    );
  });

  it("wires wizard generate switch and scheme state", () => {
    const src = readFileSync(
      join(process.cwd(), "hooks/useStudioWizard.ts"),
      "utf8",
    );
    assert.match(src, /case "h3-design-studio-mg":/);
    assert.match(src, /h3DesignStudioMgSchemePick/);
    assert.match(src, /clampDesignStudioMgDurationSec/);
    assert.match(src, /H3_DESIGN_STUDIO_MG_NEGATIVE/);
  });
});
