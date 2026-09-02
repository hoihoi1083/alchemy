import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Node } from "@xyflow/react";
import {
  deserializeUltraCanvasSnapshot,
  serializeUltraCanvasSnapshot,
} from "../lib/ultra-canvas-snapshot";

describe("ultra-canvas-snapshot", () => {
  it("keeps library download URLs on save", () => {
    const libraryUrl = "/api/library/download/507f1f77bcf86cd799439011?inline=1";
    const nodes: Node[] = [
      {
        id: "img-1",
        type: "image",
        position: { x: 0, y: 0 },
        data: {
          kind: "image",
          label: "Image",
          prompt: "test",
          imageUrl: libraryUrl,
        },
      },
    ];
    const snap = serializeUltraCanvasSnapshot(nodes, [], 1);
    assert.equal(snap.nodes[0]?.data.imageUrl, libraryUrl);
    const restored = deserializeUltraCanvasSnapshot(snap);
    assert.equal((restored.nodes[0]?.data as { imageUrl?: string }).imageUrl, libraryUrl);
  });

  it("strips blob preview URLs", () => {
    const nodes: Node[] = [
      {
        id: "up-1",
        type: "upload",
        position: { x: 0, y: 0 },
        data: {
          kind: "upload",
          label: "Upload",
          previewUrl: "blob:http://localhost/abc",
          fileName: "x.png",
        },
      },
    ];
    const snap = serializeUltraCanvasSnapshot(nodes, [], 1);
    assert.equal((snap.nodes[0]?.data as { previewUrl?: string }).previewUrl, undefined);
  });

  it("strips busy and error flags on save", () => {
    const nodes: Node[] = [
      {
        id: "img-1",
        type: "image",
        position: { x: 0, y: 0 },
        data: {
          kind: "image",
          label: "Image",
          prompt: "test",
          busy: true,
          error: "Something failed",
        },
      },
    ];
    const snap = serializeUltraCanvasSnapshot(nodes, [], 1);
    assert.equal((snap.nodes[0]?.data as { busy?: boolean }).busy, undefined);
    assert.equal((snap.nodes[0]?.data as { error?: string }).error, undefined);
  });
});
