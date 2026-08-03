import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildInpaintErasePrompt,
  buildInpaintFillPrompt,
  isEraseIntent,
} from "@/lib/inpaint-erase";

describe("inpaint-erase", () => {
  it("detects Chinese erase intent", () => {
    assert.equal(isEraseIntent("把字消除"), true);
    assert.equal(isEraseIntent("移除文字"), true);
    assert.equal(isEraseIntent("replace with marble"), false);
    assert.equal(isEraseIntent("改成「認識金砂石」"), false);
    assert.equal(isEraseIntent("把字改成正確標題"), false);
  });

  it("erase fallback prompt stays short — no instructional English that FLUX Fill paints as text", () => {
    const p = buildInpaintErasePrompt();
    assert.match(p, /background/i);
    assert.doesNotMatch(p, /content-aware|masked|inpaint|heal|clone/i);
    assert.ok(p.length < 120);
  });

  it("maps erase-like fill input to the short background fallback", () => {
    const p = buildInpaintFillPrompt("把字消除");
    assert.equal(p, buildInpaintErasePrompt());
  });

  it("builds text-replace fill prompts that ask for sharp typography", () => {
    const p = buildInpaintFillPrompt("改成「認識金砂石」", { product: "金砂石" });
    assert.match(p, /認識金砂石/);
    assert.match(p, /typography|readable/i);
    assert.match(p, /金砂石/);
  });

  it("enriches fill prompts with product/ad context without inventing captions", () => {
    const p = buildInpaintFillPrompt("replace background with soft marble", {
      product: "Watch Pro",
      headline: "週末特惠",
      artStyle: "realistic",
    });
    assert.match(p, /Watch Pro/);
    assert.match(p, /週末特惠/);
    assert.match(p, /realistic/i);
    assert.match(p, /do NOT paint new marketing captions/i);
  });
});
