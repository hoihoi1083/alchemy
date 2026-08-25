import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildIntakeTemplateCards,
  intakeImageVisualStyleIds,
  intakeShowsStoryboardRecipes,
  intakeShowsVideoRecipes,
  INTAKE_TEMPLATE_EXCLUDED_VISUAL_STYLES,
} from "@/lib/intake-template-styles";
import { applyIntakeVideoStyle } from "@/lib/apply-intake-video-style";

const copyStub = {
  pathQuickTitle: "Quick Ad",
  pathQuickVideoDesc: "One photo + AI motion",
  pathReferenceVideoTitle: "Follow reference",
  pathReferenceVideoDesc: "Upload MP4",
  sceneReelTitle: "Scene reel",
  sceneReelDesc: "Concept reel",
  videoCreativeModes: {
    "motion-poster": { title: "Motion poster", description: "MP" },
    blockbuster: { title: "Blockbuster", description: "BB" },
    "vacuum-inflate": { title: "Vacuum", description: "VI" },
    "creative-motion": { title: "Creative motion", description: "CM" },
    "hand-throw-scene": { title: "Hand throw", description: "HT" },
    "product-explode": { title: "Explode", description: "PE" },
    "social-drip": { title: "Social drip", description: "SD" },
    "ecom-orbit": { title: "Ecom orbit", description: "EO" },
    "object-lock": { title: "Object lock", description: "OL" },
    "macro-snap": { title: "Macro", description: "MS" },
    "luxury-tabletop": { title: "Luxury", description: "LT" },
    "beauty-mv": { title: "Beauty", description: "BM" },
    "imitate-ad": { title: "Imitate", description: "IA" },
    "neon-on-real": { title: "Neon", description: "NR" },
    "food-bullet-time": { title: "Food", description: "FB" },
    "c4d-motion": { title: "C4D", description: "C4" },
    "h3-showreel": { title: "Showreel", description: "SR" },
    "h3-sphere-mg": { title: "Sphere", description: "SP" },
    "h3-movie-title": { title: "Movie title", description: "MT" },
    "h3-lifestyle": { title: "Lifestyle", description: "LS" },
  },
  visualStyles: {
    product: { title: "Clean product", description: "Clean" },
    "dark-premium": { title: "Dark premium", description: "Dark" },
    "paper-layout": { title: "Paper", description: "Paper" },
    "storyboard-video": { title: "Storyboard", description: "SB" },
  },
  storyboardRecipes: {
    "classic-tvc": { title: "Classic TVC", desc: "Flexible scenes" },
    "luxury-birth": { title: "Luxury birth", desc: "Product birth arc" },
  },
};

