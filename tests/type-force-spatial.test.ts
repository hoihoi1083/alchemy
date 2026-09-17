import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isTypeForceSpatialDialect,
  resolveTypeForceDialect,
  TYPE_FORCE_DIALECT_IDS,
  TYPE_FORCE_PRODUCT_DIALECT_IDS,
  TYPE_FORCE_SPATIAL_DIALECT_IDS,
  typeForceDialectClause,
  typeForceSpatialSceneClause,
} from "../lib/type-force";
import { buildTypeForceImagePrompt } from "../lib/prompt-variables";

describe("type-force spatial dialects", () => {
  it("includes product + spatial ids", () => {
    assert.equal(TYPE_FORCE_PRODUCT_DIALECT_IDS.length, 4);
    assert.equal(TYPE_FORCE_SPATIAL_DIALECT_IDS.length, 4);
    assert.equal(TYPE_FORCE_DIALECT_IDS.length, 8);
  });

  it("resolves spatial cues", () => {
    assert.equal(resolveTypeForceDialect("auto", "buckle column load"), "buckle");
    assert.equal(resolveTypeForceDialect("auto", "shear offset wall"), "shear");
    assert.equal(resolveTypeForceDialect("auto", "空間海報 type study"), "standing-wave");
    assert.equal(resolveTypeForceDialect("auto", "bend flexural weights"), "bend");
  });

  it("keeps product cues", () => {
    assert.equal(resolveTypeForceDialect("auto", "headphones audio"), "sound-wave");
    assert.equal(isTypeForceSpatialDialect("standing-wave"), true);
    assert.equal(isTypeForceSpatialDialect("sound-wave"), false);
  });

  it("emits spatial clauses with exclusive physics + anti-mix forbids", () => {
    const wave = typeForceDialectClause("standing-wave");
    assert.match(wave, /STANDING WAVE|RIBBON/i);
    assert.match(wave, /MANDATORY VISIBLE DEFORMATION|UNDULATION|peaks/i);
    assert.match(wave, /FORBIDDEN/i);
    assert.match(wave, /flat|rigid|shear|slab/i);

    const bend = typeForceDialectClause("bend");
    assert.match(bend, /BEND|FLEXURAL|cable/i);
    assert.match(bend, /MANDATORY VISIBLE DEFORMATION|SAG|DEFLECT/i);
    assert.match(bend, /FORBIDDEN/i);
    assert.match(bend, /props-only|perfectly straight|taffy|melt/i);

    const buckle = typeForceDialectClause("buckle");
    assert.match(buckle, /BUCKLE|I-beam|column/i);
    assert.match(buckle, /MANDATORY VISIBLE DEFORMATION|bow|S-curve/i);
    assert.match(buckle, /FORBIDDEN/i);
    assert.match(buckle, /props-only|plumb|cable|hanging weights/i);

    const shear = typeForceDialectClause("shear");
    assert.match(shear, /SHEAR|lateral|slab/i);
    assert.match(shear, /MANDATORY VISIBLE DEFORMATION|OFFSET|stagger/i);
    assert.match(shear, /FORBIDDEN/i);
    assert.match(shear, /flush|aligned|ribbon|standing-wave|cable/i);
  });

  it("locks product identity against inventing cars", () => {
    const scene = typeForceSpatialSceneClause();
    assert.match(scene, /IMAGE 1|EXACT product/i);
    assert.match(scene, /NEVER invent|car|vehicle|Honda/i);
    assert.match(scene, /PHYSICS LAW|elastic|deformation/i);
    assert.match(scene, /floor|pedestal|floating/i);

    const bend = typeForceDialectClause("bend");
    assert.match(bend, /ELASTIC BEAMS|bending moment|sag/i);
    assert.match(bend, /10–20%|10-20%|deflection/i);

    const prompt = buildTypeForceImagePrompt(
      {
        product: "Vitamin C serum",
        headline: "BRIGHTER",
        subline: "",
        offer: "",
        business: "",
        market: "en",
        framing: "auto",
        extra: "",
        imageTextMode: "integrated",
      },
      "standing-wave",
    );
    assert.match(prompt, /CRITICAL PRODUCT LOCK|never invent a car/i);
    assert.match(prompt, /RIBBON|standing-wave|FORBIDDEN/i);
    assert.match(prompt, /Vitamin C serum|BRIGHTER/i);
  });
});
