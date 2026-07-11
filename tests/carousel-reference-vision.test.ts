import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CarouselReferenceVision } from "../lib/carousel-reference-vision";
import {
  briefFromCarouselVision,
  carouselSlidesPlannerBlock,
  overrideBriefForContentResearch,
} from "../lib/user-reference-brief";

const vision: CarouselReferenceVision = {
  seriesSummary: "Dark moody product carousel on black leather with white serif labels",
  sharedColorPalette: "charcoal black, silver highlights, white typography",
  sharedTypography: "spaced serif brand header, handwritten annotation labels",
  sharedMood: "low-key directional light, premium masculine",
  sharedLayoutFamily: "annotated flat-lay circle bracelet per slide",
  contentType: "social-carousel",
  slides: [
    {
      index: 1,
      sceneSummary: "2x2 grid collage of four bracelets",
      layoutStyle: "four-up grid cover",
      colorPalette: "",
      typographyStyle: "",
      mood: "",
      compositionHint: "2x2 collage cover with brand header",
      stagingPose: "flat lay grid",
    },
    {
      index: 2,
      sceneSummary: "Single bracelet with callout lines",
      layoutStyle: "annotated flat lay",
      colorPalette: "",
      typographyStyle: "",
      mood: "",
      compositionHint: "circle bracelet with handwritten material labels",
      stagingPose: "flat lay circle on leather",
    },
  ],
};

describe("carousel reference vision brief", () => {
  it("briefFromCarouselVision maps shared and per-slide DNA", () => {
    const brief = briefFromCarouselVision(vision, {
      headline: "粉水晶手鏈",
      product: "馬達加斯加粉水晶手鏈",
    });
    assert.equal(brief.contentType, "social-carousel");
    assert.equal(brief.colorPalette, vision.sharedColorPalette);
    assert.equal(brief.carouselSlideCount, 2);
    assert.equal(brief.carouselSlides?.length, 2);
    assert.ok(brief.carouselSlides?.[1]?.composition.includes("handwritten"));
    assert.ok(brief.subjects.includes("DO NOT reproduce"));
  });

  it("carouselSlidesPlannerBlock lists slide order", () => {
    const brief = briefFromCarouselVision(vision);
    const block = carouselSlidesPlannerBlock(brief.carouselSlides);
    assert.ok(block.includes("Slide 1"));
    assert.ok(block.includes("Slide 2"));
    assert.ok(block.includes("2 analyzed slides"));
  });

  it("overrideBriefForContentResearch keeps carousel slides", () => {
    const brief = briefFromCarouselVision(vision);
    const overridden = overrideBriefForContentResearch(brief, {
      product: "馬達加斯加粉水晶手鏈",
      headline: "粉水晶穿搭",
    });
    assert.equal(overridden.topic, "馬達加斯加粉水晶手鏈");
    assert.equal(overridden.carouselSlides?.length, 2);
    assert.equal(overridden.visibleText, "");
  });
});
