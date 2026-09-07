import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  keyUniformBackground,
  keyingLooksUseful,
  opaqueBBox,
  plateLooksUniform,
  sampleCornerBg,
} from "../lib/edit-image-2-text-matte";

describe("edit-image-2 text matte", () => {
  it("keys solid red bar leaving white glyphs", () => {
    const w = 40;
    const h = 16;
    const data = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 220;
      data[i + 1] = 40;
      data[i + 2] = 40;
      data[i + 3] = 255;
    }
    // White "glyph" block in the middle
    for (let y = 4; y < 12; y++) {
      for (let x = 10; x < 30; x++) {
        const i = (y * w + x) * 4;
        data[i] = 255;
        data[i + 1] = 255;
        data[i + 2] = 255;
      }
    }
    const { data: out, keyedRatio } = keyUniformBackground(data, w, h, { threshold: 40 });
    const box = opaqueBBox(out, w, h);
    assert.ok(box);
    assert.ok(keyedRatio > 0.3);
    assert.ok(keyingLooksUseful(keyedRatio, (box!.width * box!.height) / (w * h)));
    // Corner should be transparent
    assert.equal(out[3], 0);
  });

  it("samples corner bg as red-ish", () => {
    const w = 10;
    const h = 10;
    const data = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 200;
      data[i + 1] = 20;
      data[i + 2] = 20;
      data[i + 3] = 255;
    }
    const bg = sampleCornerBg(data, w, h, 2);
    assert.ok(bg.r > 150);
    assert.ok(bg.g < 80);
  });

  it("rejects pill-like crops (dark ends, light center) as non-uniform", () => {
    const w = 60;
    const h = 20;
    const data = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const dark = x < 10 || x >= 50;
        data[i] = dark ? 20 : 240;
        data[i + 1] = dark ? 80 : 250;
        data[i + 2] = dark ? 40 : 240;
        data[i + 3] = 255;
      }
    }
    assert.equal(plateLooksUniform(data, w, h), false);
  });

  it("accepts solid plate as uniform", () => {
    const w = 40;
    const h = 16;
    const data = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 220;
      data[i + 1] = 40;
      data[i + 2] = 40;
      data[i + 3] = 255;
    }
    assert.equal(plateLooksUniform(data, w, h), true);
  });
});
