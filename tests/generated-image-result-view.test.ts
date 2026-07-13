import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  resolveGeneratedImageResultView,
  type ResolveGeneratedImageResultViewInput,
} from "../lib/generated-image-result-view";

function base(overrides: Partial<ResolveGeneratedImageResultViewInput> = {}): ResolveGeneratedImageResultViewInput {
  return {
    imageUrl: "https://example.com/a.jpg",
    useOriginalImage: false,
    imageVariantUrls: [],
    campaignSlides: [],
    storyboardScenes: [],
    cinematicScenes: [],
    effectiveImageOutputMode: "single",
    isStoryboardOutput: false,
    isCinematicStitchOutput: false,
    ...overrides,
  };
}

function slide(n: number) {
  return {
    role: "point",
    title: `Slide ${n}`,
    headline: `Headline ${n}`,
    subline: "",
    imageUrl: `https://example.com/s${n}.jpg`,
  };
}

describe("generated image result view parity", () => {
  it("teaching carousel with 4 slides is carousel, not A/B", () => {
    const view = resolveGeneratedImageResultView(
      base({
        effectiveImageOutputMode: "teaching-carousel",
        campaignSlides: [slide(1), slide(2), slide(3), slide(4)],
        imageVariantUrls: [
          "https://example.com/s1.jpg",
          "https://example.com/s2.jpg",
          "https://example.com/s3.jpg",
          "https://example.com/s4.jpg",
        ],
      }),
    );
    assert.equal(view.kind, "carousel");
    assert.equal(view.carouselVariant, "teaching");
  });

  it("campaign with 3 slides is carousel", () => {
    const view = resolveGeneratedImageResultView(
      base({
        effectiveImageOutputMode: "campaign",
        campaignSlides: [slide(1), slide(2), slide(3)],
      }),
    );
    assert.equal(view.kind, "carousel");
    assert.equal(view.carouselVariant, "campaign");
  });

  it("A/B mode with 2 variant urls and no campaign slides is ab", () => {
    const view = resolveGeneratedImageResultView(
      base({
        effectiveImageOutputMode: "ab",
        imageVariantUrls: ["https://example.com/a.jpg", "https://example.com/b.jpg"],
      }),
    );
    assert.equal(view.kind, "ab");
  });

  it("does not label multi-url teaching-carousel leftovers as A/B", () => {
    const view = resolveGeneratedImageResultView(
      base({
        effectiveImageOutputMode: "teaching-carousel",
        imageVariantUrls: ["https://example.com/a.jpg", "https://example.com/b.jpg"],
      }),
    );
    assert.notEqual(view.kind, "ab");
    assert.equal(view.kind, "single");
  });

  it("storyboard scenes take precedence over carousel variants", () => {
    const view = resolveGeneratedImageResultView(
      base({
        storyboardScenes: [
          {
            imageIndex: 1,
            role: "hook",
            startSec: 0,
            endSec: 3,
            sceneDescriptionZh: "開場",
            imageUrl: "https://example.com/scene1.jpg",
          },
        ],
        campaignSlides: [slide(1), slide(2)],
        imageVariantUrls: ["https://example.com/a.jpg", "https://example.com/b.jpg"],
      }),
    );
    assert.equal(view.kind, "storyboard");
  });

  it("cinematic scenes take precedence over A/B", () => {
    const view = resolveGeneratedImageResultView(
      base({
        isCinematicStitchOutput: true,
        cinematicScenes: [
          {
            sceneIndex: 1,
            role: "wide",
            startSec: 0,
            endSec: 8,
            sceneDescriptionZh: "遠景",
            imageUrl: "https://example.com/c1.jpg",
          },
        ],
        imageVariantUrls: ["https://example.com/a.jpg", "https://example.com/b.jpg"],
      }),
    );
    assert.equal(view.kind, "cinematic");
  });

  it("single image when one url and no multi-slide metadata", () => {
    const view = resolveGeneratedImageResultView(base({ effectiveImageOutputMode: "single" }));
    assert.equal(view.kind, "single");
  });
});
