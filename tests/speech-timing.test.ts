import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { spokenCharBudget, speechCharsPerSec } from "@/lib/speech-timing";

describe("speech timing budgets", () => {
  it("keeps English under aggressive 13cps fill (prevents 26s TTS on 20s video)", () => {
    // 20s / 4 lines ≈ 5s windows
    const budget = spokenCharBudget(5, "en");
    assert.ok(budget.maxChars <= 45, `maxChars ${budget.maxChars} too high`);
    assert.ok(budget.targetChars <= 40, `targetChars ${budget.targetChars} too high`);
    // Four windows of maxChars should not demand ~26s at real ~10 cps
    const worstCaseSec = (budget.maxChars * 4) / speechCharsPerSec("en");
    assert.ok(worstCaseSec <= 22, `worst-case speech ${worstCaseSec.toFixed(1)}s exceeds 20s headroom`);

    // Short 2s windows (8s reel / 4 lines) must stay speakable
    const short = spokenCharBudget(2, "en");
    assert.ok(short.maxChars <= 18, `2s maxChars ${short.maxChars} too high`);
    assert.ok((short.maxChars * 4) / speechCharsPerSec("en") <= 8.5);
  });

  it("Chinese budgets stay readable for short windows", () => {
    const budget = spokenCharBudget(5, "hk");
    assert.ok(budget.targetChars >= 10);
    assert.ok(budget.maxChars <= 30);
  });
});
