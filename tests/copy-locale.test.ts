import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  coerceCopyScript,
  promptMarketFromLocale,
  resolveCopyLocale,
  voiceoverLocaleFromUiLocale,
} from "@/lib/copy-locale";

describe("UI locale → output language", () => {
  it("maps website language to prompt market", () => {
    assert.equal(promptMarketFromLocale("en"), "en");
    assert.equal(promptMarketFromLocale("zh-cn"), "cn");
    assert.equal(promptMarketFromLocale("zh"), "hk");
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
