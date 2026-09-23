import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  instagramSearchKeyword,
  simplifiedToTraditional,
} from "../lib/zh-simplified-to-traditional";

describe("zh-simplified-to-traditional", () => {
  it("converts mainland Simplified product phrases to Traditional", () => {
    assert.equal(simplifiedToTraditional("上海鲜肉月饼"), "上海鮮肉月餅");
    assert.equal(simplifiedToTraditional("维生素C精华"), "維生素C精華");
  });

  it("is idempotent for Traditional and leaves English alone", () => {
    assert.equal(simplifiedToTraditional("上海鮮肉月餅"), "上海鮮肉月餅");
    assert.equal(simplifiedToTraditional("Portable Power Station"), "Portable Power Station");
  });

  it("instagramSearchKeyword matches simplifiedToTraditional", () => {
    assert.equal(instagramSearchKeyword("鲜肉月饼"), "鮮肉月餅");
  });
});
