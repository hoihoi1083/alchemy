import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { keywordLooksPrimarilyEnglish } from "../lib/justoneapi-platform-search";

describe("research language safety-net triggers", () => {
  it("flags English-only keywords for RedNote Chinese fallback", () => {
    assert.equal(keywordLooksPrimarilyEnglish("vitamin C serum"), true);
    assert.equal(keywordLooksPrimarilyEnglish("skincare routine"), true);
    assert.equal(keywordLooksPrimarilyEnglish("Portable Power Station"), true);
  });

  it("does not trigger Chinese fallback for Chinese or mixed keywords", () => {
    assert.equal(keywordLooksPrimarilyEnglish("維他命C精華"), false);
    assert.equal(keywordLooksPrimarilyEnglish("维生素C精华"), false);
    assert.equal(keywordLooksPrimarilyEnglish("上海鮮肉月餅"), false);
    assert.equal(keywordLooksPrimarilyEnglish("Vitamin C 精華"), false);
  });

  it("ignores empty / noise", () => {
    assert.equal(keywordLooksPrimarilyEnglish(""), false);
    assert.equal(keywordLooksPrimarilyEnglish("   "), false);
    assert.equal(keywordLooksPrimarilyEnglish("123"), false);
  });
});
