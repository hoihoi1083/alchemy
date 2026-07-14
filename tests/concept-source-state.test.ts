import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  stripConceptAssistantPromptExtra,
} from "../lib/concept-source-state";

describe("concept source state", () => {
  it("strips concept-assistant prompt extras", () => {
    const extra =
      "Brand tone: friendly | Target audience: SMB owners | Visual metaphor and scene direction: hand + cash";
    assert.equal(stripConceptAssistantPromptExtra(extra), "Brand tone: friendly");
  });

  it("keeps unrelated prompt extras", () => {
    assert.equal(stripConceptAssistantPromptExtra("Custom note"), "Custom note");
  });
});
