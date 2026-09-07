import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildLayerCropEditPrompt,
  resolveCropEditMode,
} from "../lib/edit-image-2-crop-edit";

describe("edit-image-2 crop edit", () => {
  it("prefers new_text mode over instruction", () => {
    assert.equal(
      resolveCropEditMode({ newText: "Hello", instruction: "make blue" }),
      "text",
    );
    assert.equal(resolveCropEditMode({ instruction: "make blue" }), "instruction");
    assert.equal(resolveCropEditMode({}), null);
  });

  it("builds text rewrite prompt when mode is text", () => {
    const built = buildLayerCropEditPrompt({
      mode: "text",
      newText: "7号 = 商业身份系统",
      oldText: "old",
    });
    assert.match(built.prompt, /7号 = 商业身份系统/);
    assert.equal(built.billingMode, "refine-layer-text");
  });

  it("builds freeform crop instruction prompt", () => {
    const built = buildLayerCropEditPrompt({
      mode: "instruction",
      instruction: "Make the badge gold and sharper",
    });
    assert.match(built.prompt, /Make the badge gold/);
    assert.match(built.prompt, /selected region crop/i);
    assert.equal(built.billingMode, "refine-layer-crop");
  });
});
