import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  productIdentityContractLines,
  promptAlreadySpecifiesCamera,
  promptHasVideo1,
  R2V_CONCEPT_FAL_GUARDRAILS,
  R2V_FAL_GUARDRAILS,
  VIDEO1_SPINE_SCREENPLAY,
} from "../lib/prompt-balance-contract";

describe("productIdentityContractLines", () => {
  it("locks Image1 object vs name claim for R2V", () => {
    const block = productIdentityContractLines({ hasReferenceVideo: true }).join(
      "\n",
    );
    assert.match(block, /@Video1 = SPINE/);
    assert.match(block, /spine \/ screenplay/i);
    assert.match(block, /wardrobe/i);
    assert.doesNotMatch(block, /optional/i);
    assert.match(block, /WARDROBE \/ OBJECT ONLY/);
    assert.match(block, /CLAIM only/i);
  });

  it("locks Image1 vs name without Video1", () => {
    const block = productIdentityContractLines({ hasReferenceVideo: false }).join(
      "\n",
    );
    assert.match(block, /@Image1/);
    assert.match(block, /CLAIM/);
    assert.match(block, /Pixels win|KEEP IMAGE 1/i);
    assert.match(block, /substitute SKU|CLAIM only/i);
    assert.doesNotMatch(block, /@Video1 = SPINE/);
    assert.doesNotMatch(block, /never override a named electronics/i);
  });

  it("concept mode drops SKU packaging swap language", () => {
    const block = productIdentityContractLines({
      hasReferenceVideo: true,
      conceptMode: true,
    }).join("\n");
    assert.match(block, /CONCEPT \/ SERVICE/);
    assert.match(block, /spine \/ screenplay/i);
    assert.match(block, /wardrobe only/i);
    assert.doesNotMatch(block, /optional/i);
    assert.doesNotMatch(block, /@Image1 = OBJECT ONLY/);
  });

  it("exports one spine sentence used by H3 and R2V", () => {
    assert.match(VIDEO1_SPINE_SCREENPLAY, /spine/i);
    assert.doesNotMatch(VIDEO1_SPINE_SCREENPLAY, /optional/i);
    assert.match(R2V_FAL_GUARDRAILS, /spine \/ screenplay/i);
    assert.match(R2V_CONCEPT_FAL_GUARDRAILS, /spine \/ screenplay/i);
    assert.doesNotMatch(R2V_FAL_GUARDRAILS, /optional/i);
  });
});

describe("prompt camera / Video1 helpers", () => {
  it("detects existing camera language", () => {
    assert.equal(promptAlreadySpecifiesCamera("Slow push-in on the bottle"), true);
    assert.equal(promptAlreadySpecifiesCamera("Orbit around the hero product"), true);
    assert.equal(promptAlreadySpecifiesCamera("Soft lighting on product"), false);
  });

  it("detects @Video1 spine", () => {
    assert.equal(promptHasVideo1("Follow @Video1 shot structure"), true);
    assert.equal(promptHasVideo1("Use Video 1 as spine"), true);
    assert.equal(promptHasVideo1("Animate @Image1 only"), false);
  });

  it("exports shared R2V fal guardrails", () => {
    assert.match(R2V_FAL_GUARDRAILS, /@Video1/);
    assert.match(R2V_FAL_GUARDRAILS, /@Image1/);
    assert.match(R2V_CONCEPT_FAL_GUARDRAILS, /SERVICE \/ IDEA/);
  });
});
