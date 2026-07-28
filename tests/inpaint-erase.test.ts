import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildInpaintFillPrompt, isEraseIntent } from "@/lib/inpaint-erase";

describe("inpaint-erase", () => {
  it("detects Chinese erase intent", () => {
    assert.equal(isEraseIntent("把字消除"), true);
    assert.equal(isEraseIntent("移除文字"), true);
    assert.equal(isEraseIntent("replace with marble"), false);
  });

  it("builds safe fill prompt for erase-like input", () => {
    const p = buildInpaintFillPrompt("把字消除");
    assert.match(p, /Local heal only inside the mask/i);
    assert.match(p, /unmasked content/i);
  });
});
