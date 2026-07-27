import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BANANA2_EDIT_ENDPOINT,
  BANANA2_TEXT_ENDPOINT,
  resolveEditEndpointWhenNeeded,
} from "../lib/image-endpoints";
import { brandKitLogoImagePromptBlock } from "../lib/brand-merge";

describe("resolveEditEndpointWhenNeeded", () => {
  it("forces edit when logo/image urls are required even if client sent text", () => {
    assert.equal(
      resolveEditEndpointWhenNeeded(BANANA2_TEXT_ENDPOINT, true),
      BANANA2_EDIT_ENDPOINT,
    );
  });

  it("keeps text endpoint when images are not needed", () => {
    assert.equal(
      resolveEditEndpointWhenNeeded(BANANA2_TEXT_ENDPOINT, false),
      BANANA2_TEXT_ENDPOINT,
    );
  });

  it("keeps edit when client already sent edit", () => {
    assert.equal(
      resolveEditEndpointWhenNeeded(BANANA2_EDIT_ENDPOINT, true),
      BANANA2_EDIT_ENDPOINT,
    );
  });
});

describe("Mode B logo prompt forbids inventing product wordmarks", () => {
  it("mentions not inventing alchemy-style marks from the brief", () => {
    const block = brandKitLogoImagePromptBlock(2);
    assert.match(block, /IMAGE 2/);
    assert.match(block, /do NOT invent a different logo/i);
  });
});
