import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  briefFromConceptVision,
  overrideBriefForContentResearch,
  USER_REFERENCE_LAYOUT_TRANSFER_MARKER,
  userReferenceLayoutTransferPromptBlock,
} from "../lib/user-reference-brief";
import { parseReferenceBriefJson } from "../lib/reference-strategy";
import {
  buildOptimizeSceneEssayUserMessage,
  campaignHeadlineForSceneEssay,
  fallbackOptimizedSceneEssay,
  sceneOptimizeFingerprint,
} from "../lib/optimize-reference-scene-prompt";
import { buildPromptVariables, buildReferenceConceptImagePrompt } from "../lib/prompt-variables";

describe("campaignHeadlineForSceneEssay", () => {
  it("drops headline when it is only the product name", () => {
    assert.equal(
      campaignHeadlineForSceneEssay({ product: "冰川精華", headline: "冰川精華" }),
      "",
    );
    assert.equal(
      campaignHeadlineForSceneEssay({ product: "冰川精華", headline: "一滴鎖水" }),
      "一滴鎖水",
    );
  });
});

describe("fallbackOptimizedSceneEssay", () => {
  it("keeps spine and swaps hero + exact headline", () => {
    const out = fallbackOptimizedSceneEssay({
      sceneEssay:
        "Centered tall glass, 60% frame, moss stone table, misty eastern garden, dark back bright subject.",
      product: "山野白桃",
      headline: "山野白桃",
      offer: "今日試飲",
    });
    assert.match(out, /moss stone|misty eastern/i);
    assert.match(out, /山野白桃/);
    assert.match(out, /今日試飲/);
    assert.match(out, /Do not paint the product name as a masthead/);
    assert.match(out, /NAME VS PHOTO/);
    assert.doesNotMatch(out, /Hero is the user's product "山野白桃"/);
  });
});

describe("buildOptimizeSceneEssayUserMessage", () => {
  it("asks to keep spine and IMAGE 1 hero, name as claim", () => {
    const msg = buildOptimizeSceneEssayUserMessage({
      sceneEssay: "Mango pomelo sago on moss, calligraphy masthead.",
      product: "山野白桃茶",
      headline: "山野白桃",
    });
    assert.match(msg, /KEEP:/);
    assert.match(msg, /IMAGE 1 photographed object/);
    assert.match(msg, /NAME VS PHOTO/);
    assert.match(msg, /山野白桃茶/);
    assert.match(msg, /Mango pomelo/);
    assert.doesNotMatch(msg, /REPLACE hero with the user's product/);
  });
});

describe("scene essay on brief → layout-transfer prompt", () => {
  it("briefFromConceptVision keeps sceneEssay", () => {
    const brief = briefFromConceptVision({
      sceneSummary: "drink poster",
      topic: "mango",
      subjects: "cup",
      visibleText: "杨枝甘露",
      contentType: "poster",
      layoutStyle: "centered hero",
      colorPalette: "amber moss",
      typographyStyle: "calligraphy",
      mood: "misty",
      motionHints: "",
      sceneEssay: "Tall glass 60% frame on moss, mist mountains, dark-bright.",
    });
    assert.match(brief.sceneEssay ?? "", /60% frame/);
  });

  it("layout-transfer block injects SCENE ESSAY", () => {
    const block = userReferenceLayoutTransferPromptBlock(
      {
        topic: "peach tea",
        contentSummary: "",
        visibleText: "",
        subjects: "mango cup",
        contentType: "poster",
        layoutStyle: "centered",
        colorPalette: "amber",
        typographyStyle: "serif",
        mood: "mist",
        motionHints: "",
        optimizedScenePrompt:
          "Amber peach tea glass on moss, mist mountains, cream masthead 山野白桃.",
      },
      {
        layoutGrammar: "keep",
        visualStyle: "keep",
        contentLane: "replace",
        subjects: "replace",
        onImageText: "replace",
        moodLighting: "adapt",
        stagingPose: "keep",
      },
    );
    assert.match(block, /SCENE ESSAY/);
    assert.match(block, /山野白桃/);
  });

  it("research override keeps sceneEssay and clears stale optimize", () => {
    const overridden = overrideBriefForContentResearch(
      {
        topic: "水瓶座",
        contentSummary: "星座",
        visibleText: "旺",
        subjects: "星",
        contentType: "poster",
        layoutStyle: "grid",
        colorPalette: "blue",
        typographyStyle: "sans",
        mood: "calm",
        motionHints: "",
        sceneEssay: "Soft blue grid poster, airy negative space top.",
        optimizedScenePrompt: "old zodiac essay",
        optimizeFingerprint: "old",
      },
      { product: "金砂石手串", headline: "今日轉運" },
    );
    assert.equal(overridden.topic, "金砂石手串");
    assert.match(overridden.sceneEssay ?? "", /Soft blue grid/);
    assert.equal(overridden.optimizedScenePrompt, undefined);
  });

  it("parseReferenceBriefJson round-trips essay fields", () => {
    const raw = JSON.stringify({
      topic: "tea",
      contentSummary: "",
      visibleText: "",
      subjects: "",
      contentType: "poster",
      layoutStyle: "center",
      colorPalette: "amber",
      typographyStyle: "",
      mood: "mist",
      motionHints: "",
      sceneEssay: "moss table mist",
      optimizedScenePrompt: "peach tea moss mist",
      optimizeFingerprint: "a|b|c|d",
    });
    const parsed = parseReferenceBriefJson(raw);
    assert.ok(parsed);
    assert.equal(parsed.sceneEssay, "moss table mist");
    assert.equal(parsed.optimizedScenePrompt, "peach tea moss mist");
    assert.equal(
      sceneOptimizeFingerprint({ product: "a", headline: "b", subline: "c", offer: "d" }),
      "v2-pixels-win|a|b|c|d",
    );
  });

  it("buildReferenceConceptImagePrompt follows SCENE ESSAY when present", () => {
    const extra = `${USER_REFERENCE_LAYOUT_TRANSFER_MARKER}: SCENE ESSAY (optimized look-copy — IMAGE 1 pixels are the only hero; product name is claim only; ignore any other product named here): moss mist 60% glass peach tea`;
    const prompt = buildReferenceConceptImagePrompt(
      buildPromptVariables({
        product: "山野白桃",
        headline: "山野白桃",
        extra,
      }),
      { structuredReferenceBrief: true },
    );
    assert.match(prompt, /SCENE ESSAY/);
    assert.match(prompt, /set \/ lighting \/ composition screenplay/i);
    assert.doesNotMatch(prompt, /LAYER A/);
  });
});
