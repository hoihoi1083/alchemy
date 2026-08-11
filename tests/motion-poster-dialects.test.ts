import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  inferMotionPosterTones,
  resolveMotionPosterDialect,
} from "../lib/motion-poster-dialects";
import { buildMotionPosterPrompt } from "../lib/shot-recipes";
import { buildMotionPosterStillPrompt } from "../lib/prompt-variables";

describe("motion-poster dialects", () => {
  it("fits coffee to F&B and not jewelry light-sweep as the only option", () => {
    const tones = inferMotionPosterTones({ product: "Dirty Coffee", headline: "冰滴" });
    assert.ok(tones.includes("fnb"));
    const picked = resolveMotionPosterDialect({
      pick: "auto",
      product: "Dirty Coffee",
      headline: "冰滴",
      stable: true,
    });
    assert.equal(picked.id, "liquid-reveal");
    assert.equal(picked.reason, "product-fit");
  });

  it("fits dessert bakery to designed-poster dialect", () => {
    const tones = inferMotionPosterTones({
      product: "草莓舒芙蕾",
      headline: "Creamy & Juicy",
    });
    assert.ok(tones.includes("dessert"));
    const picked = resolveMotionPosterDialect({
      pick: "auto",
      product: "草莓舒芙蕾",
      headline: "Creamy & Juicy",
      stable: true,
    });
    assert.equal(picked.id, "designed-poster");
  });

  it("fits beauty serum toward light-sweep or kinetic-type", () => {
    const picked = resolveMotionPosterDialect({
      pick: "auto",
      product: "vitamin C serum",
      headline: "Glow",
      stable: true,
    });
    assert.equal(picked.id, "light-sweep");
  });

  it("regen exclude swaps to another fitting dialect", () => {
    const first = resolveMotionPosterDialect({
      pick: "auto",
      product: "jade bracelet",
      stable: true,
    });
    const second = resolveMotionPosterDialect({
      pick: "auto",
      product: "jade bracelet",
      excludeId: first.id,
      stable: true,
    });
    assert.notEqual(second.id, first.id);
  });

  it("fits concept yoga class to atmosphere, not a SKU packshot dialect", () => {
    const picked = resolveMotionPosterDialect({
      pick: "auto",
      conceptIdea: "周末瑜伽班",
      conceptMode: true,
      stable: true,
    });
    assert.equal(picked.id, "scene-breathe");
    const still = buildMotionPosterStillPrompt(
      {
        product: "周末瑜伽班",
        headline: "深呼吸",
        subline: "",
        framing: "auto",
        market: "hk",
        artStyle: "realistic",
      },
      { conceptMode: true, dialect: picked.id },
    );
    assert.match(still, /CONCEPT motion-poster|service\/idea|no fake SKU/i);
    assert.doesNotMatch(still, /IMAGE 1 PIXELS ARE THE PRODUCT/);

    const cafe = resolveMotionPosterDialect({
      pick: "auto",
      conceptIdea: "开一家 Dirty Coffee 体验店",
      conceptMode: true,
      stable: true,
    });
    assert.equal(cafe.id, "liquid-reveal");
  });

  it("honors an explicit user pick", () => {
    const picked = resolveMotionPosterDialect({
      pick: "parallax",
      product: "Dirty Coffee",
      stable: true,
    });
    assert.equal(picked.id, "parallax");
    assert.equal(picked.reason, "user");
  });

  it("video + still prompts change with dialect", () => {
    const kinetic = buildMotionPosterPrompt({
      product: "CLOUD GAZE",
      headline: "Soft focus",
      durationSec: 6,
      mode: "loop",
      dialect: "kinetic-type",
    });
    assert.match(kinetic, /Dialect: kinetic-type/);
    assert.match(kinetic, /TEXTLESS FRAME|do not invent on-screen text/i);
    assert.match(kinetic, /overlay later/i);
    assert.match(kinetic, /HERO MOTION REQUIRED/i);
    assert.doesNotMatch(kinetic, /locked hero|product and set stay locked/i);

    const liquid = buildMotionPosterPrompt({
      product: "Dirty Coffee",
      headline: "Pour",
      durationSec: 6,
      mode: "loop",
      dialect: "liquid-reveal",
    });
    assert.match(liquid, /Dialect: liquid-reveal/);
    assert.match(liquid, /wipe|steam|pour/i);
    assert.match(liquid, /TEXTLESS FRAME|do not invent/i);
    assert.doesNotMatch(liquid, /paper warp \/ gentle rotate/);

    const still = buildMotionPosterStillPrompt(
      {
        product: "Dirty Coffee",
        headline: "Pour",
        subline: "",
        framing: "auto",
        market: "hk",
        artStyle: "realistic",
      },
      { dialect: "liquid-reveal" },
    );
    assert.match(still, /wipe path|splash-safe|lower band|top and bottom bands|masthead/i);
    assert.match(still, /TEXTLESS/);
    assert.match(still, /no readable writing/i);
    assert.match(still, /START:|首帧/);
  });

  it("start-end H3 prompt uses 即梦 首尾帧 interpolate", () => {
    const p = buildMotionPosterPrompt({
      product: "hair dryer",
      headline: "柔順光澤",
      durationSec: 6,
      mode: "start-end",
      dialect: "kinetic-type",
    });
    assert.match(p, /首尾帧/);
    assert.match(p, /Image 2/);
    assert.match(p, /masthead/i);
    assert.doesNotMatch(p, /TEXTLESS FRAME/);
    assert.doesNotMatch(p, /overlay later/i);
  });
});
