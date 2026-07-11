import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { wizardPromoteName } from "../lib/wizard-promote-name";

describe("wizardPromoteName", () => {
  it("concept mode prefers headline over search topic", () => {
    assert.equal(
      wizardPromoteName({
        promotionMode: "concept",
        product: "",
        headline: "2026年韓國最新規定！",
        conceptIdea: "5天韓國旅行行程 — 小紅書 style",
      }),
      "2026年韓國最新規定！",
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
