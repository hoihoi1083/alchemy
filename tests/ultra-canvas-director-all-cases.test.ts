import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  parseBeatDurationSec,
  sceneDurationsFromBeats,
  snapUltraVideoDurationSec,
} from "../lib/pro-canvas-scene-duration";
import { createProCanvasStarter } from "../lib/pro-canvas-starter";
import { createUltraCanvasTemplate } from "../lib/ultra-canvas-templates";

describe("ultra scene durations", () => {
  it("parses beat time spans", () => {
    assert.equal(parseBeatDurationSec("0-2s"), 2);
    assert.equal(parseBeatDurationSec("8-12s"), 4);
    assert.equal(parseBeatDurationSec("12–20s"), 8);
  });

  it("snaps to allowed Seedance lengths", () => {
    assert.equal(snapUltraVideoDurationSec(2), 4);
    assert.equal(snapUltraVideoDurationSec(5), 6);
    assert.equal(snapUltraVideoDurationSec(7), 8);
    assert.equal(snapUltraVideoDurationSec(12), 10);
  });

  it("uses beat times for Creative-B-style sheet", () => {
    const durs = sceneDurationsFromBeats(
      [
        { time: "0-2s" },
        { time: "2-4s" },
        { time: "4-6s" },
        { time: "6-8s" },
        { time: "8-12s" },
        { time: "12-20s" },
      ],
      6,
    );
    assert.deepEqual(durs, [4, 4, 4, 4, 4, 8]);
  });

  it("splits brainstorm total when beats lack times", () => {
    const durs = sceneDurationsFromBeats([], 4, { totalDurationSec: 20 });
    assert.equal(durs.reduce((a, b) => a + b, 0) >= 16, true);
    assert.equal(durs.length, 4);
  });
});

describe("ultra starter + Creative B wiring", () => {
  it("director starter wires Script→Voice and Storyboard→Voice", () => {
    const starter = createProCanvasStarter({});
    const kinds = starter.nodes.map((n) => (n.data as { kind: string }).kind);
    assert.ok(kinds.includes("script"));
    assert.ok(kinds.includes("storyboard"));
    assert.ok(kinds.includes("voice"));
    assert.ok(kinds.includes("splice"));
    assert.ok(kinds.includes("textVideo"));
    assert.ok(starter.edges.some((e) => e.source === "starter-script" && e.target === "starter-voice"));
    assert.ok(
      starter.edges.some((e) => e.source === "starter-storyboard" && e.target === "starter-voice"),
    );
  });

  it("storyDifferenceAd wires Script→Voice", () => {
    const tpl = createUltraCanvasTemplate("storyDifferenceAd", {});
    assert.ok(tpl.edges.some((e) => e.id === "e-script-voice"));
    assert.ok(tpl.edges.some((e) => e.id === "e-board-voice"));
    const voice = tpl.nodes.find((n) => n.id === "tpl-voice");
    assert.equal((voice?.data as { script?: string }).script, "");
  });
});
