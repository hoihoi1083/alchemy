import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Edge, Node } from "@xyflow/react";
import {
  collectScopedCharacterNodes,
  collectScopedCharacterSources,
} from "../lib/pro-canvas-character-lock";
import { resolveCanvasVideoPrompt } from "../lib/pro-canvas-graph";
import {
  collectSpawnPipelineSources,
  edgesFromVideosToSplice,
  isAutoSpawnedSceneNodeId,
  scriptHasSpawnedSceneOutputs,
} from "../lib/pro-canvas-spawn";
import { estimateRunAllTokens } from "../lib/ultra-canvas-run-all";
import {
  createUltraCanvasTemplate,
} from "../lib/ultra-canvas-templates";
import { mergeResearchHandoffIntoNodes } from "../lib/ultra-research-handoff";

function node(id: string, kind: string, data: Record<string, unknown> = {}): Node {
  return { id, type: kind, position: { x: 0, y: 0 }, data: { kind, label: id, ...data } };
}

function edge(id: string, source: string, target: string): Edge {
  return { id, source, target };
}

describe("ultra-canvas audit fixes", () => {
  it("resolveCanvasVideoPrompt finds script through image intermediary", () => {
    const nodes = [
      node("script", "script", {
        scenePrompts: ["Scene A motion", "Scene B motion"],
      }),
      node("img", "image", { sceneIndex: 0, prompt: "" }),
      node("vid", "video", { sceneIndex: 0, prompt: "" }),
    ];
    const edges = [edge("e1", "script", "img"), edge("e2", "img", "vid")];
    const prompt = resolveCanvasVideoPrompt({
      nodeId: "vid",
      basePrompt: "",
      sceneIndex: 0,
      nodes,
      edges,
    });
    assert.match(prompt, /Scene A motion/);
  });

  it("scriptHasSpawnedSceneOutputs ignores research→script and template pre-wires", () => {
    const nodes = [
      node("script", "script"),
      node("research", "research"),
      node("tpl-image", "image"),
    ];
    const edgesResearchOnly = [edge("e1", "research", "script")];
    assert.equal(scriptHasSpawnedSceneOutputs("script", edgesResearchOnly, nodes), false);

    const edgesTemplatePrewire = [
      ...edgesResearchOnly,
      edge("e2", "script", "tpl-image"),
    ];
    assert.equal(scriptHasSpawnedSceneOutputs("script", edgesTemplatePrewire, nodes), false);
  });

  it("scriptHasSpawnedSceneOutputs detects auto-spawn scene ids", () => {
    const nodes = [
      node("script", "script"),
      node("image-scene-3", "image"),
    ];
    const edges = [edge("e1", "script", "image-scene-3")];
    assert.equal(scriptHasSpawnedSceneOutputs("script", edges, nodes), true);
    assert.equal(isAutoSpawnedSceneNodeId("image-scene-3"), true);
    assert.equal(isAutoSpawnedSceneNodeId("tpl-image"), false);
  });

  it("edgesFromVideosToSplice connects each video to splice", () => {
    const added = edgesFromVideosToSplice(
      ["v1", "v2"],
      "splice1",
      [],
    );
    assert.equal(added.length, 2);
    assert.ok(added.every((e) => e.target === "splice1"));
  });

  it("collectScopedCharacterNodes uses direct wire or @mention only", () => {
    const nodes = [
      node("char-a", "character", { alias: "PersonA", previewUrl: "https://x/a.jpg" }),
      node("char-b", "character", { alias: "PersonB", previewUrl: "https://x/b.jpg" }),
      node("script", "script"),
      node("img", "image", { prompt: "" }),
    ];
    const edges = [
      edge("e1", "char-a", "script"),
      edge("e2", "char-b", "script"),
      edge("e3", "script", "img"),
    ];
    assert.equal(collectScopedCharacterNodes("img", "", nodes, edges).length, 0);

    const edgesDirect = [...edges, edge("e4", "char-a", "img")];
    const scoped = collectScopedCharacterNodes("img", "Hero", nodes, edgesDirect);
    assert.equal(scoped.length, 1);
    assert.equal(scoped[0]?.id, "char-a");

    const scopedMention = collectScopedCharacterNodes(
      "img",
      "Scene with @PersonB",
      nodes,
      edges,
    );
    assert.equal(scopedMention.length, 1);
    assert.equal(scopedMention[0]?.id, "char-b");
  });

  it("collectScopedCharacterSources only includes connected or mentioned characters", () => {
    const nodes = [
      node("char-a", "character", { alias: "PersonA", previewUrl: "https://x/a.jpg" }),
      node("char-b", "character", { alias: "PersonB", previewUrl: "https://x/b.jpg" }),
      node("img", "image", { prompt: "Hero with @PersonA" }),
    ];
    const edges = [edge("e1", "char-a", "img")];
    const scoped = collectScopedCharacterNodes("img", "Hero with @PersonA", nodes, edges);
    assert.equal(scoped.length, 1);
    assert.equal(scoped[0]?.id, "char-a");

    const sources = collectScopedCharacterSources(
      "img",
      "Hero with @PersonA",
      nodes,
      edges,
    );
    assert.equal(sources.length, 1);
    assert.equal(sources[0]?.alias, "PersonA");
  });

  it("collectSpawnPipelineSources scopes to script upstream neighborhood", () => {
    const nodes = [
      node("script", "script"),
      node("research", "research"),
      node("upload-product", "upload", { alias: "Product" }),
      node("char-a", "character"),
      node("lighting", "lighting"),
      node("other-upload", "upload", { alias: "Other" }),
      node("image-scene-1", "image"),
    ];
    const edges = [
      edge("e1", "research", "script"),
      edge("e2", "upload-product", "script"),
      edge("e3", "char-a", "script"),
      edge("e4", "lighting", "script"),
      edge("e5", "script", "image-scene-1"),
    ];
    const sources = collectSpawnPipelineSources("script", nodes, edges);
    const ids = sources.map((n) => n.id).sort();
    assert.deepEqual(ids, ["lighting", "research", "upload-product"]);
    assert.ok(!ids.includes("char-a"));
    assert.ok(!ids.includes("other-upload"));
  });

  it("mergeResearchHandoffIntoNodes returns applied=false without research node", () => {
    const nodes = [node("t1", "text", { text: "notes" })];
    const result = mergeResearchHandoffIntoNodes(nodes, {
      summary: "Trend hooks",
      savedAt: 1,
    });
    assert.equal(result.applied, false);
    assert.equal(result.nodes.length, 1);
  });

  it("mergeResearchHandoffIntoNodes fills research nodes", () => {
    const nodes = [node("r1", "research", { summary: "" })];
    const { nodes: next, applied } = mergeResearchHandoffIntoNodes(nodes, {
      summary: "Trend hooks",
      angles: ["Pain → reveal"],
      topic: "Alchemy",
      savedAt: 1,
    });
    assert.equal(applied, true);
    const summary = (next[0]?.data as { summary?: string }).summary ?? "";
    assert.match(summary, /Trend hooks/);
    assert.match(summary, /Creative angles/);
    assert.match(summary, /Topic: Alchemy/);
  });

  it("estimateRunAllTokens counts BGM when local audio file is pending", () => {
    const nodes = [
      node("audio1", "audio", { audioUrl: "blob:local" }),
      node("splice1", "splice"),
    ];
    const edges = [edge("e1", "audio1", "splice1")];
    const withoutLocal = estimateRunAllTokens(nodes, edges);
    const withLocal = estimateRunAllTokens(nodes, edges, {
      hasLocalAudio: (id) => id === "audio1",
    });
    assert.ok(withLocal > withoutLocal);
  });

  it("storyDifferenceAd template wires product/ui to script and empty research", () => {
    const tpl = createUltraCanvasTemplate("storyDifferenceAd", {
      script: "Script",
      character: "Character",
      upload: "Upload",
      research: "Research",
      brand: "Brand",
      lighting: "Lighting",
      splice: "Splice",
      audio: "Audio",
    });
    const research = tpl.nodes.find((n) => n.id === "tpl-research");
    assert.equal((research?.data as { summary?: string }).summary, "");

    const edgePairs = tpl.edges.map((e) => `${e.source}->${e.target}`);
    assert.ok(edgePairs.includes("tpl-upload-product->tpl-script"));
    assert.ok(edgePairs.includes("tpl-upload-ui->tpl-script"));
    assert.ok(edgePairs.includes("tpl-research->tpl-script"));
    assert.ok(edgePairs.includes("tpl-brand->tpl-script"));
    assert.ok(edgePairs.includes("tpl-audio->tpl-splice"));
  });
});
