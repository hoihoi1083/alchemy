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

  it("start/end stills require cute polished cartoon, forbid photoreal", () => {
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
    assert.match(start, /THREE stacked bands/i);
    assert.match(start, /polished cute cartoon/i);
    assert.match(start, /photoreal photo of a real person/i);
    assert.match(end, /drinking \/ ingestion/i);
    assert.match(end, /Landing matches metaphor/i);
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
    assert.match(still, /no fake product bottle/i);
    assert.match(still, /THREE stacked bands/i);
    const video = buildSocialDripVideoPrompt({
      plan,
      product: "can't sleep over prompting",
      durationSec: 6,
      conceptMode: true,
    });
    assert.match(video, /Landing payoff/i);
    assert.match(video, /cute polished cartoon/i);
  });

  it("parses pick safely", () => {
    assert.equal(parseSocialDripMetaphorPick("auto"), "auto");
    assert.equal(parseSocialDripMetaphorPick("glow"), "glow");
    assert.equal(parseSocialDripMetaphorPick("nope"), "auto");
  });
});