describe("intake-template-styles", () => {
  it("uses video recipes only for video-only (not combined/storyboard)", () => {
    assert.equal(intakeShowsVideoRecipes("video-only"), true);
    assert.equal(intakeShowsVideoRecipes("combined"), false);
    assert.equal(intakeShowsVideoRecipes("image-only"), false);
    assert.equal(intakeShowsStoryboardRecipes("combined"), true);
    assert.equal(intakeShowsStoryboardRecipes("video-only"), false);
    assert.equal(intakeShowsStoryboardRecipes("image-only"), false);
  });

  it("excludes paper/storyboard and product-only brand/UGC from image Template", () => {
    const ids = intakeImageVisualStyleIds("image-only", "physical");
    assert.ok(!ids.includes("paper-layout"));
    assert.ok(!ids.includes("storyboard-video"));
    assert.ok(!ids.includes("ugc-presenter"));
    assert.ok(!ids.includes("brand-fit"));
    assert.ok(!ids.includes("brand-campaign"));
    assert.ok(ids.includes("product"));
    assert.ok(ids.includes("info-poster"));
    assert.ok(ids.includes("designed-poster"));
    assert.ok(INTAKE_TEMPLATE_EXCLUDED_VISUAL_STYLES.has("paper-layout"));
    assert.ok(INTAKE_TEMPLATE_EXCLUDED_VISUAL_STYLES.has("storyboard-video"));
  });

  it("builds product video Template cards with Quick Ad first", () => {
    const cards = buildIntakeTemplateCards({
      workflowMode: "video-only",
      isConcept: false,
      copy: copyStub,
    });
    assert.equal(cards[0]?.id, "product_promo");
    assert.equal(cards[0]?.kind, "video");
    assert.ok(cards.some((c) => c.id === "blockbuster"));
    assert.ok(cards.some((c) => c.id === "ecom_orbit"));
    assert.ok(!cards.some((c) => c.id === "paper-layout"));
    assert.ok(!cards.some((c) => c.id === "storyboard-video"));
  });

  it("builds combined/storyboard Template as narrative recipes, not image looks", () => {
    const cards = buildIntakeTemplateCards({
      workflowMode: "combined",
      isConcept: false,
      copy: copyStub,
    });
    assert.ok(cards.every((c) => c.kind === "storyboard"));
    assert.ok(cards.some((c) => c.id === "classic-tvc"));
    assert.ok(cards.some((c) => c.id === "luxury-birth"));
    assert.ok(!cards.some((c) => c.id === "product"));
    assert.ok(!cards.some((c) => c.id === "product_promo"));
    assert.ok(!cards.some((c) => c.id === "blockbuster"));
  });

  it("hides luxury-birth from concept combined Template", () => {
    const cards = buildIntakeTemplateCards({
      workflowMode: "combined",
      isConcept: true,
      copy: copyStub,
    });
    assert.ok(cards.every((c) => c.kind === "storyboard"));
    assert.ok(cards.some((c) => c.id === "classic-tvc"));
    assert.ok(!cards.some((c) => c.id === "luxury-birth"));
  });

  it("builds image Template cards without paper/storyboard/UGC/brand", () => {
    const cards = buildIntakeTemplateCards({
      workflowMode: "image-only",
      isConcept: false,
      copy: copyStub,
    });
    assert.ok(cards.every((c) => c.kind === "visual"));
    assert.ok(!cards.some((c) => c.id === "paper-layout"));
    assert.ok(!cards.some((c) => c.id === "storyboard-video"));
    assert.ok(!cards.some((c) => c.id === "ugc-presenter"));
    assert.ok(!cards.some((c) => c.id === "brand-fit"));
    assert.ok(!cards.some((c) => c.id === "brand-campaign"));
  });
});

describe("apply-intake-video-style", () => {
  it("maps Quick Ad and Blockbuster subpaths", () => {
    const calls: string[] = [];
    const setSub: string[] = [];
    applyIntakeVideoStyle("product_promo", {
      isConcept: false,
      setVideoSubpath: (s) => setSub.push(s),
      wizard: {
        applyPrimaryPathVideoOnly: (p) => calls.push(`videoOnly:${p}`),
        applyPrimaryPathConceptVideo: (p) => calls.push(`concept:${p}`),
        onVideoCreativeModeChange: (m) => calls.push(`mode:${m}`),
      },
    });
    assert.deepEqual(setSub, ["product_promo"]);
    assert.ok(calls.includes("videoOnly:assistant"));

    calls.length = 0;
    setSub.length = 0;
    applyIntakeVideoStyle("blockbuster", {
      isConcept: false,
      setVideoSubpath: (s) => setSub.push(s),
      wizard: {
        applyPrimaryPathVideoOnly: (p) => calls.push(`videoOnly:${p}`),
        applyPrimaryPathConceptVideo: (p) => calls.push(`concept:${p}`),
        onVideoCreativeModeChange: (m) => calls.push(`mode:${m}`),
      },
    });
    assert.deepEqual(setSub, ["blockbuster"]);
    assert.ok(calls.includes("mode:blockbuster"));
  });
});
