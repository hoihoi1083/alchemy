import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  looksLikeSpaClinicServiceBrief,
  looksLikeSpaOrBeautyBrief,
  saferSameSceneStillPrompt,
  spaSafeStillFallbackPrompt,
  STORYBOARD_CELL_BLOCKED_PREFIX,
  storyboardCellBlockedMessage,
} from "../lib/seedance-moderation";

describe("storyboard still policy fallback", () => {
  it("safer retry keeps power-bank identity and does not mention spa", () => {
    const out = saferSameSceneStillPrompt({
      originalPrompt:
        "9:16 commercial still: close-up of a matte black 20000mAh power bank on a desk, Nike logo on the sleeve.",
      role: "macro",
      theme: "portable charger launch",
      productName: "Anker power bank",
    });
    assert.match(out, /Anker power bank|portable charger|power bank/i);
    assert.match(out, /macro/i);
    assert.doesNotMatch(out, /spa treatment|spa room|white towels/i);
    assert.match(out, /no photorealistic faces/i);
  });

  it("spa template is only for actual spa briefs", () => {
    assert.equal(looksLikeSpaOrBeautyBrief("Anker 20000mAh power bank", "desk hero"), false);
    assert.equal(looksLikeSpaOrBeautyBrief("facial spa", "serum ritual"), true);
    assert.equal(looksLikeSpaOrBeautyBrief("massage gun", "recovery tool launch"), false);
    assert.equal(looksLikeSpaOrBeautyBrief("towel warmer", "hotel amenity"), false);
    assert.equal(looksLikeSpaOrBeautyBrief("serum bottle", "glass packaging"), false);
    assert.equal(looksLikeSpaOrBeautyBrief("gold bracelet", "close-up of face wearing jewelry"), false);
    const spa = spaSafeStillFallbackPrompt({
      theme: "facial spa",
      role: "establish",
    });
    assert.match(spa, /spa marketing still/i);
  });

  it("spa clinic gate excludes lifestyle skincare posts", () => {
    assert.equal(
      looksLikeSpaClinicServiceBrief(
        "skincare brand relaunch",
        "Everything you knew about skincare might be wrong",
        "lifestyle-photo, casual home",
      ),
      false,
    );
    assert.equal(looksLikeSpaOrBeautyBrief("skincare brand relaunch", "護膚"), true);
    assert.equal(looksLikeSpaClinicServiceBrief("facial spa", "60-minute facial"), true);
    assert.equal(looksLikeSpaClinicServiceBrief("美容院面部護理"), true);
  });

  it("safer retry softens face close-ups without inventing spa for jewelry", () => {
    const out = saferSameSceneStillPrompt({
      originalPrompt: "close-up of face wearing a gold bracelet on linen",
      role: "detail",
      theme: "bracelet launch",
      productName: "gold bracelet",
    });
    assert.match(out, /mid-shot/i);
    assert.doesNotMatch(out, /spa guest|spa room|white towels/i);
    assert.match(out, /gold bracelet/i);
  });

  it("blocked cell message is tap-regen, not category swap", () => {
    const msg = storyboardCellBlockedMessage(3);
    assert.match(msg, new RegExp(STORYBOARD_CELL_BLOCKED_PREFIX));
    assert.match(msg, /Scene 3/);
    assert.doesNotMatch(msg, /spa/i);
  });
});
