import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assessSocialDripFit,
  buildSocialDripStillPrompt,
  buildSocialDripVideoPrompt,
  heuristicSocialDripPlan,
  inferSocialDripCategory,
  normalizeSocialDripPlan,
  parseSocialDripMetaphorPick,
} from "../lib/social-drip";

describe("social-drip metaphors", () => {
  it("infers F&B category and pour heuristic", () => {
    const cat = inferSocialDripCategory({ product: "KFC burger" });
    assert.equal(cat, "fnb");
    const plan = heuristicSocialDripPlan({
      product: "KFC burger",
      headline: "Finger lickin good",
      pick: "auto",
    });
    assert.equal(plan.metaphorId, "pour");
    assert.equal(plan.source, "heuristic");
    assert.match(plan.landingDescription, /mouth/i);
  });

  it("beauty defaults to serum drip with no mouth drinking", () => {
    const plan = heuristicSocialDripPlan({
      product: "vitamin C serum",
      pick: "auto",
    });
    assert.equal(plan.metaphorId, "glow");
    assert.match(plan.landingDescription, /cheek/i);
    assert.match(plan.landingDescription, /NEVER pour into an open mouth/i);
    assert.equal(
      assessSocialDripFit({
        product: "vitamin C serum",
        hasProductPhoto: true,
        pick: "auto",
      }).level,
      "good",
    );
  });

  it("flags beauty + mouth pour as mismatch", () => {
    const fit = assessSocialDripFit({
      product: "vitamin C serum",
      hasProductPhoto: true,
      pick: "pour",
    });
    assert.equal(fit.level, "mismatch");
    assert.ok(fit.reasons.includes("caution_beauty_pour"));
    assert.ok(fit.reasons.includes("mismatch_wrong_metaphor"));
    assert.equal(fit.suggestedMetaphor, "glow");
  });

  it("honors user override", () => {
    const plan = heuristicSocialDripPlan({
      product: "serum",
      pick: "confetti",
    });
    assert.equal(plan.metaphorId, "confetti");
    assert.equal(plan.source, "user");
  });

  it("fills missing landingDescription via normalize", () => {
    const base = heuristicSocialDripPlan({ product: "burger", pick: "pour" });
    const broken = {
      ...base,
      landingDescription: "",
    };
    const fixed = normalizeSocialDripPlan(broken);
    assert.match(fixed.landingDescription, /mouth/i);
  });

  it("start/end stills match viral 三分屏 line-art recipe", () => {
    const plan = heuristicSocialDripPlan({
      product: "vitamin C serum",
      pick: "glow",
    });
    const start = buildSocialDripStillPrompt({
      plan,
      product: "vitamin C serum",
      frame: "start",
    });
    const end = buildSocialDripStillPrompt({
      plan,
      product: "vitamin C serum",
      frame: "end",
    });
    assert.match(start, /viral 三分屏 START/i);
    assert.match(start, /LINE-ART person/i);
    assert.match(start, /lying on their BACK/i);
    assert.match(end, /OVER the Instagram icons/i);
  });

  it("locks brand logo avatar and uses brand handle", () => {
    const plan = heuristicSocialDripPlan({
      product: "cheeseburger",
      brandName: "Alchemy AI Lab",
      pick: "pour",
    });
    assert.equal(plan.igHandle, "alchemy_ai_lab");
    const still = buildSocialDripStillPrompt({
      plan,
      product: "cheeseburger",
      frame: "start",
      brandLogoImageIndex: 2,
    });
    assert.match(still, /IMAGE 2 brand logo/i);
    assert.match(still, /LINE-ART person/i);
    assert.doesNotMatch(still, /漢堡/);
  });

  it("does not use product name as IG handle", () => {
    const plan = heuristicSocialDripPlan({
      product: "漢堡",
      business: "Alchemy AI Lab",
      pick: "pour",
    });
    assert.equal(plan.igHandle, "alchemy_ai_lab");
    assert.notEqual(plan.igHandle, "漢堡");
  });

  it("still prompts never paint layout percentage labels", () => {
    const plan = heuristicSocialDripPlan({
      conceptIdea: "ads made easy",
      conceptMode: true,
      pick: "confetti",
    });
    const still = buildSocialDripStillPrompt({
      plan,
      product: "ads made easy",
      conceptMode: true,
      frame: "start",
    });
    assert.match(still, /never paint TOP\/MIDDLE\/BOTTOM/i);
    assert.doesNotMatch(still, /TOP ~42%/);
    assert.doesNotMatch(still, /MIDDLE ~18%/);
  });

  it("concept mode avoids inventing SKU language in still prompt", () => {
    const plan = heuristicSocialDripPlan({
      conceptIdea: "can't sleep over prompting",
      conceptMode: true,
      pick: "light-streak",
    });
    const still = buildSocialDripStillPrompt({
      plan,
      product: "can't sleep over prompting",
      conceptMode: true,
      frame: "start",
    });
    assert.match(still, /fake product bottles/i);
    assert.match(still, /viral 三分屏 START/i);
    assert.match(still, /3–5 LARGE creative cards/i);
    assert.match(still, /NOTHING crossing/i);
    const video = buildSocialDripVideoPrompt({
      plan,
      product: "can't sleep over prompting",
      durationSec: 6,
      conceptMode: true,
    });
    assert.match(video, /Payoff/i);
    assert.match(video, /line-art person/i);
    assert.match(video, /IN FRONT of the IG bar/i);
  });

  it("concept defaults to confetti and flags abstract slogans", () => {
    const plan = heuristicSocialDripPlan({
      conceptIdea: "廣告素材立即到手",
      conceptMode: true,
      pick: "auto",
    });
    assert.equal(plan.metaphorId, "confetti");
    const fitOk = assessSocialDripFit({
      conceptIdea: "廣告素材立即到手",
      conceptMode: true,
      pick: "auto",
    });
    assert.equal(fitOk.level, "good");
    assert.ok(fitOk.reasons.includes("good_concept_falling"));
    const fitWeak = assessSocialDripFit({
      conceptIdea: "品牌成長",
      conceptMode: true,
      pick: "auto",
    });
    assert.equal(fitWeak.level, "caution");
    assert.ok(fitWeak.reasons.includes("caution_concept_abstract"));
  });

  it("parses pick safely", () => {
    assert.equal(parseSocialDripMetaphorPick("auto"), "auto");
    assert.equal(parseSocialDripMetaphorPick("glow"), "glow");
    assert.equal(parseSocialDripMetaphorPick("nope"), "auto");
  });
});
