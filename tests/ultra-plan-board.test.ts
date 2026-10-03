import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildUltraPlanBoardGraph,
  validateUltraPlanBoardPayload,
} from "../lib/ultra-plan-board";

describe("ultra-plan-board", () => {
  it("validates a 5-face thumbnail plan and orders refs by slot", () => {
    const payload = validateUltraPlanBoardPayload({
      title: "NBA coaches thumb",
      qualityNote: "Upload all face refs before Run.",
      nodes: [
        { id: "base", kind: "upload", alias: "Base", slot: 1, label: "Layout" },
        { id: "f1", kind: "character", alias: "Face1", slot: 2 },
        { id: "f2", kind: "character", alias: "Face2", slot: 3 },
        { id: "f3", kind: "character", alias: "Face3", slot: 4 },
        { id: "f4", kind: "character", alias: "Face4", slot: 5 },
        { id: "f5", kind: "character", alias: "Face5", slot: 6 },
        {
          id: "img",
          kind: "image",
          prompt: "Keep @Base layout. Swap heads to @Face1 @Face2 @Face3 @Face4 @Face5. No new text.",
          aspectRatio: "16:9",
        },
      ],
      edges: [
        { source: "f5", target: "img", slot: 6 },
        { source: "base", target: "img", slot: 1 },
        { source: "f1", target: "img", slot: 2 },
        { source: "f2", target: "img", slot: 3 },
        { source: "f3", target: "img", slot: 4 },
        { source: "f4", target: "img", slot: 5 },
      ],
    });

    const graph = buildUltraPlanBoardGraph(payload);
    assert.equal(graph.nodes.length, 7);
    assert.equal(graph.edges.length, 6);
    assert.equal(graph.edges[0]?.source, "base");
    assert.equal(graph.edges[1]?.source, "f1");
    assert.equal(graph.edges[5]?.source, "f5");
    const image = graph.nodes.find((n) => n.id === "img");
    assert.ok(image);
    assert.equal((image!.data as { aspectRatio?: string }).aspectRatio, "16:9");
  });

  it("rejects media URLs and unknown kinds", () => {
    assert.throws(
      () =>
        validateUltraPlanBoardPayload({
          nodes: [
            {
              id: "n1",
              kind: "image",
              prompt: "x",
              imageUrl: "https://evil.example/a.png",
            },
          ],
          edges: [],
        }),
      /imageUrl/,
    );
    assert.throws(
      () =>
        validateUltraPlanBoardPayload({
          nodes: [{ id: "n1", kind: "splice" }],
          edges: [],
        }),
      /Unsupported/,
    );
  });

  it("rejects cycles and bad edge targets", () => {
    assert.throws(
      () =>
        validateUltraPlanBoardPayload({
          nodes: [
            { id: "a", kind: "upload" },
            { id: "b", kind: "image", prompt: "p" },
          ],
          edges: [
            { source: "a", target: "b" },
            { source: "b", target: "a" },
          ],
        }),
      /cycle|upload\/character|Image/,
    );
  });

  it("binds sourceRefId and leftover image refs onto upload nodes", () => {
    const refs = [
      {
        id: "ref1",
        url: "https://cdn.example.com/base.jpg",
        kind: "image" as const,
        fileName: "base.jpg",
      },
      {
        id: "ref2",
        url: "https://cdn.example.com/face.jpg",
        kind: "image" as const,
        fileName: "face.jpg",
      },
    ];
    const graph = buildUltraPlanBoardGraph(
      {
        title: "Thumb",
        nodes: [
          { id: "base", kind: "upload", alias: "Base", slot: 1, sourceRefId: "ref1" },
          { id: "face", kind: "character", alias: "Face1", slot: 2 },
          { id: "img", kind: "image", prompt: "Keep @Base and @Face1", aspectRatio: "16:9" },
        ],
        edges: [
          { source: "base", target: "img", slot: 1 },
          { source: "face", target: "img", slot: 2 },
        ],
      },
      {},
      refs,
    );
    const base = graph.nodes.find((n) => n.id === "base")!.data as {
      previewUrl?: string;
    };
    const face = graph.nodes.find((n) => n.id === "face")!.data as {
      previewUrl?: string;
    };
    assert.equal(base.previewUrl, refs[0].url);
    assert.equal(face.previewUrl, refs[1].url);
  });
});
