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
  it("builds English source note for JustOne live search", () => {
    assert.equal(
      researchSourceNote(basePlan(), cr, "keyword"),
      "Instagram post search (live)",
    );
  });

  it("localizes JustOne fallback warning codes", () => {
    assert.match(
      localizeResearchWarning(researchWarningCode("justone_gateway"), cr, "instagram"),
      /temporarily down/i,
    );
  });

  it("passes through legacy warning strings", () => {
    assert.equal(
      localizeResearchWarning("Legacy message", cr, "instagram"),
      "Legacy message",
    );
  });
});
