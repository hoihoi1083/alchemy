import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  clampLineText,
  joinVoiceoverScript,
  looksIncompleteSpoken,
  pickSpokenText,
} from "@/lib/clamp-line-text";

describe("clampLineText", () => {
  it("does not leave mid-word Latin fragments like 'material w'", () => {
    const full = "Create marketing material with AI in one click";
    const out = clampLineText(full, 27);
    assert.ok(!/\s[a-z]$/i.test(out), `ended mid-word: ${JSON.stringify(out)}`);
    assert.ok(out.includes("marketing") || out.includes("Create"));
    assert.ok(out.length <= 27);
  });

  it("strips dangling CJK particles after a hard cut", () => {
    const out = clampLineText("一鍵生成專業行銷素材給你的品牌", 12);
    assert.ok(!looksIncompleteSpoken(out), `still incomplete: ${JSON.stringify(out)}`);
    assert.ok(out.length <= 12);
  });

  it("keeps short strings intact", () => {
    assert.equal(clampLineText("Hello", 40), "Hello");
  });
});

describe("pickSpokenText", () => {
  it("falls back to on-screen text instead of butchered expansions", () => {
    const screen = "Save hours of design work";
    const butchered = "You can save hours of";
    assert.equal(pickSpokenText(screen, butchered, 27), screen);
  });

  it("rejects over-long English expansions instead of slicing them", () => {
    const screen = "Create promo materials in one click";
    const long =
      "Create professional promo materials with AI in one click today";
    assert.equal(pickSpokenText(screen, long, 27), screen);
  });

  it("rejects butchered Chinese expansions", () => {
    const screen = "一鍵生成宣傳素材";
    const butchered = "你可以節省大量的";
    assert.equal(pickSpokenText(screen, butchered, 14), screen);
  });

  it("rejects over-long Chinese expansions", () => {
    const screen = "一鍵生成宣傳素材";
    const long = "你可以一鍵生成專業宣傳素材節省設計時間";
    assert.equal(pickSpokenText(screen, long, 14), screen);
  });

  it("keeps a complete expansion that fits", () => {
    const screen = "Save hours";
    const spoken = "Save hours of design work";
    assert.equal(pickSpokenText(screen, spoken, 40), spoken);
  });

  it("keeps a complete Chinese expansion that fits", () => {
    const screen = "一鍵生成";
    const spoken = "一鍵生成宣傳素材";
    assert.equal(pickSpokenText(screen, spoken, 20), spoken);
  });
});

describe("joinVoiceoverScript", () => {
  it("uses middle-dot for English", () => {
    assert.equal(joinVoiceoverScript(["One", "Two"], "en"), "One · Two");
  });

  it("uses ideographic comma for Chinese", () => {
    assert.equal(
      joinVoiceoverScript(["一鍵生成", "節省時間"], "hk"),
      "一鍵生成，節省時間",
    );
  });
});
