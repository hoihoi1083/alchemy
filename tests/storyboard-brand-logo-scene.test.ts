import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isStoryboardBrandLogoScene,
  isStoryboardEndCardLogoScene,
} from "../lib/storyboard-brand-logo-scene";

describe("isStoryboardEndCardLogoScene", () => {
  it("never marks end-card scenes (path retired)", () => {
    assert.equal(isStoryboardEndCardLogoScene({ imageIndex: 4, role: "cta" }, 4), false);
    assert.equal(
      isStoryboardEndCardLogoScene({ imageIndex: 4, role: "demo" }, 4, {
        useBrandLogo: false,
      }),
      false,
    );
    assert.equal(
      isStoryboardEndCardLogoScene({ imageIndex: 4, role: "demo" }, 4, {
        useBrandLogo: true,
      }),
      false,
    );
    assert.equal(
      isStoryboardEndCardLogoScene({ imageIndex: 2, role: "cta" }, 4, {
        useBrandLogo: true,
      }),
      false,
    );
  });

  it("legacy endWithBrandLogo alias also stays off", () => {
    assert.equal(
      isStoryboardBrandLogoScene({ imageIndex: 4 }, 4, { endWithBrandLogo: true }),
      false,
    );
  });
});
