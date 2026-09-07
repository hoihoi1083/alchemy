import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assessLiveTextConfidence } from "../lib/edit-image-2-live-text-confidence";
import {
  classifyTextRole,
  mergeVerticalBodyBlocks,
  structureTextLayers,
} from "../lib/edit-image-2-text-structure";
import type { LayerBox } from "../lib/edit-image-2-boxes";

describe("text structure (A)", () => {
  it("classifies pills / titles / body", () => {
    assert.equal(
      classifyTextRole({ left: 40, top: 800, width: 280, height: 36 }, 800, 1200, "7号 = 巨星起点"),
      "pill",
    );
    assert.equal(
      classifyTextRole({ left: 20, top: 40, width: 420, height: 70 }, 800, 1200, "7号如何变成CR7"),
      "title",
    );
    assert.equal(
      classifyTextRole({ left: 80, top: 400, width: 300, height: 28 }, 800, 1200, "曼联起点绑定"),
      "body",
    );
  });

  it("merges stacked body lines into one block", () => {
    const merged = mergeVerticalBodyBlocks(
      [
        {
          px: { left: 100, top: 200, width: 300, height: 30 },
          label: "line one",
          score: 0.9,
          role: "body",
          lines: ["line one"],
        },
        {
          px: { left: 105, top: 238, width: 290, height: 28 },
          label: "line two",
          score: 0.85,
          role: "body",
          lines: ["line two"],
        },
        {
          px: { left: 40, top: 500, width: 260, height: 34 },
          label: "7 = symbol",
          score: 0.8,
          role: "pill",
          lines: ["7 = symbol"],
        },
      ],
      800,
      1200,
    );
    assert.equal(merged.length, 2);
    const body = merged.find((m) => m.role === "body")!;
    assert.equal(body.lines.length, 2);
    assert.match(body.label, /line one/);
    assert.match(body.label, /line two/);
  });

  it("structure pass reduces shreds via line + vertical merge", () => {
    const mk = (label: string, x: number, y: number, w: number, h: number): {
      box: LayerBox;
      px: { left: number; top: number; width: number; height: number };
      score: number;
    } => ({
      box: { x, y, w, h, label, kind: "text", score: 0.9 },
      px: { left: x, top: y, width: w, height: h },
      score: 0.9,
    });
    const items = [
      mk("How", 20, 30, 80, 40),
      mk("title", 110, 32, 200, 38),
      mk("bullet a", 60, 200, 280, 26),
      mk("bullet b", 62, 232, 270, 26),
    ];
    const out = structureTextLayers(items, 800, 1200, { maxLayers: 12 });
    assert.ok(out.length <= 3);
    assert.ok(out.some((o) => o.role === "title" || o.label.includes("title")));
  });
});

describe("live text confidence (C)", () => {
  it("prefers live for strong Latin / numbers", () => {
    const a = assessLiveTextConfidence({
      label: "CR7",
      score: 0.8,
      role: "label",
    });
    assert.equal(a.preferLive, true);
    assert.equal(a.text, "CR7");

    const b = assessLiveTextConfidence({
      label: "RONALDO",
      score: 0.7,
      role: "body",
    });
    assert.equal(b.preferLive, true);
  });

  it("keeps pills as pixels", () => {
    const a = assessLiveTextConfidence({
      label: "7号 = 巨星起点",
      score: 0.9,
      role: "pill",
    });
    assert.equal(a.preferLive, false);
    assert.equal(a.reason, "pill_style");
  });

  it("allows short clean Chinese; rejects garbage", () => {
    const ok = assessLiveTextConfidence({
      label: "曼联：起点绑定",
      score: 0.7,
      role: "body",
    });
    assert.equal(ok.preferLive, true);

    const bad = assessLiveTextConfidence({
      label: "asdf囧xx@@",
      score: 0.3,
      role: "body",
    });
    assert.equal(bad.preferLive, false);
  });
});
