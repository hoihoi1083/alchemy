import assert from "node:assert/strict";
import { describe, it } from "node:test";
import sharp from "sharp";
import { ensureCompositorFonts } from "@/lib/compositor/fonts";
import { burnTextSvgPaths } from "@/lib/compositor/latin-text-paths";
import { burnImageTextOverlay } from "@/lib/image-text-overlay-burn";

async function brightRatio(svgOrPng: Buffer, isPng = false): Promise<number> {
  const img = isPng ? sharp(svgOrPng) : sharp(Buffer.from(svgOrPng));
  const { data, info } = await img.raw().ensureAlpha().toBuffer({ resolveWithObject: true });
  let bright = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i]! > 200 && data[i + 1]! > 200 && data[i + 2]! > 200) bright++;
  }
  return bright / (info.width * info.height);
}

describe("glyph path text burn (EN + CJK)", () => {
  it("renders English paths", async () => {
    ensureCompositorFonts();
    const paths = burnTextSvgPaths({
      lines: ["Save hours instantly"],
      lineYs: [100],
      x: 400,
      anchor: "middle",
      fontSize: 42,
      bold: true,
    });
    assert.match(paths, /<path /);
    const svg = `<svg width="800" height="200" xmlns="http://www.w3.org/2000/svg">
      <rect width="800" height="200" fill="black"/>${paths}</svg>`;
    const ratio = await brightRatio(Buffer.from(svg));
    assert.ok(ratio > 0.01, `EN tofu ratio=${ratio}`);
  });

  it("renders Chinese paths", async () => {
    ensureCompositorFonts();
    const paths = burnTextSvgPaths({
      lines: ["一鍵生成宣傳素材"],
      lineYs: [100],
      x: 400,
      anchor: "middle",
      fontSize: 42,
      bold: true,
    });
    assert.match(paths, /<path /);
    const svg = `<svg width="800" height="200" xmlns="http://www.w3.org/2000/svg">
      <rect width="800" height="200" fill="black"/>${paths}</svg>`;
    const ratio = await brightRatio(Buffer.from(svg));
    assert.ok(ratio > 0.005, `ZH tofu ratio=${ratio}`);
  });

  it("renders Chinese fullwidth colon without throwing tofu", async () => {
    ensureCompositorFonts();
    const paths = burnTextSvgPaths({
      lines: ["產品：一鍵生成"],
      lineYs: [100],
      x: 400,
      anchor: "middle",
      fontSize: 42,
      bold: true,
    });
    assert.match(paths, /<path /);
    const svg = `<svg width="800" height="200" xmlns="http://www.w3.org/2000/svg">
      <rect width="800" height="200" fill="black"/>${paths}</svg>`;
    const ratio = await brightRatio(Buffer.from(svg));
    assert.ok(ratio > 0.002, `fullwidth colon tofu ratio=${ratio}`);
  });

  it("burns EN+ZH onto a blank image without tofu", async () => {
    ensureCompositorFonts();
    const base = await sharp({
      create: { width: 720, height: 1280, channels: 3, background: "#111111" },
    })
      .png()
      .toBuffer();
    const out = await burnImageTextOverlay(base, [
      {
        id: "en",
        text: "One click marketing",
        xPct: 50,
        yPct: 30,
        wPct: 80,
        align: "center",
        stylePreset: "classic",
      },
      {
        id: "zh",
        text: "一鍵生成",
        xPct: 50,
        yPct: 70,
        wPct: 80,
        align: "center",
        stylePreset: "classic",
      },
    ]);
    const ratio = await brightRatio(out, true);
    assert.ok(ratio > 0.002, `image burn tofu ratio=${ratio}`);
  });
});
