import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildDesignedPosterImagePrompt,
  buildGamingCoverImagePrompt,
  buildJelly3dImagePrompt,
  buildPromptVariables,
  buildSportsBigWordsImagePrompt,
  resolveImagePromptMode,
} from "../lib/prompt-variables";
import { shouldPlanSingleImageAd } from "../lib/single-image-plan";
import { isLockedSinglePosterStyle } from "../lib/visual-styles";

describe("image poster prompt modes", () => {
  const vars = buildPromptVariables({
    product: "energy drink can",
    business: "RUSH",
    headline: "CHALLENGE",
    subline: "ONE WINNER",
    offer: "",
    market: "en",
    framing: "auto",
    artStyle: "realistic",
  });

  it("resolves gaming / sports / jelly modes from visualStyleId", () => {
    assert.equal(resolveImagePromptMode("gaming-cover", "promo-ai"), "gaming-cover");
    assert.equal(
      resolveImagePromptMode("sports-big-words", "promo-ai"),
      "sports-big-words",
    );
    assert.equal(resolveImagePromptMode("jelly-3d", "promo-ai"), "jelly-3d");
  });

  it("builds prompts with style DNA keywords", () => {
    const gaming = buildGamingCoverImagePrompt(vars);
    assert.match(gaming, /GAMING COVER/i);
    assert.match(gaming, /HUD|barcode|in-world/i);

    const sports = buildSportsBigWordsImagePrompt(vars);
    assert.match(sports, /SPORTS BIG-WORDS|HIGH-IMPACT SPORTS/i);
    assert.match(sports, /worm's-eye|ARCHITECTURE|peak-impact/i);
    assert.match(sports, /FORBIDDEN:[\s\S]*gaming cover/i);

    const jelly = buildJelly3dImagePrompt(vars);
    assert.match(jelly, /JELLY|translucent|glossy/i);
    assert.match(jelly, /IDENTITY LOCK|Do NOT rematerialize/i);
    assert.match(jelly, /JELLY WORDS|jelly\/glass 3D/i);
  });

  it("locks single still and planner policy", () => {
    assert.equal(isLockedSinglePosterStyle("gaming-cover"), true);
    assert.equal(isLockedSinglePosterStyle("sports-big-words"), true);
    assert.equal(isLockedSinglePosterStyle("jelly-3d"), true);
    assert.equal(shouldPlanSingleImageAd("gaming-cover"), true);
    assert.equal(shouldPlanSingleImageAd("sports-big-words"), true);
    assert.equal(shouldPlanSingleImageAd("jelly-3d"), false);
  });

  it("paints designed-poster hook/tagline verbatim and does not invent slogans", () => {
    const poster = buildDesignedPosterImagePrompt(
      buildPromptVariables({
        product: "维他命 C 精华",
        headline: "sdfasdfsadfasdf",
        subline: "asdfsadfsadfsadfasdfasdfasdf",
        offer: "",
        market: "hk",
        framing: "auto",
        artStyle: "realistic",
      }),
    );
    assert.match(poster, /sdfasdfsadfasdf/);
    assert.match(poster, /asdfsadfsadfsadfasdfasdfasdf/);
    assert.match(poster, /verbatim/i);
    assert.match(poster, /Do NOT replace this with the product name/);
    assert.doesNotMatch(poster, /Invent a short commercial tagline/);
    assert.doesNotMatch(poster, /Bilingual type stack \(mandatory\)/);
    assert.doesNotMatch(poster, /English ALL-CAPS serif translation/);
  });
});
