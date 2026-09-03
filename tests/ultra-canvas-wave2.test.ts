import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Edge, Node } from "@xyflow/react";
import {
  appendCharacterLockToPrompt,
} from "../lib/pro-canvas-character-lock";
import { buildScriptBriefWithBeats } from "../lib/pro-canvas-script-plan";
import {
  computeNodeInputFingerprint,
  isNodeOutputStale,
  nodeNeedsRun,
} from "../lib/pro-canvas-stale";
import {
  ULTRA_RESEARCH_HANDOFF_MAX_AGE_MS,
  formatResearchSummaryForCanvas,
} from "../lib/ultra-research-handoff";
import { createUltraCanvasTemplate } from "../lib/ultra-canvas-templates";
import {
  charactersForSpawnedScene,
  edgesForSceneCharacterCast,
} from "../lib/pro-canvas-spawn";

function node(id: string, kind: string, data: Record<string, unknown> = {}): Node {
  return { id, type: kind, position: { x: 0, y: 0 }, data: { kind, label: id, ...data } };
}

function edge(id: string, source: string, target: string): Edge {
  return { id, source, target };
}

describe("ultra-canvas wave2", () => {
  it("buildScriptBriefWithBeats includes framing, camera, blocking", () => {
    const brief = buildScriptBriefWithBeats("Ad brief", [
      {
        time: "0-2s",
        emotion: "tension",
        framing: "medium close-up",
        camera: "slow push-in",
        blocking: "subject turns toward product",
        line: "There has to be a better way.",
      },
    ]);
    assert.match(brief, /framing: medium close-up/);
    assert.match(brief, /camera: slow push-in/);
    assert.match(brief, /blocking: subject turns toward product/);
  });

  it("isNodeOutputStale when upstream prompt changes after run", () => {
    const nodes = [
      node("img", "image", {
        prompt: "Hero still",
        aspectRatio: "9:16",
        resolution: "1K",
        artStyleId: "product_studio",
        lightingPreset: "studio_soft",
        backgroundPreset: "clean_studio",
        imageUrl: "https://cdn.example.com/out.jpg",
        outputInputFingerprint: "",
      }),
    ];
    const edges: Edge[] = [];
    const fp = computeNodeInputFingerprint("img", nodes, edges);
    const withFp = [
      {
        ...nodes[0]!,
        data: {
          ...(nodes[0]!.data as Record<string, unknown>),
          outputInputFingerprint: fp,
        },
      },
    ];
    assert.equal(isNodeOutputStale(withFp[0]!, withFp, edges), false);

    const edited = [
      {
        ...withFp[0]!,
        data: {
          ...(withFp[0]!.data as Record<string, unknown>),
          prompt: "Updated hero still",
        },
      },
    ];
    assert.equal(isNodeOutputStale(withFp[0]!, edited, edges), true);
    assert.equal(nodeNeedsRun(withFp[0]!, edited, edges), true);
  });

  it("nodeNeedsRun is false for legacy outputs without fingerprint", () => {
    const nodes = [
      node("vid", "video", {
        prompt: "motion",
        camera: "Slow Push In",
        duration: "8",
        resolution: "480p",
        fast: true,
        aspectRatio: "9:16",
        videoUrl: "https://cdn.example.com/out.mp4",
      }),
    ];
    assert.equal(nodeNeedsRun(nodes[0]!, nodes, []), false);
  });

  it("appendCharacterLockToPrompt textOnly skips IMAGE ref requirement", () => {
    const nodes = [
      node("c1", "character", {
        alias: "PersonA",
        biography: "28yo designer",
      }),
    ];
    const prompt = appendCharacterLockToPrompt("Scene", nodes, { textOnly: true });
    assert.match(prompt, /\[角色锁定\]/);
    assert.match(prompt, /@PersonA/);
    assert.match(prompt, /28yo designer/);
    assert.doesNotMatch(prompt, /IMAGE ref/);
  });

  it("research handoff TTL is 24 hours", () => {
    assert.equal(ULTRA_RESEARCH_HANDOFF_MAX_AGE_MS, 24 * 60 * 60 * 1000);
    const staleAt = Date.now() - ULTRA_RESEARCH_HANDOFF_MAX_AGE_MS - 1;
    const freshAt = Date.now() - 1000;
    assert.ok(Date.now() - staleAt > ULTRA_RESEARCH_HANDOFF_MAX_AGE_MS);
    assert.ok(Date.now() - freshAt < ULTRA_RESEARCH_HANDOFF_MAX_AGE_MS);
    const formatted = formatResearchSummaryForCanvas({
      summary: "Hooks",
      savedAt: freshAt,
    });
    assert.match(formatted, /Hooks/);
  });

  it("charactersForSpawnedScene uses story-arc cast (not % rotate)", () => {
    const nodes = [
      node("char-a", "character", { alias: "PersonA" }),
      node("char-b", "character", { alias: "PersonB" }),
      node("script-1", "script", {
        sceneCount: 6,
        scenePrompts: ["a", "b", "c", "d", "e", "f"],
        sceneBeats: [
          {},
          {},
          {},
          { framing: "two-shot", blocking: "colleague enters frame" },
          { blocking: "shows UI / product" },
          { framing: "product hero + logo" },
        ],
      }),
    ];
    const chars = nodes.slice(0, 2);
    const cast0 = charactersForSpawnedScene(0, "Office pain beat", chars, nodes, {
      scriptNode: nodes[2],
      sceneCount: 6,
    });
    const cast3 = charactersForSpawnedScene(
      3,
      "Colleague walks in",
      chars,
      nodes,
      { scriptNode: nodes[2], sceneCount: 6 },
    );
    assert.equal(cast0.length, 1);
    assert.equal(cast0[0]?.id, "char-a");
    assert.ok(cast3.some((c) => c.id === "char-a"));
    assert.ok(cast3.some((c) => c.id === "char-b"));
  });

  it("edgesForSceneCharacterCast wires character to image", () => {
    const nodes = [node("char-a", "character"), node("img-1", "image")];
    const edges = edgesForSceneCharacterCast("img-1", nodes.slice(0, 1), [], []);
    assert.equal(edges.length, 1);
    assert.equal(edges[0]?.source, "char-a");
    assert.equal(edges[0]?.target, "img-1");
  });

  it("storyDifferenceAd template wires brand to script", () => {
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
    const edgePairs = tpl.edges.map((e) => `${e.source}->${e.target}`);
    assert.ok(edgePairs.includes("tpl-brand->tpl-script"));
  });
});
