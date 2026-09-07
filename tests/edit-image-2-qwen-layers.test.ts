import assert from "node:assert/strict";
import { describe, it } from "node:test";
import sharp from "sharp";
import {
  alphaContentBBox,
  pickBackgroundLayerIndex,
  tokensForQwenLayered,
} from "../lib/edit-image-2-qwen-layers";

describe("edit-image-2 qwen layers helpers", () => {
  it("prices Qwen at 41 tokens ($0.05 fal)", () => {
    assert.equal(tokensForQwenLayered(), 41);
  });

  it("finds opaque content bbox", async () => {
    const png = await sharp({
      create: {
        width: 40,
        height: 40,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([
        {
          input: await sharp({
            create: {
              width: 10,
              height: 8,
              channels: 4,
              background: { r: 255, g: 0, b: 0, alpha: 1 },
            },
          })
            .png()
            .toBuffer(),
          left: 5,
          top: 7,
        },
      ])
      .png()
      .toBuffer();
    const box = await alphaContentBBox(png);
    assert.ok(box);
    assert.equal(box!.left, 5);
    assert.equal(box!.top, 7);
    assert.equal(box!.width, 10);
    assert.equal(box!.height, 8);
  });

  it("picks densest layer as background", () => {
    const idx = pickBackgroundLayerIndex([
      { coverage: 0.1, width: 20, height: 20, frameW: 100, frameH: 100 },
      { coverage: 0.8, width: 100, height: 100, frameW: 100, frameH: 100 },
      { coverage: 0.2, width: 40, height: 40, frameW: 100, frameH: 100 },
    ]);
    assert.equal(idx, 1);
  });
});
