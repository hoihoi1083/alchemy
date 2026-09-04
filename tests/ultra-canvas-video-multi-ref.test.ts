import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCanvasVideoReferencePrompt,
  ULTRA_VIDEO_MAX_REF_IMAGES,
} from "../lib/pro-canvas-compose";

describe("buildCanvasVideoReferencePrompt", () => {
  it("maps aliases to @Image1…@ImageN with separate-subject lock", () => {
    const out = buildCanvasVideoReferencePrompt(
      "@Hero1 walks then boards @Mechine1 and flies",
      ["Hero1", "Mechine1"],
    );
    assert.match(out, /2 reference images attached/);
    assert.match(out, /@Image1 = Hero1/);
    assert.match(out, /@Image2 = Mechine1/);
    assert.match(out, /@Image1 walks then boards @Image2/);
    assert.match(out, /do not morph or merge/i);
    assert.doesNotMatch(out, /@Hero1/);
    assert.doesNotMatch(out, /图片/);
  });

  it("supports up to ULTRA_VIDEO_MAX_REF_IMAGES slots in naming", () => {
    assert.equal(ULTRA_VIDEO_MAX_REF_IMAGES, 9);
    const aliases = Array.from({ length: 4 }, (_, i) => `Ref${i + 1}`);
    const prompt = aliases.map((a) => `@${a}`).join(" and ");
    const out = buildCanvasVideoReferencePrompt(prompt, aliases);
    assert.match(out, /@Image4 = Ref4/);
    assert.match(out, /4 reference images attached/);
  });
});
