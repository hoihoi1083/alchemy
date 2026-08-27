import assert from "node:assert/strict";
import { describe, it } from "node:test";
import sharp from "sharp";
import {
  ensureMinimaxH3ImageBytes,
  MINIMAX_H3_MAX_ASPECT,
  MINIMAX_H3_MIN_ASPECT,
  MINIMAX_H3_MIN_IMAGE_EDGE,
} from "../lib/minimax-h3-image-guard";

describe("ensureMinimaxH3ImageBytes", () => {
  it("leaves compliant images unchanged", async () => {
    const src = await sharp({
      create: { width: 400, height: 300, channels: 3, background: "#336699" },
    })
      .png()
      .toBuffer();
    const out = await ensureMinimaxH3ImageBytes(src);
    assert.equal(out.changed, false);
    assert.equal(out.width, 400);
    assert.equal(out.height, 300);
    assert.equal(out.bytes.equals(src), true);
  });

  it("upscales tiny research thumbs so both edges are ≥256", async () => {
    const src = await sharp({
      create: { width: 120, height: 80, channels: 3, background: "#112233" },
    })
      .jpeg()
      .toBuffer();
    const out = await ensureMinimaxH3ImageBytes(src);
    assert.equal(out.changed, true);
    assert.ok(out.width >= MINIMAX_H3_MIN_IMAGE_EDGE);
    assert.ok(out.height >= MINIMAX_H3_MIN_IMAGE_EDGE);
    const ratio = out.width / out.height;
    assert.ok(ratio >= MINIMAX_H3_MIN_ASPECT);
    assert.ok(ratio <= MINIMAX_H3_MAX_ASPECT);
  });

  it("letterboxes wide logos into the H3 aspect window", async () => {
    const src = await sharp({
      create: { width: 800, height: 120, channels: 3, background: "#abcdef" },
    })
      .png()
      .toBuffer();
    const out = await ensureMinimaxH3ImageBytes(src);
    assert.equal(out.changed, true);
    assert.ok(out.width >= MINIMAX_H3_MIN_IMAGE_EDGE);
    assert.ok(out.height >= MINIMAX_H3_MIN_IMAGE_EDGE);
    const ratio = out.width / out.height;
    assert.ok(ratio >= MINIMAX_H3_MIN_ASPECT);
    assert.ok(ratio <= MINIMAX_H3_MAX_ASPECT);
  });

  it("letterboxes tall strips into the H3 aspect window", async () => {
    const src = await sharp({
      create: { width: 100, height: 700, channels: 3, background: "#fedcba" },
    })
      .png()
      .toBuffer();
    const out = await ensureMinimaxH3ImageBytes(src);
    assert.equal(out.changed, true);
    const ratio = out.width / out.height;
    assert.ok(ratio >= MINIMAX_H3_MIN_ASPECT);
    assert.ok(ratio <= MINIMAX_H3_MAX_ASPECT);
  });
});
