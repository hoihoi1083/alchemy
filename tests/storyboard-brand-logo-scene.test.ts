import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isStoryboardBrandLogoScene,
  isStoryboardEndCardLogoScene,
} from "../lib/storyboard-brand-logo-scene";

describe("isStoryboardEndCardLogoScene", () => {
  it("never marks a scene when useBrandLogo is off", () => {
    assert.equal(isStoryboardEndCardLogoScene({ imageIndex: 4, role: "cta" }, 4), false);
    assert.equal(
      isStoryboardEndCardLogoScene({ imageIndex: 4, role: "demo" }, 4, {
        useBrandLogo: false,
      }),
      false,
    );
  });

  it("marks only the last scene when user opts in", () => {
    assert.equal(
      isStoryboardEndCardLogoScene({ imageIndex: 4, role: "demo" }, 4, {
        useBrandLogo: true,
      }),
      true,
    );
    assert.equal(
      isStoryboardEndCardLogoScene({ imageIndex: 2, role: "cta" }, 4, {
        useBrandLogo: true,
      }),
      false,
    );
  });

  it("legacy endWithBrandLogo alias still works", () => {
    assert.equal(
      isStoryboardBrandLogoScene({ imageIndex: 4 }, 4, { endWithBrandLogo: true }),
      true,
    );
  });
});
