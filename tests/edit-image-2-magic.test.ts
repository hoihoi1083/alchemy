import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeExpandSides } from "../lib/edit-image-2-expand";
import { parseMagicChatIntent } from "../lib/edit-image-2-magic-chat";

describe("edit-image-2 expand", () => {
  it("grows tall poster toward 16:9 landscape", () => {
    const sides = computeExpandSides(900, 1600, 16 / 9);
    assert.ok(sides.expand_left + sides.expand_right > 100);
    assert.equal(sides.expand_top + sides.expand_bottom, 0);
  });

  it("grows wide poster toward 9:16 story", () => {
    const sides = computeExpandSides(1600, 900, 9 / 16);
    assert.ok(sides.expand_top + sides.expand_bottom > 100);
  });
});

describe("magic board chat intents", () => {
  it("parses split / grab / erase / rewrite", () => {
    assert.equal(parseMagicChatIntent("拆层").type, "split");
    assert.equal(parseMagicChatIntent("点选提起").type, "grab_mode");
    assert.equal(parseMagicChatIntent("笔刷擦除").type, "brush_erase_mode");
    assert.equal(parseMagicChatIntent("扩展 9:16").type, "full_edit");
    assert.deepEqual(parseMagicChatIntent("改成 CR8"), {
      type: "rewrite",
      text: "CR8",
    });
  });

  it("falls back freeform to full_edit (whole image)", () => {
    assert.deepEqual(parseMagicChatIntent("把旗帜换成巴西国旗"), {
      type: "full_edit",
      instruction: "把旗帜换成巴西国旗",
    });
  });

  it("parses explicit layer-targeted edit", () => {
    assert.deepEqual(parseMagicChatIntent("改这层：换成红色"), {
      type: "ai_edit",
      instruction: "换成红色",
    });
  });
});
