import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  estimateSmartLayersDetectTokens,
  estimateSmartLayersSandwichTokens,
  TOKEN_COST,
} from "../lib/billing/token-costs";

describe("smart layers billing", () => {
  it("detect without SAM is base only", () => {
    assert.equal(estimateSmartLayersDetectTokens({ sam: false }), TOKEN_COST.smart_layers_detect);
    assert.equal(estimateSmartLayersDetectTokens({}), TOKEN_COST.smart_layers_detect);
  });

  it("detect with SAM adds SAM bundle", () => {
    assert.equal(
      estimateSmartLayersDetectTokens({ sam: true }),
      TOKEN_COST.smart_layers_detect + TOKEN_COST.smart_layers_sam,
    );
  });

  it("sandwich estimate includes detect + matte + visual split (heal free soft-cover)", () => {
    assert.equal(
      estimateSmartLayersSandwichTokens(),
      TOKEN_COST.smart_layers_detect +
        TOKEN_COST.smart_layers_matte +
        TOKEN_COST.smart_layers_qwen,
    );
  });

  it("heal and matte stay flat fees; erase uses inpaint MP pricing", () => {
    assert.equal(TOKEN_COST.smart_layers_heal, 3);
    assert.equal(TOKEN_COST.smart_layers_matte, 5);
    assert.equal(TOKEN_COST.inpaint, 41);
  });
});
