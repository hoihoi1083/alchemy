import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
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
});
