import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildTeachingCarouselSlideImagePrompt,
  buildCarouselImageNegativePrompt,
} from "../lib/prompt-variables";

const vars = {
  product: "一站式廣告平台",
  headline: "告別繁瑣流程",
  subline: "廣告製作流程繁瑣，素材分散難管理",
  offer: "立即體驗一站式廣告管理",
  market: "hk" as const,
  framing: "auto" as const,
  extra: "",
};

describe("concept teaching carousel prompt guards", () => {
  it("bans duplicate copy, English UI chips, and outer frames", () => {
    const prompt = buildTeachingCarouselSlideImagePrompt(
      vars,
      { theme: "一站式廣告", visualDna: "cinematic tech editorial" },
      {
        index: 2,
        role: "point",
        title: "告別繁瑣流程",
        body: "廣告製作流程繁瑣，素材分散難管理",
        takeaway: "短句總結",
        composition: "Tip slide — billboard metaphor",
      },
      4,
      "concept-social",
    );

    assert.match(prompt, /paint EXACTLY ONCE/i);
    assert.match(prompt, /upright|left-to-right|never rotate type/i);
    assert.match(prompt, /Image, Video, Copy, Copywriting/i);
    assert.match(prompt, /full-bleed/i);
    assert.match(prompt, /outer matte|letterbox/i);
    assert.doesNotMatch(prompt, /one vertical text stack only/i);
    assert.doesNotMatch(prompt, /magazine-cover energy/i);
    assert.doesNotMatch(prompt, /Create a scroll-stopping vertical SOCIAL MEDIA POST/);
  });

  it("寫實 concept locks photoreal and bans robot/cartoon mascots", () => {
    const prompt = buildTeachingCarouselSlideImagePrompt(
      { ...vars, artStyle: "realistic" },
      {
        theme: "一站式廣告平台",
        visualDna: "photorealistic commercial photography of real workplaces",
      },
      {
        index: 1,
        role: "cover",
        title: "一站式廣告平台",
        body: "集中管理多渠道廣告",
        takeaway: "",
        composition: "Editorial cover — photoreal desk scene",
      },
      4,
      "concept-social",
    );
    assert.match(prompt, /Photorealistic commercial photography|MANDATORY RENDER MEDIUM/i);
    assert.match(prompt, /Do NOT invent robot|NO cute robot|NO Pixar/i);
    assert.match(prompt, /robot mascot|Pixar CGI|cartoon 3D/i);
  });

  it("concept tip slides get unique copy lock with that slide's headline", () => {
    const prompt = buildTeachingCarouselSlideImagePrompt(
      { ...vars, artStyle: "realistic", headline: "唔使識寫prompt，廣告輕鬆到手" },
      { theme: "AI廣告", visualDna: "photoreal office" },
      {
        index: 2,
        role: "point",
        title: "三步完成廣告",
        body: "上傳產品、選模板、一鍵生成",
        takeaway: "記住流程",
        composition: "Tip — desk with laptop dashboard",
      },
      5,
      "concept-social",
    );
    assert.match(prompt, /UNIQUE SLIDE COPY LOCK/);
    assert.match(prompt, /三步完成廣告/);
    assert.match(prompt, /never reuse|differ from the cover/i);
  });

  it("negative prompt includes frame, twin-title, and rotated-type avoids", () => {
    const neg = buildCarouselImageNegativePrompt("auto");
    assert.match(neg, /outer matte|letterbox/i);
    assert.match(neg, /Copywriting/i);
    assert.match(neg, /duplicated headline/i);
    assert.match(neg, /rotated text|sideways typography|vertical lettering/i);
    assert.match(neg, /robot mascot|Pixar|cartoon 3D/i);
  });
  it("locks product hero on tip slides when product photo is present", () => {
    const prompt = buildTeachingCarouselSlideImagePrompt(
      { ...vars, product: "金砂石手鏈" },
      { theme: "金砂石手鏈", visualDna: "soft 3D edu character series" },
      {
        index: 2,
        role: "point",
        title: "什麼是金砂石",
        body: "石英與赤鐵礦構成的閃光效果",
        takeaway: "認識材質",
        composition: "Educational tip card",
      },
      5,
      "promo-ai",
      null,
      "clone",
      { hasProductPhoto: true, productName: "金砂石手鏈" },
    );
    assert.match(prompt, /PRODUCT HERO LOCK/);
    assert.match(prompt, /SERIES CONSISTENCY LOCK/);
    assert.match(prompt, /金砂石手鏈/);
    assert.match(prompt, /Do NOT replace|substitute/i);
    assert.match(prompt, /photorealistic human|bathroom|lifestyle cutaway/i);
  });
});
