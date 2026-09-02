import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Edge, Node } from "@xyflow/react";
import {
  findMissingImageSources,
  mentionDependencyEdges,
  resolveMentions,
  runnableExecutionOrder,
} from "../lib/pro-canvas-graph";

function node(id: string, kind: string, data: Record<string, unknown>): Node {
  return { id, type: kind, position: { x: 0, y: 0 }, data: { kind, ...data } };
}

describe("pro-canvas-graph", () => {
  it("escapes regex-special aliases in resolveMentions", () => {
    const nodes = [node("u1", "upload", { label: "Product+", alias: "a+" })];
    assert.equal(resolveMentions("Use @a+ in frame", nodes), "Use Product+ in frame");
  });

  it("orders mentioned image sources before dependents", () => {
    const nodes = [
      node("img1", "image", { label: "Hero", prompt: "base", imageUrl: "https://x/a.png" }),
      node("vid1", "video", {
        label: "Video",
        prompt: "motion @Hero",
        camera: "static",
        duration: "8",
        resolution: "720p",
        fast: true,
      }),
    ];
    const edges: Edge[] = [];
    const extra = mentionDependencyEdges(nodes, edges);
    assert.ok(extra.some((e) => e.source === "img1" && e.target === "vid1"));
    const { sorted } = runnableExecutionOrder(nodes, edges);
    assert.deepEqual(
      sorted.map((n) => n.id),
      ["img1", "vid1"],
    );
  });

  it("orders mentioned upload before dependent image in Run all", () => {
    const nodes = [
      node("up1", "upload", { label: "Product", alias: "Product", previewUrl: "https://x/p.png" }),
      node("img1", "image", { label: "Hero", prompt: "Show @Product", imageUrl: "https://x/a.png" }),
    ];
    const { sorted, error } = runnableExecutionOrder(nodes, []);
    assert.equal(error, undefined);
    assert.deepEqual(sorted.map((n) => n.id), ["img1"]);
  });

  it("detects missing local assets for @mentions", () => {
    const nodes = [
      node("up", "upload", { label: "Pack", alias: "Pack" }),
      node("img", "image", { label: "Image", prompt: "Show @Pack" }),
    ];
    const err = findMissingImageSources("img", "Show @Pack", nodes, [], () => undefined);
    assert.match(err ?? "", /Re-attach/);
  });
});
