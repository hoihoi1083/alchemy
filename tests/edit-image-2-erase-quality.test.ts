import assert from "node:assert/strict";
import { describe, it } from "node:test";
import sharp from "sharp";
import { isFailedFluxEraseOutput } from "../lib/edit-image-2-erase-quality";

describe("edit-image-2-erase-quality", () => {
  it("flags solid chroma-green erase failures", async () => {
    const buf = await sharp({
      create: {
        width: 48,
        height: 48,
        channels: 3,
        background: { r: 0, g: 255, b: 0 },
      },
    })
      .png()
      .toBuffer();
    assert.equal(await isFailedFluxEraseOutput(buf), true);
  });

  it("accepts normal photo-like plates", async () => {
    const buf = await sharp({
      create: {
        width: 48,
        height: 48,
        channels: 3,
        background: { r: 240, g: 238, b: 232 },
      },
    })
      .png()
      .toBuffer();
    assert.equal(await isFailedFluxEraseOutput(buf), false);
  });
});
