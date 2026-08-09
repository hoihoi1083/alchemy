import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
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
    const spa = spaSafeStillFallbackPrompt({
      theme: "facial spa",
      role: "establish",
    });
    assert.match(spa, /spa marketing still/i);
  });

  it("blocked cell message is tap-regen, not category swap", () => {
    const msg = storyboardCellBlockedMessage(3);
    assert.match(msg, new RegExp(STORYBOARD_CELL_BLOCKED_PREFIX));
    assert.match(msg, /Scene 3/);
    assert.doesNotMatch(msg, /spa/i);
  });
});
