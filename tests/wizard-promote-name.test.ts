import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { wizardPromoteName } from "../lib/wizard-promote-name";

describe("wizardPromoteName", () => {
  it("concept mode preserves conceptIdea over a generated headline", () => {
    assert.equal(
      wizardPromoteName({
        promotionMode: "concept",
        product: "",
        headline: "2026年韓國最新規定！",
        conceptIdea: "5天韓國旅行行程 — RedNote style",
      }),
      "5天韓國旅行行程 — RedNote style",
    );
  });

  it("physical mode uses product field only", () => {
    assert.equal(
      wizardPromoteName({
        promotionMode: "physical",
        product: "粉水晶手鏈",
        headline: "ignored",
      }),
      "粉水晶手鏈",
    );
  });
});
