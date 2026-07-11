import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  conceptStyleAllowsTextOnlyImage,
  visualStyleAllowedForPromotion,
  visualStylesForPromotion,
} from "../lib/promotion-styles";
import {
  VISUAL_STYLES,
  isVisualStyleAllowedForWorkflow,
  type VisualStyleId,
} from "../lib/visual-styles";
import { WORKFLOW_MODES } from "../lib/workflow-mode";

describe("visual styles × promotion × workflow matrix", () => {
  for (const mode of ["physical", "concept"] as const) {
    for (const workflow of WORKFLOW_MODES) {
      it(`${mode} + ${workflow}: allowed styles are consistent`, () => {
        const allowed = visualStylesForPromotion(mode, workflow);
        assert.ok(allowed.length > 0, `no styles for ${mode}/${workflow}`);
        for (const s of allowed) {
          assert.equal(visualStyleAllowedForPromotion(s.id, mode), true);
          assert.equal(isVisualStyleAllowedForWorkflow(s.id, workflow), true);
        }
        const blocked = VISUAL_STYLES.filter(
          (s) => !allowed.some((a) => a.id === s.id),
        );
        for (const s of blocked) {
          const promoOk = visualStyleAllowedForPromotion(s.id, mode);
          const wfOk = isVisualStyleAllowedForWorkflow(s.id, workflow);
          assert.equal(promoOk && wfOk, false);
        }
      });
    }
  }

  it("physical-only styles hidden in concept mode", () => {
    const physicalOnly: VisualStyleId[] = ["product", "model-wear"];
    for (const id of physicalOnly) {
      assert.equal(visualStyleAllowedForPromotion(id, "concept"), false);
      assert.equal(visualStyleAllowedForPromotion(id, "physical"), true);
    }
    assert.equal(visualStyleAllowedForPromotion("storyboard-video", "concept"), true);
    assert.equal(visualStyleAllowedForPromotion("storyboard-video", "physical"), true);
  });

  it("concept-only styles hidden in physical mode", () => {
    const conceptOnly: VisualStyleId[] = [
      "service-promo",
      "pricing-offer",
      "website-launch",
      "concept-cinematic",
    ];
    for (const id of conceptOnly) {
      assert.equal(visualStyleAllowedForPromotion(id, "physical"), false);
      assert.equal(visualStyleAllowedForPromotion(id, "concept"), true);
    }
  });

  it("concept-cinematic requires combined workflow; storyboard works in video-only", () => {
    assert.equal(isVisualStyleAllowedForWorkflow("concept-cinematic", "image-only"), false);
    assert.equal(isVisualStyleAllowedForWorkflow("concept-cinematic", "video-only"), false);
    assert.equal(isVisualStyleAllowedForWorkflow("concept-cinematic", "combined"), true);
    assert.equal(isVisualStyleAllowedForWorkflow("storyboard-video", "video-only"), true);
    assert.equal(isVisualStyleAllowedForWorkflow("storyboard-video", "combined"), true);
  });

  it("concept text-only image styles", () => {
    assert.equal(conceptStyleAllowsTextOnlyImage("service-promo"), true);
    assert.equal(conceptStyleAllowsTextOnlyImage("concept-cinematic"), false);
    assert.equal(conceptStyleAllowsTextOnlyImage("product"), false);
  });
});
