import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  coerceCopyScript,
  preserveUserOnImageCopy,
  promptMarketFromLocale,
  resolveCopyLocale,
  voiceoverLocaleFromUiLocale,
  plannerOutputLanguageRule,
} from "@/lib/copy-locale";

describe("UI locale → output language", () => {
  it("maps website language to prompt market", () => {
    assert.equal(promptMarketFromLocale("en"), "en");
    assert.equal(promptMarketFromLocale("zh-cn"), "cn");
    assert.equal(promptMarketFromLocale("zh"), "hk");
    assert.equal(promptMarketFromLocale("zh-tw"), "tw");
  });

  it("maps website language to voiceover locale", () => {
    assert.equal(voiceoverLocaleFromUiLocale("en"), "en");
    assert.equal(voiceoverLocaleFromUiLocale("zh-cn"), "cn");
    assert.equal(voiceoverLocaleFromUiLocale("zh"), "hk");
  });

  it("resolveCopyLocale follows market even when brief language differs", () => {
    assert.equal(resolveCopyLocale("en", "世界杯觀戰"), "en");
    assert.equal(resolveCopyLocale("cn", "World Cup night"), "zh-hans");
    assert.equal(resolveCopyLocale("hk", "World Cup night"), "zh-hant");
    assert.equal(resolveCopyLocale("tw", "World Cup night"), "zh-hant");
  });

  it("plannerOutputLanguageRule forces UI market over input language", () => {
    const cn = plannerOutputLanguageRule("cn");
    assert.match(cn, /Simplified Chinese/);
    assert.match(cn, /Do NOT mirror/);
    const en = plannerOutputLanguageRule("en");
    assert.match(en, /English/);
    assert.match(en, /Do NOT mirror/);
  });

  it("keeps latin user copy verbatim under zh locale", () => {
    assert.equal(
      preserveUserOnImageCopy("sdfasdfsadfasdf", "zh-hant"),
      "sdfasdfsadfasdf",
    );
    assert.equal(
      preserveUserOnImageCopy("精华护肤", "zh-hant"),
      "精華護膚",
    );
  });

  it("coerceCopyScript converts mixed teaching titles to one script", () => {
    assert.equal(
      coerceCopyScript("精華：肌膚的營養補充劑", "zh-hans"),
      "精华：肌肤的营养补充剂",
    );
    assert.equal(coerceCopyScript("精华护肤", "zh-hant"), "精華護膚");
    assert.match(coerceCopyScript("如何选择适合你的精华", "zh-hant"), /選擇/);
    assert.match(coerceCopyScript("如何选择适合你的精华", "zh-hant"), /精華/);
  });
});
