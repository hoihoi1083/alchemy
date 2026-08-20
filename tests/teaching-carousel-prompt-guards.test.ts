import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildTeachingCarouselSlideImagePrompt,
  buildCarouselImageNegativePrompt,
} from "../lib/prompt-variables";
import { USER_REFERENCE_LAYOUT_TRANSFER_MARKER } from "../lib/user-reference-brief";
import { buildTeachingCarouselPlanPromptForTest } from "../lib/teaching-carousel-plan";

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

  it("寫實 concept allows creative metaphor (not desk-only / anti-robot lock)", () => {
    const prompt = buildTeachingCarouselSlideImagePrompt(
      { ...vars, artStyle: "realistic" },
      {
        theme: "一站式廣告平台",
        visualDna: "editorial metaphor matching concept mood",
      },
      {
        index: 1,
        role: "cover",
        title: "一站式廣告平台",
        body: "集中管理多渠道廣告",
        takeaway: "",
        composition: "Editorial cover — bold headline over lifestyle/metaphor photo",
      },
      4,
      "concept-social",
    );
    assert.match(prompt, /metaphorical scene|visual metaphor|concept mood/i);
    assert.doesNotMatch(prompt, /Do NOT invent robot mascots/i);
    assert.doesNotMatch(prompt, /NO cute robot or AI mascots/i);
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
    assert.match(prompt, /IMAGE 1 pixels ARE the product/);
    assert.match(prompt, /NAME VS PHOTO/);
    assert.match(prompt, /SERIES CONSISTENCY LOCK/);
    assert.match(prompt, /金砂石手鏈/);
    assert.doesNotMatch(prompt, /exact photo of 金砂石手鏈/);
    assert.match(prompt, /Do NOT replace|substitute/i);
    assert.match(prompt, /TIP \/ SELLING-POINT|typography only/i);
    assert.match(prompt, /charger|power station|快速充電/i);
    assert.match(prompt, /photorealistic human|bathroom|lifestyle cutaway/i);
  });

  it("国风 look grade stays photoreal — no illustrated teaching page / manga icons", () => {
    const prompt = buildTeachingCarouselSlideImagePrompt(
      { ...vars, artStyle: "guofeng" },
      { theme: "便攜電源", visualDna: "国风 mist mountains" },
      {
        index: 2,
        role: "point",
        title: "快速充電",
        body: "節省時間",
        takeaway: "效率",
        composition: "Tip — product hero",
      },
      5,
      "promo-ai",
      null,
      "clone",
      { hasProductPhoto: true, productName: "便攜電源" },
    );
    assert.match(prompt, /LOOK GRADE|look grade/i);
    assert.doesNotMatch(prompt, /ILLUSTRATED teaching carousel/i);
    assert.match(prompt, /manga|cartoon icons|webtoon/i);

    const plan = buildTeachingCarouselPlanPromptForTest({
      visualStyleId: "product",
      artStyleId: "guofeng",
      product: "便攜電源",
      headline: "一電在手",
      hasProductPhoto: true,
      promptMarket: "hk",
    });
    assert.match(plan, /LOOK GRADE|look grade/i);
    assert.match(plan, /manga icons|cartoon USB/i);
    assert.doesNotMatch(plan, /entire carousel in this illustrated medium/);
  });

  it("model-wear teaching slides require a real person, not promo catalog", () => {
    const prompt = buildTeachingCarouselSlideImagePrompt(
      vars,
      { theme: "金砂石手鏈保養", visualDna: "lifestyle jewelry tips" },
      {
        index: 2,
        role: "point",
        title: "清潔與保養技巧",
        body: "使用柔軟乾布輕拭",
        takeaway: "定期保養",
        composition: "Tip — person wearing bracelet",
      },
      4,
      "model-wear",
      null,
      "clone",
      {
        visualStyleId: "model-wear",
        hasProductPhoto: true,
        productName: "金砂石手鏈",
      },
    );
    assert.match(prompt, /MODEL WEAR|real person/i);
    assert.match(prompt, /SERIES MODEL-WEAR LOCK|wearing or using/i);
  });

  it("layout-transfer cover follows IMAGE 2; tip slides share look only", () => {
    const layoutVars = {
      ...vars,
      extra: `${USER_REFERENCE_LAYOUT_TRANSFER_MARKER}: lifestyle serum poster`,
    };
    const cover = buildTeachingCarouselSlideImagePrompt(
      layoutVars,
      { theme: "維他命 C 精華", visualDna: "lifestyle serum poster" },
      {
        index: 1,
        role: "cover",
        title: "維他命 C 精華 | 必看攻略",
        body: "選購要點",
        takeaway: "",
        composition: "Centered hero, product at chest",
      },
      4,
      "promo-ai",
      null,
      "clone",
      {
        referenceConcept: true,
        hasProductPhoto: true,
        productName: "維他命 C 精華",
      },
    );
    assert.match(cover, /LAYOUT TRANSFER COVER/);
    assert.match(cover, /Replicate IMAGE 2 ad design grammar on this COVER/i);
    assert.match(cover, /IMAGE 2 pixels still win for layout/);

    const tip = buildTeachingCarouselSlideImagePrompt(
      layoutVars,
      { theme: "維他命 C 精華", visualDna: "lifestyle serum poster" },
      {
        index: 2,
        role: "point",
        title: "選購要點：濃度與穩定性",
        body: "濃度不是越高越好",
        takeaway: "",
        composition: "Macro of bottle with tip list",
      },
      4,
      "promo-ai",
      null,
      "clone",
      {
        referenceConcept: true,
        hasProductPhoto: true,
        productName: "維他命 C 精華",
      },
    );
    assert.match(tip, /LAYOUT TRANSFER TIP/);
    assert.match(tip, /COVER-only|cover only/i);
    assert.match(tip, /look only|palette, lighting/i);
    assert.doesNotMatch(tip, /Replicate IMAGE 2 ad design grammar on this COVER/);
    assert.doesNotMatch(tip, /IMAGE 2 pixels still win for layout/);

    const plan = buildTeachingCarouselPlanPromptForTest({
      visualStyleId: "product",
      product: "維他命 C 精華",
      headline: "必看攻略",
      hasProductPhoto: true,
      referenceStrategyKind: "layout-transfer",
      promptMarket: "hk",
    });
    assert.match(plan, /ONLY the cover mirrors that poster/i);
    assert.match(plan, /DISTINCT composition/i);
    assert.doesNotMatch(plan, /Mirror IMAGE 2 design grammar on every slide/);
  });
});
