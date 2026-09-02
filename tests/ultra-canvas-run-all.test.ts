import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Edge, Node } from "@xyflow/react";
import { estimateRunAllTokens } from "../lib/ultra-canvas-run-all";
import { TOKEN_COST } from "../lib/billing/token-costs";

describe("ultra-canvas-run-all", () => {
  it("sums pending runnable node token costs", () => {
    const nodes: Node[] = [
      {
        id: "img-1",
        type: "image",
        position: { x: 0, y: 0 },
        data: {
          kind: "image",
          label: "Image",
          prompt: "test",
          aspectRatio: "9:16",
          resolution: "1K",
          artStyleId: "product_studio",
          lightingPreset: "studio_soft",
          backgroundPreset: "clean_studio",
        },
      },
      {
        id: "vid-1",
        type: "video",
        position: { x: 200, y: 0 },
        data: {
          kind: "video",
          label: "Video",
          prompt: "motion",
          camera: "Slow Push In",
          duration: "8",
          resolution: "480p",
          fast: true,
          aspectRatio: "9:16",
        },
      },
    ];
    const edges: Edge[] = [{ id: "e1", source: "img-1", target: "vid-1" }];
    const total = estimateRunAllTokens(nodes, edges);
    assert.ok(total >= TOKEN_COST.image);
    assert.ok(total > TOKEN_COST.image);
  });

  it("skips nodes that already have output", () => {
    const nodes: Node[] = [
      {
        id: "tv-1",
        type: "textVideo",
        position: { x: 0, y: 0 },
        data: {
          kind: "textVideo",
          label: "TV",
          prompt: "done",
          duration: "8",
          resolution: "480p",
          fast: true,
          aspectRatio: "9:16",
          videoUrl: "https://cdn.example.com/out.mp4",
        },
      },
    ];
    assert.equal(estimateRunAllTokens(nodes, []), 0);
  });
});
