import assert from "node:assert/strict";
import { describe, it } from "node:test";
import sharp from "sharp";
import {
  cropNeedsChromaFlatten,
  flattenTransparentForEdit,
  restoreTransparencyFromChroma,
  transparentPixelRatio,
} from "../lib/edit-image-2-transparent-edit";

describe("edit-image-2 transparent crop edit", () => {
  it("detects transparent cutouts and restores magenta to alpha", async () => {
    const w = 64;
    const h = 32;
    const raw = Buffer.alloc(w * h * 4, 0);
    // Orange glyph blob
    for (let y = 9; y < 23; y++) {
      for (let x = 18; x < 46; x++) {
        const i = (y * w + x) * 4;
        raw[i] = 240;
        raw[i + 1] = 100;
        raw[i + 2] = 20;
        raw[i + 3] = 255;
      }
    }
    const crop = await sharp(raw, { raw: { width: w, height: h, channels: 4 } })
      .png()
      .toBuffer();

    assert.ok((await transparentPixelRatio(crop)) > 0.5);
    assert.equal(await cropNeedsChromaFlatten(crop), true);

    const flat = await flattenTransparentForEdit(crop);
    const flatRatio = await transparentPixelRatio(flat);
    assert.ok(flatRatio < 0.05, `flatten should be opaque, got ${flatRatio}`);

    const restored = await restoreTransparencyFromChroma(flat);
    const ratio = await transparentPixelRatio(restored);
    assert.ok(ratio > 0.4, `expected transparent restore, got ${ratio}`);
  });
});
