import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Node } from "@xyflow/react";
import {
  filterSpawnResourcesForScene,
  inferSceneAssetNeeds,
  inferSceneCast,
  planSceneContinuity,
} from "@/lib/pro-canvas-scene-continuity";

function node(id: string, kind: string, data: Record<string, unknown> = {}): Node {
  return {
    id,
    type: kind,
    position: { x: 0, y: 0 },
    data: { kind, label: id, ...data },
  };
}

describe("pro-canvas-scene-continuity", () => {
  const chars = [
    node("char-a", "character", { alias: "PersonA", biography: "exhausted designer" }),
    node("char-b", "character", { alias: "PersonB", biography: "confident colleague" }),
  ];

  it("pain scenes cast PersonA only", () => {
    const cast = inferSceneCast(0, 6, "Slow push on tired face", chars, {
      blocking: "typing, slumped",
      emotion: "frustrated",
    });
    assert.deepEqual(
      cast.map((c) => c.id),
      ["char-a"],
    );
  });

  it("two-shot / colleague beat casts both", () => {
    const cast = inferSceneCast(3, 6, "Pan to colleague", chars, {
      framing: "two-shot",
      blocking: "colleague enters frame",
    });
    assert.equal(cast.length, 2);
  });

  it("demo beat needs UI + product; last beat is brand CTA not invented SKU", () => {
    const demo = inferSceneAssetNeeds(4, 6, "Shows phone UI", {
      blocking: "shows UI / product",
      line: "Give us the product",
    });
    assert.equal(demo.ui, true);
    assert.equal(demo.product, true);
    assert.equal(demo.brand, true);

    const cta = inferSceneAssetNeeds(5, 6, "Two-shot smile end card", {
      blocking: "both smile; clean brand logo end card",
      framing: "two-shot smile + brand end card",
      line: "Try Alchemy AI Lab",
    });
    assert.equal(cta.brand, true);
    assert.equal(cta.product, false);
    assert.equal(cta.ui, false);
  });

  it("filters brand off early pain scenes", () => {
    const resources = [
      node("tpl-brand", "brand", { alias: "brand" }),
      node("tpl-ui", "upload", { alias: "UI", label: "Upload · UI" }),
      node("tpl-light", "lighting", { preset: "natural_window" }),
    ];
    const early = filterSpawnResourcesForScene(resources, {
      brand: false,
      ui: false,
      product: false,
    });
    assert.ok(early.some((n) => n.id === "tpl-light"));
    assert.ok(!early.some((n) => n.id === "tpl-brand"));
    assert.ok(!early.some((n) => n.id === "tpl-ui"));
  });

  it("planSceneContinuity prefills @cast and world lock", () => {
    const plan = planSceneContinuity({
      sceneIndex: 4,
      sceneCount: 6,
      scenePrompt: "Handheld push to phone screen",
      characters: chars,
      beat: { blocking: "shows UI", framing: "medium" },
      includePriorKeyframe: true,
    });
    assert.match(plan.imagePrompt, /@PersonA/);
    assert.match(plan.imagePrompt, /@PersonB/);
    assert.match(plan.imagePrompt, /@Scene4/);
    assert.match(plan.imagePrompt, /连续镜头|单帧/);
    assert.match(plan.imagePrompt, /@brand|ONE photographic|单帧/);
    assert.equal(plan.sceneAlias, "Scene5");
    assert.match(plan.imagePrompt, /FORBIDDEN:[\s\S]*comic strip/i);
    assert.match(plan.imagePrompt, /World bible|SAME office location/);
  });

  it("pain beat does not force UI from ambient screen wording alone", () => {
    const needs = inferSceneAssetNeeds(
      1,
      6,
      "Worker rubs eyes, monitor glow on face",
      { blocking: "micro head shake", framing: "OTS screen glow" },
    );
    assert.equal(needs.ui, false);
  });
});
