import assert from "node:assert/strict";
import { describe, it } from "node:test";
import sharp from "sharp";
import { localRingFill } from "../lib/edit-image-2-local-heal";
import { isFailedFluxEraseOutput } from "../lib/edit-image-2-erase-quality";

describe("edit-image-2 local heal smoke", () => {
  it("fills a hole without producing chroma-green", async () => {
    const imgW = 120;
    const imgH = 80;
    const src = await sharp({
      create: {
        width: imgW,
        height: imgH,
        channels: 3,
        background: { r: 240, g: 240, b: 245 },
      },
    })
      .composite([
        {
          input: await sharp({
            create: {
              width: 30,
              height: 30,
              channels: 3,
              background: { r: 20, g: 20, b: 20 },
            },
          })
            .png()
            .toBuffer(),
          left: 45,
          top: 25,
        },
      ])
      .png()
      .toBuffer();

    const healed = await localRingFill(
      src,
      { left: 45, top: 25, width: 30, height: 30 },
      imgW,
      imgH,
    );
    assert.equal(await isFailedFluxEraseOutput(healed), false);

    const meta = await sharp(healed).metadata();
    assert.equal(meta.width, imgW);
    assert.equal(meta.height, imgH);
  });
});
