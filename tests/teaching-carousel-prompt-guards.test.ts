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

  it("negative prompt includes frame, twin-title, and rotated-type avoids", () => {
    const neg = buildCarouselImageNegativePrompt("auto");
    assert.match(neg, /outer matte|letterbox/i);
    assert.match(neg, /Copywriting/i);
    assert.match(neg, /duplicated headline/i);
    assert.match(neg, /rotated text|sideways typography|vertical lettering/i);
  });
});
