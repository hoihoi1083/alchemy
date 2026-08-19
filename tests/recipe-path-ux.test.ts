import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { join } from "node:path";
import {
  identityRecipeHeroReady,
  isIdentityVideoRecipeMode,
  isRecipePathUxMode,
  isVideoRecipeUxMode,
} from "../lib/recipe-path-ux";
import { persistableMediaUrl } from "../lib/wizard-project-snapshot";

describe("identity recipe hero lock", () => {
  it("physical vacuum needs a product photo — not concept copy", () => {
    assert.equal(isIdentityVideoRecipeMode("vacuum-inflate"), true);
    assert.equal(
      identityRecipeHeroReady({
        promotionMode: "physical",
        hasProductPhoto: false,
        hasConceptHero: true,
      }),
      false,
    );
    assert.equal(
      identityRecipeHeroReady({
        promotionMode: "physical",
        hasProductPhoto: true,
        hasConceptHero: false,
      }),
      true,
    );
  });

  it("concept identity recipes need logo/still — text is not a hero", () => {
    assert.equal(
      identityRecipeHeroReady({
        promotionMode: "concept",
        hasProductPhoto: false,
        hasConceptHero: false,
      }),
      false,
    );
    assert.equal(
      identityRecipeHeroReady({
        promotionMode: "concept",
        hasProductPhoto: false,
        hasConceptHero: true,
      }),
      true,
    );
  });

  it("Need-card modes include morph recipes + posters + H3", () => {
    assert.equal(isVideoRecipeUxMode("hand-throw-scene"), true);
    assert.equal(isVideoRecipeUxMode("motion-poster"), true);
    assert.equal(isVideoRecipeUxMode("blockbuster"), true);
    assert.equal(isRecipePathUxMode("ecom-orbit"), true);
    assert.equal(isRecipePathUxMode("designed-poster"), true);
    assert.equal(isRecipePathUxMode("image-to-video"), false);
  });

  it("persistableMediaUrl keeps library paths and drops blobs", () => {
    assert.equal(
      persistableMediaUrl("/api/library/download/aaaaaaaaaaaaaaaaaaaaaaaa?inline=1"),
      "/api/library/download/aaaaaaaaaaaaaaaaaaaaaaaa?inline=1",
    );
    assert.equal(persistableMediaUrl("blob:http://localhost/x"), null);
    assert.equal(persistableMediaUrl("https://cdn.example.com/p.png"), "https://cdn.example.com/p.png");
  });

  it("wizard identity makers refuse text-only concept and bind a hero file", () => {
    const wizard = readFileSync(join(process.cwd(), "hooks/useStudioWizard.ts"), "utf8");
    const vacuum = wizard.slice(
      wizard.indexOf("async function makeVacuumInflateVideo"),
      wizard.indexOf("async function generateCreativeMotionKeyframe"),
    );
    assert.match(vacuum, /identityRecipeHeroReady/);
    assert.doesNotMatch(vacuum, /promotionMode !== "concept"/);
    assert.match(wizard, /bindIdentityHeroToKeyframeForm/);
    assert.match(wizard, /FX plates: product photo only/);
    assert.match(wizard, /resolveHydratedProductPhoto/);
  });
});
