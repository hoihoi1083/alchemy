import assert from "node:assert/strict";
import { describe, it } from "node:test";
import sharp from "sharp";
import {
  captionBurnFontFamily,
  compositorFontFaceCss,
  ensureCompositorFonts,
  textNeedsCjkFonts,
} from "@/lib/compositor/fonts";

async function renderSample(
  text: string,
  preferred: "NotoBody" | "NotoDisplay",
): Promise<{ bright: number; ratio: number; family: string; cssBytes: number }> {
  ensureCompositorFonts();
  const family = captionBurnFontFamily(preferred, true, { text });
  const css = compositorFontFaceCss(text);
  const svg = `<svg width="800" height="200" xmlns="http://www.w3.org/2000/svg">
  <defs>${css}</defs>
  <rect width="800" height="200" fill="black"/>
  <text x="400" y="110" text-anchor="middle" dominant-baseline="middle" font-family="${family}" font-size="48" font-weight="700" fill="white" stroke="black" stroke-width="4" paint-order="stroke">${text}</text>
</svg>`;
  const { data, info } = await sharp(Buffer.from(svg))
    .raw()
    .ensureAlpha()
    .toBuffer({ resolveWithObject: true });
  let bright = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i]! > 200 && data[i + 1]! > 200 && data[i + 2]! > 200) bright++;
  }
  return {
    bright,
    ratio: bright / (info.width * info.height),
    family,
    cssBytes: Buffer.byteLength(css, "utf8"),
  };
}

describe("English caption burn fonts", () => {
  it("detects CJK vs Latin", () => {
    assert.equal(textNeedsCjkFonts("Automate emails"), false);
    assert.equal(textNeedsCjkFonts("一鍵生成宣傳素材"), true);
  });

  it("English burns use compact Latin-only CSS (not 12MB CJK embed)", async () => {
    const en = await renderSample("Automate emails, ads, and posts.", "NotoBody");
    assert.ok(en.ratio > 0.01, `English tofu (ratio=${en.ratio})`);
    assert.ok(
      en.cssBytes < 2_500_000,
      `English CSS still huge (${en.cssBytes} bytes) — CJK font should not be embedded`,
    );
    assert.match(en.family, /NotoLatin/);
  });

  it("NotoDisplay English also renders Latin", async () => {
    const en = await renderSample("Get started with one click today.", "NotoDisplay");
    assert.ok(en.ratio > 0.01, `NotoDisplay English tofu (ratio=${en.ratio})`);
  });

  it("Chinese still renders with CJK fonts", async () => {
    const zh = await renderSample("一鍵生成宣傳素材", "NotoBody");
    assert.ok(zh.ratio > 0.005, `Chinese empty (ratio=${zh.ratio})`);
    assert.ok(zh.cssBytes > 1_000_000, "CJK burn should embed body font");
  });
});
