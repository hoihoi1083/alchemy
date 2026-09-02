import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildH3ShotRecipePrompt,
  buildH3ShotRecipeStillPrompt,
  clampGlassTypeMgDurationSec,
  glassTypeMgDurationOptions,
  h3ShotRecipeAllowsKineticType,
  isH3ShotRecipeMode,
  resolveH3GlassTypeMgScheme,
} from "../lib/h3-shot-recipes";
import {
  isRecipeOwnedVideoMode,
  videoModeHidesAutoDuration,
} from "../lib/creative-workflow";
import { isLandingRecipeId, LANDING_RECIPES } from "../lib/landing-recipes";

describe("h3-glass-type-mg", () => {
  it("registers as recipe-owned H3 mode with kinetic type and no auto", () => {
    assert.equal(isH3ShotRecipeMode("h3-glass-type-mg"), true);
    assert.equal(isRecipeOwnedVideoMode("h3-glass-type-mg"), true);
    assert.equal(h3ShotRecipeAllowsKineticType("h3-glass-type-mg"), true);
    assert.equal(videoModeHidesAutoDuration("h3-glass-type-mg"), true);
    assert.deepEqual(glassTypeMgDurationOptions(), ["10", "12"]);
    assert.equal(clampGlassTypeMgDurationSec("auto"), 12);
    assert.equal(clampGlassTypeMgDurationSec("10"), 10);
    assert.equal(clampGlassTypeMgDurationSec(14), 12);
  });

  it("resolves Click / Parade schemes", () => {
    assert.equal(
      resolveH3GlassTypeMgScheme({ pick: "click-reveal" }),
      "click-reveal",
    );
    assert.equal(
      resolveH3GlassTypeMgScheme({ pick: "type-parade" }),
      "type-parade",
    );
    assert.equal(
      resolveH3GlassTypeMgScheme({
        pick: "auto",
        headline: "isometric DESIGN wordmark",
      }),
      "type-parade",
    );
    assert.equal(
      resolveH3GlassTypeMgScheme({
        pick: "auto",
        conceptIdea: "cursor click ripple",
      }),
      "click-reveal",
    );
  });

  it("builds timed bright-studio prompts", () => {
    const click = buildH3ShotRecipePrompt({
      mode: "h3-glass-type-mg",
      conceptMode: true,
      product: "AG DESIGN",
      glassTypeMgScheme: "click-reveal",
      durationSec: 12,
    });
    assert.match(click, /透明3D|Click reveal|光标|压印/i);
    assert.match(click, /12/);
    assert.match(click, /明亮|浅灰|米白/);

    const parade = buildH3ShotRecipePrompt({
      mode: "h3-glass-type-mg",
      conceptMode: true,
      product: "GOOGLE",
      glassTypeMgScheme: "type-parade",
      durationSec: 10,
    });
    assert.match(parade, /Type parade|字列|等距/i);

    const still = buildH3ShotRecipeStillPrompt({
      mode: "h3-glass-type-mg",
      conceptMode: true,
      product: "AG DESIGN",
      glassTypeMgScheme: "click-reveal",
    });
    assert.match(still, /glass|cursor|deboss|translucent/i);
  });

  it("has concept + product landing recipes at 12s", () => {
    assert.ok(isLandingRecipeId("concept-h3-glass-type-mg-12s"));
    assert.ok(isLandingRecipeId("product-h3-glass-type-mg-12s"));
    assert.equal(
      LANDING_RECIPES["concept-h3-glass-type-mg-12s"].videoCreativeMode,
      "h3-glass-type-mg",
    );
    assert.equal(LANDING_RECIPES["concept-h3-glass-type-mg-12s"].duration, "12");
  });

  it("wires wizard generate switch and scheme state", () => {
    const src = readFileSync(
      join(process.cwd(), "hooks/useStudioWizard.ts"),
      "utf8",
    );
    assert.match(src, /case "h3-glass-type-mg":/);
    assert.match(src, /h3GlassTypeMgSchemePick/);
    assert.match(src, /clampGlassTypeMgDurationSec/);
    assert.match(src, /H3_GLASS_TYPE_MG_NEGATIVE/);
  });
});
