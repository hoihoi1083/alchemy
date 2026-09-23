import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildDesignedPosterImagePrompt,
  buildGamingCoverImagePrompt,
  buildJelly3dImagePrompt,
  buildMaterialLettersImagePrompt,
  buildProductHoldPosterImagePrompt,
  buildMoldWordPosterImagePrompt,
  buildDeconstructArchivePosterImagePrompt,
  buildOrbitTypePosterImagePrompt,
  buildClocheRevealPosterImagePrompt,
  buildProductLifestyleImagePrompt,
  buildPromptVariables,
  buildSportsBigWordsImagePrompt,
  buildTypeForceImagePrompt,
  buildTypeInteractionImagePrompt,
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

  it("resolves gaming / sports / jelly / type poster modes from visualStyleId", () => {
    assert.equal(resolveImagePromptMode("gaming-cover", "promo-ai"), "gaming-cover");
    assert.equal(
      resolveImagePromptMode("sports-big-words", "promo-ai"),
      "sports-big-words",
    );
    assert.equal(resolveImagePromptMode("jelly-3d", "promo-ai"), "jelly-3d");
    assert.equal(resolveImagePromptMode("type-force", "promo-ai"), "type-force");
    assert.equal(
      resolveImagePromptMode("spatial-layout", "promo-ai"),
      "spatial-layout",
    );
    assert.equal(
      resolveImagePromptMode("photo-doodle", "promo-ai"),
      "photo-doodle",
    );
    assert.equal(
      resolveImagePromptMode("light-trail", "promo-ai"),
      "light-trail",
    );
    assert.equal(
      resolveImagePromptMode("screen-break", "promo-ai"),
      "screen-break",
    );
    assert.equal(
      resolveImagePromptMode("material-letters", "promo-ai"),
      "material-letters",
    );
    assert.equal(
      resolveImagePromptMode("type-interaction", "promo-ai"),
      "type-interaction",
    );
    assert.equal(
      resolveImagePromptMode("product-lifestyle", "promo-ai"),
      "product-lifestyle",
    );
    assert.equal(
      resolveImagePromptMode("product-hold-poster", "promo-ai"),
      "product-hold-poster",
    );
    assert.equal(
      resolveImagePromptMode("mold-word-poster", "promo-ai"),
      "mold-word-poster",
    );
    assert.equal(
      resolveImagePromptMode("deconstruct-archive-poster", "promo-ai"),
      "deconstruct-archive-poster",
    );
    assert.equal(
      resolveImagePromptMode("orbit-type-poster", "promo-ai"),
      "orbit-type-poster",
    );
    assert.equal(
      resolveImagePromptMode("cloche-reveal-poster", "promo-ai"),
      "cloche-reveal-poster",
    );
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

    const force = buildTypeForceImagePrompt(vars, "shock-wave");
    assert.match(force, /TYPE-FORCE|SHOCK WAVE/i);

    const material = buildMaterialLettersImagePrompt(vars, "denim");
    assert.match(material, /MATERIAL-LETTERS|DENIM/i);

    const interaction = buildTypeInteractionImagePrompt(vars, "fold");
    assert.match(interaction, /TYPE-INTERACTION|FOLD/i);

    const lifestyle = buildProductLifestyleImagePrompt(vars);
    assert.match(lifestyle, /PRODUCT LIFESTYLE|EXTREME FOREGROUND/i);

    const hold = buildProductHoldPosterImagePrompt(vars);
    assert.match(hold, /PRODUCT-HOLD|TALKING PRODUCT-HOLD/i);
    assert.match(hold, /FORCED PERSPECTIVE|HOLD|PRESENT/i);
    assert.match(hold, /MANDATORY PERSON/i);

    const mold = buildMoldWordPosterImagePrompt(
      buildPromptVariables({
        product: "",
        headline: "土豆大王",
        subline: "",
        offer: "",
        market: "hk",
        framing: "auto",
        artStyle: "realistic",
      }),
    );
    assert.match(mold, /MOLD|CLAY FUNNY-WORD/i);
    assert.match(mold, /WORDS ARE THE STAR|HERO WORDS/i);
    assert.match(mold, /CONCEPT PATH|wordplay/i);

    const archive = buildDeconstructArchivePosterImagePrompt(vars);
    assert.match(archive, /DECONSTRUCT ARCHIVE/i);
    assert.match(archive, /TOP HALF|BOTTOM HALF|50%/i);
    assert.match(archive, /IDENTITY LOCK|SAME product/i);

    const orbit = buildOrbitTypePosterImagePrompt(
      buildPromptVariables({
        product: "energy drink can",
        business: "RUSH",
        headline: "RISE UP",
        subline: "ACTIVE NOISE",
        offer: "",
        market: "en",
        framing: "auto",
        artStyle: "realistic",
        promotionMode: "physical",
      }),
    );
    assert.match(orbit, /ORBIT TYPE/i);
    assert.match(orbit, /CENTER|orbit|BEHIND/i);
    assert.match(orbit, /PRODUCT PATH/i);

    const orbitConcept = buildOrbitTypePosterImagePrompt(
      buildPromptVariables({
        product: "Alchemy mascot",
        headline: "LESS PROMPT MORE CREATING",
        subline: "",
        offer: "",
        market: "en",
        framing: "auto",
        artStyle: "realistic",
        promotionMode: "concept",
      }),
    );
    assert.match(orbitConcept, /CONCEPT PATH/i);
    assert.match(orbitConcept, /logo|mascot|idea/i);

    const cloche = buildClocheRevealPosterImagePrompt(
      buildPromptVariables({
        product: "serum bottle",
        headline: "Natural formula",
        subline: "",
        offer: "",
        market: "en",
        framing: "auto",
        artStyle: "realistic",
        promotionMode: "physical",
      }),
    );
    assert.match(cloche, /CLOCHE REVEAL/i);
    assert.match(cloche, /SILVER|dome|tray/i);
    assert.match(cloche, /PRODUCT PATH/i);

    const clocheConcept = buildClocheRevealPosterImagePrompt(
      buildPromptVariables({
        product: "",
        headline: "Alchemy AI Lab",
        subline: "",
        offer: "",
        market: "en",
        framing: "auto",
        artStyle: "realistic",
        promotionMode: "concept",
      }),
    );
    assert.match(clocheConcept, /CONCEPT PATH|BRAND LOGO/i);
  });

  it("locks single still and planner policy", () => {
    assert.equal(isLockedSinglePosterStyle("gaming-cover"), true);
    assert.equal(isLockedSinglePosterStyle("sports-big-words"), true);
    assert.equal(isLockedSinglePosterStyle("jelly-3d"), true);
    assert.equal(isLockedSinglePosterStyle("type-force"), true);
    assert.equal(isLockedSinglePosterStyle("spatial-layout"), true);
    assert.equal(isLockedSinglePosterStyle("photo-doodle"), true);
    assert.equal(isLockedSinglePosterStyle("light-trail"), true);
    assert.equal(isLockedSinglePosterStyle("screen-break"), true);
    assert.equal(isLockedSinglePosterStyle("material-letters"), true);
    assert.equal(isLockedSinglePosterStyle("type-interaction"), true);
    assert.equal(isLockedSinglePosterStyle("product-lifestyle"), false);
    assert.equal(isLockedSinglePosterStyle("product-hold-poster"), true);
    assert.equal(isLockedSinglePosterStyle("mold-word-poster"), true);
    assert.equal(isLockedSinglePosterStyle("deconstruct-archive-poster"), true);
    assert.equal(isLockedSinglePosterStyle("orbit-type-poster"), true);
    assert.equal(isLockedSinglePosterStyle("cloche-reveal-poster"), true);
    assert.equal(shouldPlanSingleImageAd("gaming-cover"), true);
    assert.equal(shouldPlanSingleImageAd("sports-big-words"), true);
    assert.equal(shouldPlanSingleImageAd("jelly-3d"), false);
    assert.equal(shouldPlanSingleImageAd("type-force"), false);
    assert.equal(shouldPlanSingleImageAd("spatial-layout"), false);
    assert.equal(shouldPlanSingleImageAd("photo-doodle"), false);
    assert.equal(shouldPlanSingleImageAd("light-trail"), false);
    assert.equal(shouldPlanSingleImageAd("screen-break"), false);
    assert.equal(shouldPlanSingleImageAd("product-lifestyle"), false);
    assert.equal(shouldPlanSingleImageAd("product-hold-poster"), true);
    assert.equal(shouldPlanSingleImageAd("mold-word-poster"), true);
    assert.equal(shouldPlanSingleImageAd("deconstruct-archive-poster"), true);
    assert.equal(shouldPlanSingleImageAd("orbit-type-poster"), true);
    assert.equal(shouldPlanSingleImageAd("cloche-reveal-poster"), true);
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
