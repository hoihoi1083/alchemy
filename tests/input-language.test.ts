import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  classifyInputLanguage,
  getUnsupportedInputIssue,
  getVoiceoverInputIssue,
  isUnsupportedInputLanguage,
  markUnsupportedInputContinued,
  softGateAllowsProceed,
  studioCopyLanguageFields,
  topicLooksChineseHan,
} from "@/lib/input-language";

describe("classifyInputLanguage", () => {
  it("allows English product names and sentences", () => {
    assert.equal(classifyInputLanguage("AirPods Pro"), "en");
    assert.equal(classifyInputLanguage("Portable Power Station"), "en");
    assert.equal(
      classifyInputLanguage("Warm lifestyle ad for camping power banks"),
      "en",
    );
  });

  it("allows Simplified and Traditional Chinese", () => {
    assert.equal(classifyInputLanguage("便携电源"), "zh");
    assert.equal(classifyInputLanguage("便攜電源"), "zh");
    assert.equal(classifyInputLanguage("如何选择适合你的精华"), "zh");
  });

  it("allows mixed English + Chinese", () => {
    assert.equal(classifyInputLanguage("Nike 氣墊跑鞋"), "mixed_en_zh");
    assert.equal(classifyInputLanguage("SK-II 神仙水"), "mixed_en_zh");
  });

  it("allows URLs hashtags handles SKUs and digit-only", () => {
    assert.equal(
      classifyInputLanguage("https://www.instagram.com/reel/abc"),
      "allow_noise",
    );
    assert.equal(classifyInputLanguage("#skincare"), "allow_noise");
    assert.equal(classifyInputLanguage("@brand.hk"), "allow_noise");
    assert.equal(classifyInputLanguage("SKU-A12"), "allow_noise");
    assert.equal(classifyInputLanguage("١٢٣"), "allow_noise");
    assert.equal(classifyInputLanguage("१२३"), "allow_noise");
    assert.equal(classifyInputLanguage("๑๒๓"), "allow_noise");
  });

  it("flags Japanese Korean Greek Bengali halfwidth kana", () => {
    assert.equal(classifyInputLanguage("ポータブル電源"), "unsupported");
    assert.equal(classifyInputLanguage("キャンプ用バッテリー"), "unsupported");
    assert.equal(classifyInputLanguage("캠핑용 파워뱅크"), "unsupported");
    assert.equal(classifyInputLanguage("こんにちは"), "unsupported");
    assert.equal(classifyInputLanguage("Ελληνικά"), "unsupported");
    assert.equal(classifyInputLanguage("বাংলা"), "unsupported");
    assert.equal(classifyInputLanguage("ﾃｽﾄ"), "unsupported");
    assert.equal(isUnsupportedInputLanguage("こんにちは"), true);
    assert.equal(getUnsupportedInputIssue("こんにちは").kind, "unsupported");
  });

  it("does not let a URL hide Japanese kana", () => {
    assert.equal(
      classifyInputLanguage("check https://x.com ポータブル電源"),
      "unsupported",
    );
  });

  it("never flags EN↔中文 as unsupported", () => {
    assert.equal(getUnsupportedInputIssue("AirPods Pro").kind, "none");
    assert.equal(getUnsupportedInputIssue("便攜電源").kind, "none");
    assert.equal(getUnsupportedInputIssue("精华护肤").kind, "none");
  });
});

describe("topicLooksChineseHan", () => {
  it("true for Chinese, false for Japanese kana", () => {
    assert.equal(topicLooksChineseHan("维C精华"), true);
    assert.equal(topicLooksChineseHan("維C精華"), true);
    assert.equal(topicLooksChineseHan("ポータブル"), false);
    assert.equal(topicLooksChineseHan("vitamin c"), false);
  });
});

describe("getVoiceoverInputIssue", () => {
  it("allows matching scripts and mixed", () => {
    assert.equal(getVoiceoverInputIssue("Hello world welcome", "en").kind, "none");
    assert.equal(getVoiceoverInputIssue("你好世界歡迎使用", "hk").kind, "none");
    assert.equal(getVoiceoverInputIssue("Nike 氣墊跑鞋宣傳", "cn").kind, "none");
  });

  it("blocks Chinese script on English voice", () => {
    const issue = getVoiceoverInputIssue("你好這是旁白", "en");
    assert.equal(issue.kind, "voice_mismatch");
  });

  it("blocks long English on Chinese voice but allows short brands", () => {
    assert.equal(getVoiceoverInputIssue("Nike", "hk").kind, "none");
    const long = getVoiceoverInputIssue(
      "This is a long English voiceover script for the product demo.",
      "hk",
    );
    assert.equal(long.kind, "voice_mismatch");
  });

  it("blocks Japanese on any voice", () => {
    assert.equal(getVoiceoverInputIssue("こんにちは皆さん", "en").kind, "unsupported");
    assert.equal(getVoiceoverInputIssue("こんにちは皆さん", "hk").kind, "unsupported");
  });
});

describe("softGate Continue keys", () => {
  it("Continue on Setup fields unlocks Generate with extra empty conceptIdea", () => {
    const product = "ポータブル電源";
    const setup = studioCopyLanguageFields({
      product,
      business: "",
      headline: "",
      subline: "",
      offer: "",
      promptExtra: "",
      conceptIdea: "",
    });
    assert.equal(softGateAllowsProceed(...setup), false);
    markUnsupportedInputContinued(product, "", "", "", "", "");
    // Generate uses same product text + empty conceptIdea
    const generate = studioCopyLanguageFields({
      product,
      business: "",
      headline: "",
      subline: "",
      offer: "",
      promptExtra: "",
      conceptIdea: "",
    });
    assert.equal(softGateAllowsProceed(...generate), true);
  });
});
