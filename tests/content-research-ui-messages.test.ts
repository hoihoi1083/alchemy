import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { en } from "../lib/i18n/en";
import {
  localizeResearchWarning,
  researchSourceNote,
  researchWarningCode,
} from "../lib/content-research-ui-messages";
import type { ContentResearchPlan } from "../lib/content-research-types";

const cr = en.contentResearch;

function basePlan(
  partial: Partial<ContentResearchPlan> = {},
): ContentResearchPlan {
  return {
    platform: "instagram",
    platformLabel: "Instagram",
    topic: "skincare",
    summary: "",
    candidates: [],
    topPicks: [],
    researchMode: "live-web",
    searchProvider: "justoneapi",
    ...partial,
  };
}

describe("content-research-ui-messages", () => {
  it("builds English source note for live platform search", () => {
    assert.equal(
      researchSourceNote(basePlan(), cr, "keyword"),
      "Instagram post search (live)",
    );
  });

  it("omits provider names from web fallback source notes", () => {
    assert.equal(
      researchSourceNote(
        basePlan({ searchProvider: "tavily" }),
        cr,
        "keyword",
      ),
      "Live web research",
    );
  });

  it("localizes platform-search fallback warning codes without vendor names", () => {
    const msg = localizeResearchWarning(
      researchWarningCode("justone_gateway"),
      cr,
      "instagram",
    );
    assert.match(msg ?? "", /temporarily unavailable/i);
    assert.doesNotMatch(msg ?? "", /Just One|Tavily|DeepSeek/i);
  });

  it("localizes category broaden warning", () => {
    assert.match(
      localizeResearchWarning(researchWarningCode("category_broadened"), cr, "xiaohongshu"),
      /category/i,
    );
  });

  it("scrubs legacy warning strings that name vendors", () => {
    assert.equal(
      localizeResearchWarning("Just One API failed — use Tavily", cr, "instagram"),
      cr.justOneFallbackGeneric(""),
    );
  });

  it("passes through safe legacy warning strings", () => {
    assert.equal(
      localizeResearchWarning("Legacy message", cr, "instagram"),
      "Legacy message",
    );
  });
});
