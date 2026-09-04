import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import type { Edge, Node } from "@xyflow/react";
import { computeCreativeBStepStatuses } from "../lib/pro-canvas-creative-b-checklist";
import {
  syncStoryboardPanelsFromScript,
  dialogueScriptFromNodes,
  voiceLinesFromNodes,
  groupPanelsIntoActs,
  plannedVoWindowForScene,
} from "../lib/pro-canvas-storyboard";
import {
  findSpawnedImageNodeBySceneIndex,
  stillUrlsFromStoryboardPanels,
  storyboardStillPatchesForSceneImages,
} from "../lib/pro-canvas-spawn";
import { estimateCanvasVoiceTokens } from "../lib/ultra-pro-controls";
import { spliceUpstreamHasMusic, estimateRunAllTokens } from "../lib/ultra-canvas-run-all";
import { createUltraCanvasTemplate } from "../lib/ultra-canvas-templates";
import { TOKEN_COST } from "../lib/billing/token-costs";
import { clampBrainstormDurationSec } from "../lib/brainstorm-creative-options";

const root = process.cwd();

describe("Creative B director sequence", () => {
  it("syncStoryboardPanelsFromScript builds panels + acts from beats", () => {
    const script: Node = {
      id: "s1",
      type: "script",
      position: { x: 0, y: 0 },
      data: {
        kind: "script",
        label: "Script",
        brief: "test",
        sceneCount: 2,
        sceneBeats: [
          { line: "Hello", speaker: "PersonA", time: "0-2s" },
          { line: "Alchemy?", speaker: "PersonB", time: "2-4s" },
        ],
        sceneImagePrompts: ["Still A", "Still B"],
        scenePrompts: ["Move A", "Move B"],
      },
    };
    const { panels, acts } = syncStoryboardPanelsFromScript(script);
    assert.equal(panels.length, 2);
    assert.equal(panels[0]?.stillPrompt, "Still A");
    assert.equal(panels[0]?.motionPrompt, "Move A");
    assert.equal(panels[0]?.speaker, "PersonA");
    assert.equal(panels[1]?.dialogue, "Alchemy?");
    assert.ok(acts.length >= 1);
    assert.equal(acts[0]?.panels.length, 2);
  });

  it("groupPanelsIntoActs chunks into multi-panel acts", () => {
    const panels = Array.from({ length: 5 }, (_, i) => ({
      index: i,
      title: `Shot ${i + 1}`,
      stillPrompt: `s${i}`,
      motionPrompt: `m${i}`,
    }));
    const acts = groupPanelsIntoActs(panels, 3);
    assert.equal(acts.length, 2);
    assert.equal(acts[0]?.panels.length, 3);
    assert.equal(acts[1]?.panels.length, 2);
  });

  it("stillUrlsFromStoryboardPanels seeds http urls only", () => {
    const urls = stillUrlsFromStoryboardPanels([
      { imageUrl: "https://cdn.example/a.jpg" },
      { imageUrl: undefined },
      { imageUrl: "blob:local" },
    ]);
    assert.equal(urls[0], "https://cdn.example/a.jpg");
    assert.equal(urls[1], undefined);
    assert.equal(urls[2], undefined);
  });

  it("findSpawnedImageNodeBySceneIndex finds image-scene nodes", () => {
    const nodes: Node[] = [
      {
        id: "image-scene-3",
        type: "image",
        position: { x: 0, y: 0 },
        data: { kind: "image", label: "Image 1", prompt: "x", sceneIndex: 1 },
      },
    ];
    const found = findSpawnedImageNodeBySceneIndex(nodes, 1);
    assert.equal(found?.id, "image-scene-3");
    assert.equal(findSpawnedImageNodeBySceneIndex(nodes, 0), undefined);
  });

  it("storyboardStillPatchesForSceneImages maps panels onto image-scene nodes", () => {
    const nodes: Node[] = [
      {
        id: "board",
        type: "storyboard",
        position: { x: 0, y: 0 },
        data: {
          kind: "storyboard",
          label: "SB",
          panels: [
            { index: 0, stillPrompt: "a", motionPrompt: "a", imageUrl: "https://cdn.example/1.jpg" },
            { index: 1, stillPrompt: "b", motionPrompt: "b" },
          ],
        },
      },
      {
        id: "image-scene-1",
        type: "image",
        position: { x: 0, y: 0 },
        data: { kind: "image", label: "I1", prompt: "x", sceneIndex: 0 },
      },
      {
        id: "image-scene-2",
        type: "image",
        position: { x: 0, y: 0 },
        data: { kind: "image", label: "I2", prompt: "y", sceneIndex: 1 },
      },
    ];
    const patches = storyboardStillPatchesForSceneImages(nodes);
    assert.equal(patches.length, 1);
    assert.equal(patches[0]?.nodeId, "image-scene-1");
    assert.equal(patches[0]?.imageUrl, "https://cdn.example/1.jpg");
  });

  it("dialogueScriptFromNodes pulls speaker lines", () => {
    const nodes: Node[] = [
      {
        id: "s1",
        type: "script",
        position: { x: 0, y: 0 },
        data: {
          kind: "script",
          label: "Script",
          brief: "",
          sceneBeats: [
            { line: "Hi", speaker: "PersonA" },
            { line: "Hey", speaker: "PersonB" },
          ],
        },
      },
    ];
    const text = dialogueScriptFromNodes(nodes);
    assert.match(text, /PersonA: Hi/);
    assert.match(text, /PersonB: Hey/);
  });

  it("voiceLinesFromNodes prefers storyboard and accumulates video durations", () => {
    const nodes: Node[] = [
      {
        id: "board",
        type: "storyboard",
        position: { x: 0, y: 0 },
        data: {
          kind: "storyboard",
          label: "SB",
          panels: [
            {
              index: 0,
              stillPrompt: "a",
              motionPrompt: "a",
              dialogue: "Hi",
              speaker: "PersonA",
            },
            {
              index: 1,
              stillPrompt: "b",
              motionPrompt: "b",
              dialogue: "Hey",
              speaker: "PersonB",
            },
          ],
          acts: [
            {
              id: "act-1",
              title: "Act 1",
              panels: [
                {
                  index: 0,
                  stillPrompt: "a",
                  motionPrompt: "a",
                  dialogue: "Hi",
                  speaker: "PersonA",
                },
                {
                  index: 1,
                  stillPrompt: "b",
                  motionPrompt: "b",
                  dialogue: "Hey",
                  speaker: "PersonB",
                },
              ],
            },
          ],
        },
      },
      {
        id: "video-scene-1",
        type: "video",
        position: { x: 0, y: 0 },
        data: {
          kind: "video",
          label: "V1",
          prompt: "",
          camera: "x",
          duration: "5",
          resolution: "480p",
          fast: true,
          sceneIndex: 0,
        },
      },
      {
        id: "video-scene-2",
        type: "video",
        position: { x: 0, y: 0 },
        data: {
          kind: "video",
          label: "V2",
          prompt: "",
          camera: "x",
          duration: "10",
          resolution: "480p",
          fast: true,
          sceneIndex: 1,
        },
      },
    ];
    const lines = voiceLinesFromNodes(nodes);
    assert.equal(lines.length, 2);
    assert.equal(lines[0]?.startSec, 0);
    assert.equal(lines[1]?.startSec, 5);
    assert.match(lines[0]?.sceneLabel ?? "", /Act 1/);
    const win = plannedVoWindowForScene(nodes, 1);
    assert.equal(win.startSec, 5);
  });

  it("checklist order is Script → Stills → Voice → Videos → Splice", () => {
    const steps = computeCreativeBStepStatuses([]);
    const ids = steps.map((s) => s.id);
    assert.deepEqual(
      ids.filter((id) =>
        ["script", "storyboard", "voice", "videos", "splice"].includes(id),
      ),
      ["script", "storyboard", "voice", "videos", "splice"],
    );
    assert.equal(ids.includes("clips"), false);
  });

  it("voice step goes stale when script dialogue fingerprint drifts", () => {
    const nodes: Node[] = [
      {
        id: "script",
        type: "script",
        position: { x: 0, y: 0 },
        data: {
          kind: "script",
          label: "Script",
          brief: "",
          sceneBeats: [{ line: "New line", speaker: "Host" }],
          scenePrompts: ["motion"],
        },
      },
      {
        id: "v",
        type: "voice",
        position: { x: 0, y: 0 },
        data: {
          kind: "voice",
          label: "Voice",
          script: "Old",
          locale: "en",
          voicePresetId: "en-male",
          audioUrl: "https://example.com/a.mp3",
          dialogueSourceFingerprint: "Host|Old line",
        },
      },
    ];
    const voice = computeCreativeBStepStatuses(nodes).find((s) => s.id === "voice");
    assert.equal(voice?.done, true);
    assert.equal(voice?.stale, true);
  });

  it("checklist marks world + voice when present", () => {
    const nodes: Node[] = [
      {
        id: "w",
        type: "world",
        position: { x: 0, y: 0 },
        data: { kind: "world", label: "World", description: "Office set" },
      },
      {
        id: "v",
        type: "voice",
        position: { x: 0, y: 0 },
        data: {
          kind: "voice",
          label: "Voice",
          script: "Hi",
          locale: "en",
          voicePresetId: "en-male",
          audioUrl: "https://example.com/a.mp3",
        },
      },
    ];
    const steps = computeCreativeBStepStatuses(nodes);
    assert.equal(steps.find((s) => s.id === "world")?.done, true);
    assert.equal(steps.find((s) => s.id === "voice")?.done, true);
    assert.equal(steps.find((s) => s.id === "script")?.done, false);
    assert.equal(steps.find((s) => s.id === "brainstorm")?.done, false);
  });

  it("voice tokens match voiceover cost; splice counts voice as music", () => {
    assert.equal(estimateCanvasVoiceTokens(), TOKEN_COST.voiceover);
    const nodes: Node[] = [
      {
        id: "voice1",
        type: "voice",
        position: { x: 0, y: 0 },
        data: {
          kind: "voice",
          label: "Voice",
          script: "x",
          locale: "en",
          voicePresetId: "en-male",
          audioUrl: "https://cdn.example/vo.mp3",
        },
      },
      {
        id: "splice1",
        type: "splice",
        position: { x: 100, y: 0 },
        data: { kind: "splice", label: "Splice" },
      },
    ];
    const edges: Edge[] = [{ id: "e1", source: "voice1", target: "splice1" }];
    assert.equal(spliceUpstreamHasMusic("splice1", nodes, edges), true);
    assert.ok(estimateRunAllTokens(nodes, edges) >= TOKEN_COST.bgm);
  });

  it("storyDifferenceAd V2 beats lock No Prompt + AI Research arc", () => {
    const tpl = createUltraCanvasTemplate("storyDifferenceAd", {});
    const script = tpl.nodes.find((n) => n.id === "tpl-script");
    const data = script?.data as {
      sceneCount?: number;
      sceneBeats?: Array<{
        line?: string;
        speaker?: string;
        blocking?: string;
        act?: string;
        time?: string;
      }>;
      brief?: string;
    };
    assert.equal(data.sceneCount, 3);
    assert.equal(data.sceneBeats?.length, 3);
    assert.match(data.brief ?? "", /No Prompt \+ AI Research/);
    assert.match(data.sceneBeats?.[0]?.act ?? "", /Act 1/);
    assert.match(data.sceneBeats?.[1]?.act ?? "", /Act 2|RECORDING/i);
    assert.match(data.sceneBeats?.[2]?.act ?? "", /Act 3/);
    assert.match(data.sceneBeats?.[1]?.line ?? "", /Give us the product/);
    assert.match(data.sceneBeats?.[2]?.line ?? "", /Less prompting/);
    assert.match(data.sceneBeats?.[0]?.blocking ?? "", /NO glasses/i);
    assert.match(data.sceneBeats?.[0]?.blocking ?? "", /BESIDE/i);
    assert.match(data.brief ?? "", /HYBRID|screen recording/i);

    const { acts } = syncStoryboardPanelsFromScript(script!);
    assert.equal(acts.length, 3);
    assert.match(acts[0]?.title ?? "", /Live open|Act 1/i);
    assert.match(acts[1]?.title ?? "", /RECORDING|Screen|Act 2/i);
    assert.match(acts[2]?.title ?? "", /Live close|Act 3/i);
    assert.equal(acts[0]?.panels.length, 1);

    const charA = tpl.nodes.find((n) => n.id === "tpl-char-a");
    const charB = tpl.nodes.find((n) => n.id === "tpl-char-b");
    assert.match((charA?.data as { biography?: string }).biography ?? "", /NO glasses/i);
    assert.match((charB?.data as { biography?: string }).biography ?? "", /BESIDE|beside|sits beside/i);

    const brain = tpl.nodes.find((n) => n.id === "tpl-brainstorm");
    assert.equal((brain?.data as { durationSec?: number }).durationSec, 23);
  });

  it("groupPanelsIntoActs allows 1 panel per act", () => {
    const panels = Array.from({ length: 3 }, (_, i) => ({
      index: i,
      title: `Shot ${i + 1}`,
      stillPrompt: `s${i}`,
      motionPrompt: `m${i}`,
    }));
    const acts = groupPanelsIntoActs(panels, 1);
    assert.equal(acts.length, 3);
    assert.equal(acts[0]?.panels.length, 1);
  });

  it("template includes director sequence nodes including brainstorm", () => {
    const tpl = createUltraCanvasTemplate("storyDifferenceAd", {});
    const kinds = tpl.nodes.map((n) => (n.data as { kind: string }).kind);
    assert.ok(kinds.includes("world"));
    assert.ok(kinds.includes("storyboard"));
    assert.ok(kinds.includes("voice"));
    assert.ok(kinds.includes("brainstorm"));
  });

  it("voiceLinesFromNodes scopeNodes ignores unrelated storyboard", () => {
    const nodes: Node[] = [
      {
        id: "tpl-board",
        type: "storyboard",
        position: { x: 0, y: 0 },
        data: {
          kind: "storyboard",
          label: "SB",
          panels: [
            {
              index: 0,
              stillPrompt: "a",
              motionPrompt: "a",
              dialogue: "Still writing prompts?",
              speaker: "PersonA",
            },
          ],
          acts: [],
        },
      },
      {
        id: "my-script",
        type: "script",
        position: { x: 0, y: 0 },
        data: {
          kind: "script",
          label: "Script",
          brief: "",
          sceneBeats: [{ line: "One click and it's done", speaker: "Host" }],
        },
      },
    ];
    const scoped = voiceLinesFromNodes(nodes, {
      scopeNodes: [nodes[1]!],
    });
    assert.equal(scoped.length, 1);
    assert.match(scoped[0]?.text ?? "", /One click/);
    const boardWide = voiceLinesFromNodes(nodes);
    assert.match(boardWide[0]?.text ?? "", /Still writing prompts/);
  });

  it("brainstorm duration clamps to sensible range", () => {
    assert.equal(clampBrainstormDurationSec(3), 8);
    assert.equal(clampBrainstormDurationSec(20), 20);
    assert.equal(clampBrainstormDurationSec(120), 60);
  });

  it("ultra-tts route charges voiceover then refunds on failure pattern", () => {
    const src = readFileSync(join(root, "app/api/ultra-tts/route.ts"), "utf8");
    assert.match(src, /TOKEN_COST\.voiceover/);
    assert.match(src, /chargeTokens/);
    assert.match(src, /refundTokens/);
    assert.match(src, /synthesizeSpeechToFile/);
    assert.match(src, /persistAndDurablize/);
  });
});
