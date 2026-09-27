import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sampleTextStyleFromRgba } from "../lib/edit-image-2-text-style-sample";

function makeRgba(
  w: number,
  h: number,
  paint: (set: (x: number, y: number, r: number, g: number, b: number, a?: number) => void) => void,
): Uint8ClampedArray {
  const data = new Uint8ClampedArray(w * h * 4);
  const set = (x: number, y: number, r: number, g: number, b: number, a = 255) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const i = (y * w + x) * 4;
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
    data[i + 3] = a;
  };
  paint(set);
  return data;
}

describe("sampleTextStyleFromRgba", () => {
  it("samples dark fill for solid dark glyphs on transparent", () => {
    const data = makeRgba(40, 40, (set) => {
      for (let y = 10; y < 30; y++) {
        for (let x = 10; x < 30; x++) set(x, y, 20, 20, 30);
      }
    });
    const style = sampleTextStyleFromRgba(data, 40, 40);
    assert.match(style.fill, /^#[0-9a-f]{6}$/i);
    // Near black/dark slate
    const r = parseInt(style.fill.slice(1, 3), 16);
    const g = parseInt(style.fill.slice(3, 5), 16);
    const b = parseInt(style.fill.slice(5, 7), 16);
    assert.ok((r + g + b) / 3 < 80, `fill too bright: ${style.fill}`);
    assert.equal(style.fontBold, true);
  });

  it("detects outline when edge colour differs from interior fill", () => {
    const data = makeRgba(48, 48, (set) => {
      // Outer white outline ring
      for (let y = 8; y < 40; y++) {
        for (let x = 8; x < 40; x++) set(x, y, 245, 245, 250);
      }
      // Dark purple interior
      for (let y = 14; y < 34; y++) {
        for (let x = 14; x < 34; x++) set(x, y, 70, 30, 120);
      }
    });
    const style = sampleTextStyleFromRgba(data, 48, 48);
    const fr = parseInt(style.fill.slice(1, 3), 16);
    const fb = parseInt(style.fill.slice(5, 7), 16);
    // Fill should lean purple (b > r)
    assert.ok(fb > fr, `expected purple-ish fill, got ${style.fill}`);
    assert.ok(
      style.textEffect === "outline" ||
        style.textEffect === "heavyOutline" ||
        style.textEffect === "outlineShadow" ||
        style.textEffect === "neon",
      `expected outline-ish effect, got ${style.textEffect}`,
    );
    const sr = parseInt(style.strokeColor.slice(1, 3), 16);
    const sg = parseInt(style.strokeColor.slice(3, 5), 16);
    const sb = parseInt(style.strokeColor.slice(5, 7), 16);
    assert.ok((sr + sg + sb) / 3 > 160, `stroke should be light, got ${style.strokeColor}`);
  });

  it("returns defaults for empty / transparent crop", () => {
    const data = new Uint8ClampedArray(16 * 16 * 4);
    const style = sampleTextStyleFromRgba(data, 16, 16);
    assert.equal(style.fill, "#111827");
    assert.equal(style.textEffect, "none");
  });

  it("prefers light fill for light glyphs (not muddy mid-grey)", () => {
    const data = makeRgba(40, 40, (set) => {
      for (let y = 10; y < 30; y++) {
        for (let x = 10; x < 30; x++) set(x, y, 230, 230, 235);
      }
    });
    const style = sampleTextStyleFromRgba(data, 40, 40);
    const r = parseInt(style.fill.slice(1, 3), 16);
    const g = parseInt(style.fill.slice(3, 5), 16);
    const b = parseInt(style.fill.slice(5, 7), 16);
    assert.ok((r + g + b) / 3 > 180, `fill too dark: ${style.fill}`);
  });

  it("opaque plate: dark text on cream bg → dark fill, no phantom shadow", () => {
    const data = makeRgba(48, 48, (set) => {
      // Fully opaque cream plate
      for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) set(x, y, 245, 240, 228);
      }
      // Dark text block (minority of pixels)
      for (let y = 14; y < 34; y++) {
        for (let x = 10; x < 38; x++) set(x, y, 28, 28, 36);
      }
    });
    const style = sampleTextStyleFromRgba(data, 48, 48);
    const r = parseInt(style.fill.slice(1, 3), 16);
    const g = parseInt(style.fill.slice(3, 5), 16);
    const b = parseInt(style.fill.slice(5, 7), 16);
    assert.ok((r + g + b) / 3 < 80, `fill should be dark ink, got ${style.fill}`);
    assert.equal(style.textEffect, "none");
  });

  it("opaque plate: light text on red banner → light fill", () => {
    const data = makeRgba(48, 48, (set) => {
      for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) set(x, y, 180, 24, 36);
      }
      for (let y = 16; y < 32; y++) {
        for (let x = 8; x < 40; x++) set(x, y, 245, 245, 250);
      }
    });
    const style = sampleTextStyleFromRgba(data, 48, 48);
    const r = parseInt(style.fill.slice(1, 3), 16);
    const g = parseInt(style.fill.slice(3, 5), 16);
    const b = parseInt(style.fill.slice(5, 7), 16);
    assert.ok((r + g + b) / 3 > 180, `fill should be light ink, got ${style.fill}`);
    assert.equal(style.textEffect, "none");
  });

  it("thin transparent ring (box-lift shape) still uses opaque-plate fallback", () => {
    const data = makeRgba(40, 40, (set) => {
      // 2px clear ring — clearRatio = 1 - (36/40)^2 ≈ 0.19… wait that's > 8%.
      // Use 1px ring: clearRatio = 1 - (38/40)^2 ≈ 0.0975 still borderline.
      // Zero clear except outer 1px with sparse holes → keep almost opaque.
      for (let y = 0; y < 40; y++) {
        for (let x = 0; x < 40; x++) set(x, y, 250, 248, 240);
      }
      for (let y = 12; y < 28; y++) {
        for (let x = 8; x < 32; x++) set(x, y, 30, 30, 40);
      }
      // Punch only a few corner pixels clear (~2% clear)
      for (let i = 0; i < 40; i++) {
        set(i, 0, 0, 0, 0, 0);
        set(i, 39, 0, 0, 0, 0);
      }
    });
    const style = sampleTextStyleFromRgba(data, 40, 40);
    const r = parseInt(style.fill.slice(1, 3), 16);
    const g = parseInt(style.fill.slice(3, 5), 16);
    const b = parseInt(style.fill.slice(5, 7), 16);
    assert.ok((r + g + b) / 3 < 90, `fill should be dark, got ${style.fill}`);
    assert.equal(style.textEffect, "none");
  });
});
