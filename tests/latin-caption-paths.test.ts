import assert from "node:assert/strict";
import { describe, it } from "node:test";
import sharp from "sharp";
import { ensureCompositorFonts } from "@/lib/compositor/fonts";
import { latinCaptionSvgPaths } from "@/lib/compositor/latin-text-paths";

describe("latin caption glyph paths", () => {
  it("renders readable English without @font-face", async () => {
    ensureCompositorFonts();
    const paths = latinCaptionSvgPaths({
      lines: ["Save hours of tedious work instantly."],
      lineYs: [100],
      x: 400,
      anchor: "middle",
      fontSize: 42,
      bold: true,
    });
    assert.match(paths, /<path /);
    const svg = `<svg width="800" height="200" xmlns="http://www.w3.org/2000/svg">
      <rect width="800" height="200" fill="black"/>
      ${paths}
    </svg>`;
    const { data, info } = await sharp(Buffer.from(svg))
      .raw()
      .ensureAlpha()
      .toBuffer({ resolveWithObject: true });
    let bright = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i]! > 200 && data[i + 1]! > 200 && data[i + 2]! > 200) bright++;
    }
    const ratio = bright / (info.width * info.height);
    assert.ok(ratio > 0.01, `path English tofu (ratio=${ratio})`);
  });
});
