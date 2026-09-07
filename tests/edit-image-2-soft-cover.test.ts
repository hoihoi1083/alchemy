import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isLogoLikeGraphicText } from "../lib/edit-image-2-soft-cover";

describe("isLogoLikeGraphicText", () => {
  it("flags big Latin wordmarks like SMASH", () => {
    assert.equal(
      isLogoLikeGraphicText("SMASH", { width: 400, height: 120 }, 800, 1200),
      true,
    );
  });

  it("keeps Chinese body copy for Florence", () => {
    assert.equal(
      isLogoLikeGraphicText(
        "極速充電，隨時滿血！",
        { width: 500, height: 60 },
        800,
        1200,
      ),
      false,
    );
  });
});
