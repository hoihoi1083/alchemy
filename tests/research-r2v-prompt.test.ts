import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildResearchR2vPrompt } from "../lib/research-r2v-prompt";

describe("buildResearchR2vPrompt", () => {
  it("prefers research seedancePrompt over generic videoPrompt", () => {
    const prompt = buildResearchR2vPrompt({
      researchAnalysis: {
        durationSec: 42,
        frameCount: 6,
        shots: [],
        visualDirection: "Product hero",
        motionSummary: "Fast cuts, handheld close-ups",
        seedancePrompt:
          "Scene 1: macro product on velvet. Scene 2: wrist reveal. Match @Video1 rhythm.",
        productionNotesZh: "產品展示",
      },
      videoPrompt: "Generic slow push-in on product with sparkle",
      fallbackPrompt: "Reference-to-video fallback",
    });
    assert.match(prompt, /macro product on velvet/);
    assert.match(prompt, /Fast cuts/);
    assert.match(prompt, /do NOT recreate tutorial/i);
    assert.doesNotMatch(prompt, /Generic slow push-in/);
  });

  it("uses videoPrompt when no research analysis", () => {
    const prompt = buildResearchR2vPrompt({
      videoPrompt: "Custom manual prompt",
      fallbackPrompt: "Fallback",
    });
    assert.match(prompt, /Custom manual prompt/);
  });
});
