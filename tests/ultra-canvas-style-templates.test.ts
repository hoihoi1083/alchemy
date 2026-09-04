import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createUltraCanvasTemplate,
  ULTRA_CANVAS_TEMPLATE_IDS,
} from "../lib/ultra-canvas-templates";

describe("Ultra style templates", () => {
  it("registers comicToPhotoreal and comicRedCarpet", () => {
    assert.ok(ULTRA_CANVAS_TEMPLATE_IDS.includes("comicToPhotoreal"));
    assert.ok(ULTRA_CANVAS_TEMPLATE_IDS.includes("comicRedCarpet"));
  });

  it("comicToPhotoreal: comic upload → realistic still → video", () => {
    const tpl = createUltraCanvasTemplate("comicToPhotoreal", {});
    const upload = tpl.nodes.find((n) => n.id === "tpl-upload-comic");
    const image = tpl.nodes.find((n) => n.id === "tpl-image");
    const video = tpl.nodes.find((n) => n.id === "tpl-video");
    assert.equal((upload?.data as { alias?: string }).alias, "ComicHero");
    assert.equal((image?.data as { artStyleId?: string }).artStyleId, "realistic");
    assert.match(String((image?.data as { prompt?: string }).prompt), /@ComicHero/);
    assert.match(String((image?.data as { prompt?: string }).prompt), /No celebrity/);
    assert.equal((video?.data as { aspectRatio?: string }).aspectRatio, "9:16");
    assert.ok(tpl.edges.some((e) => e.source === "tpl-image" && e.target === "tpl-video"));
  });

  it("comicRedCarpet: OC face + comic style, bans celebrity likeness", () => {
    const tpl = createUltraCanvasTemplate("comicRedCarpet", {});
    const face = tpl.nodes.find((n) => n.id === "tpl-upload-face");
    const image = tpl.nodes.find((n) => n.id === "tpl-image");
    const char = tpl.nodes.find((n) => n.id === "tpl-char");
    assert.equal((face?.data as { alias?: string }).alias, "Face");
    assert.equal((image?.data as { artStyleId?: string }).artStyleId, "comic-webtoon");
    assert.match(String((image?.data as { prompt?: string }).prompt), /No celebrity/);
    assert.match(String((char?.data as { biography?: string }).biography), /NOT a Hollywood/);
    assert.ok(tpl.edges.some((e) => e.source === "tpl-upload-face" && e.target === "tpl-image"));
  });
});
