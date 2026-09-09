import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildCaptionEditPrompt } from "../lib/byteplus-seedance-edit";
import { estimateCaptionVideoEditTokens } from "../lib/billing/token-costs";

describe("caption video edit prompts", () => {
  it("product job requires replace language for ModelArk edit classify", () => {
    const p = buildCaptionEditPrompt({
      job: "product",
      hasRefImage: true,
      note: "keep label",
    });
    assert.match(p, /Edit video/i);
    assert.match(p, /replace/i);
    assert.match(p, /keep label/i);
  });

  it("scene and style stay edit-classified", () => {
    for (const job of ["scene", "style"] as const) {
      const p = buildCaptionEditPrompt({ job, hasRefImage: false });
      assert.match(p, /Edit video/i);
    }
  });

  it("token estimate matches fast 720p band", () => {
    const tok = estimateCaptionVideoEditTokens(8);
    assert.ok(tok >= 1000);
    assert.ok(tok <= 2000);
  });
});
