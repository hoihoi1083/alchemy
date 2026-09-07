import assert from "node:assert/strict";
import { describe, it } from "node:test";
import sharp from "sharp";
import { holeContentBarelyChanged } from "../lib/edit-image-2-heal-quality";

describe("edit-image-2 heal quality", () => {
  it("flags when hole pixels are unchanged", async () => {
    const img = await sharp({
      create: {
        width: 40,
        height: 40,
        channels: 3,
        background: { r: 200, g: 40, b: 40 },
      },
    })
      .jpeg()
      .toBuffer();
    const same = await holeContentBarelyChanged(
      img,
      img,
      { left: 10, top: 10, width: 20, height: 20 },
      40,
      40,
    );
    assert.equal(same, true);
  });

  it("passes when hole is filled with different colour", async () => {
    const before = await sharp({
      create: {
        width: 40,
        height: 40,
        channels: 3,
        background: { r: 200, g: 40, b: 40 },
      },
    })
      .jpeg()
      .toBuffer();
    const patch = await sharp({
      create: {
        width: 20,
        height: 20,
        channels: 3,
        background: { r: 250, g: 250, b: 250 },
      },
    })
      .png()
      .toBuffer();
    const after = await sharp(before)
      .composite([{ input: patch, left: 10, top: 10 }])
      .jpeg()
      .toBuffer();
    const same = await holeContentBarelyChanged(
      before,
      after,
      { left: 10, top: 10, width: 20, height: 20 },
      40,
      40,
    );
    assert.equal(same, false);
  });
});
