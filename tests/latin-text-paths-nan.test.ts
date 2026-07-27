import assert from "node:assert/strict";
import { describe, it } from "node:test";
import sharp from "sharp";
import { burnTextSvgPaths } from "@/lib/compositor/latin-text-paths";

describe("burnTextSvgPaths truncation", () => {
  it("renders full Latin strings that include digit 5 (opentype toPathData NaN bug)", async () => {
    const text = "1223454123512354123";
    const fontSize = 56;
    const width = 1072;
    const height = 300;
    const body = burnTextSvgPaths({
      lines: [text],
      lineYs: [120],
      x: Math.round(width / 2),
      anchor: "middle",
      fontSize,
      bold: true,
      fill: "white",
      stroke: "black",
      strokeWidth: 7,
    });
    assert.doesNotMatch(body, /NaN/);

    const png = await sharp(
      Buffer.from(
        `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`,
      ),
    )
      .png()
      .toBuffer();

    const { data, info } = await sharp(png)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    let minX = info.width;
    let maxX = 0;
    let ink = 0;
    for (let i = 0; i < data.length; i += 4) {
      if ((data[i + 3] ?? 0) < 40) continue;
      ink += 1;
      const x = (i / 4) % info.width;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
    }

    // Full string advance ≈ 609px; truncated-after-5 bug only paints ≈ 190px.
    assert.ok(ink > 8000, `expected full-string ink, got ${ink}`);
    assert.ok(maxX - minX + 1 > 500, `expected wide bbox, got ${maxX - minX + 1}`);
  });
});
