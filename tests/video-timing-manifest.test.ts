import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildManifestFromClipDurations,
  buildSingleClipManifest,
  captionLinesOntoBoundaries,
  cutMarkersFromManifest,
  rebaseCaptionLinesAfterTrim,
  scaleManifestToDuration,
} from "../lib/video-timing-manifest";
import { captionLinesFromStoryboardScenes } from "../lib/storyboard-captions";

describe("video-timing-manifest", () => {
  it("builds cumulative boundaries from clip durations", () => {
    const m = buildManifestFromClipDurations([5, 5, 10], {
      source: "kling",
      engine: "kling",
    });
    assert.equal(m.outputDurationSec, 20);
    assert.deepEqual(
      m.clipBoundaries.map((b) => [b.startSec, b.endSec]),
      [
        [0, 5],
        [5, 10],
        [10, 20],
      ],
    );
    assert.deepEqual(cutMarkersFromManifest(m), [5, 10]);
  });

  it("scales multi-clip boundaries to probed duration", () => {
    const m = scaleManifestToDuration(
      buildManifestFromClipDurations([4, 6], { timingSource: "reported" }),
      15,
    );
    assert.equal(m.outputDurationSec, 15);
    assert.equal(m.timingSource, "probed");
    assert.deepEqual(
      m.clipBoundaries.map((b) => [b.startSec, b.endSec]),
      [
        [0, 6],
        [6, 15],
      ],
    );
  });

  it("rebases captions after trim", () => {
    const out = rebaseCaptionLinesAfterTrim(
      [
        { startSec: 0, endSec: 3, text: "a" },
        { startSec: 4, endSec: 8, text: "b" },
        { startSec: 9, endSec: 12, text: "c" },
      ],
      2,
      10,
    );
    // a: 0–3 → 0–1; b: 4–8 → 2–6; c: 9–12 → 7–8 (trimmed window is 8s)
    assert.equal(out.length, 3);
    assert.equal(out[0].text, "a");
    assert.ok(out[0].startSec < 0.1);
    assert.equal(out[1].text, "b");
    assert.equal(out[2].text, "c");
  });

  it("maps storyboard texts onto Seedance/Kling boundaries", () => {
    const boundaries = buildManifestFromClipDurations([4, 6, 8], {
      source: "seedance",
      engine: "seedance",
    }).clipBoundaries;
    const lines = captionLinesOntoBoundaries(["一", "二", "三"], boundaries);
    assert.equal(lines.length, 3);
    assert.equal(lines[1].startSec, 4);
    assert.equal(lines[1].endSec, 10);
  });

  it("prefers boundaries in storyboard caption builder", () => {
    const boundaries = buildSingleClipManifest(12).clipBoundaries;
    // Force multi for preference path
    const multi = buildManifestFromClipDurations([6, 6]).clipBoundaries;
    const lines = captionLinesFromStoryboardScenes(
      [
        {
          startSec: 0,
          endSec: 2,
          onImageCopyZh: "Hook",
          sceneDescriptionZh: "open",
        },
        {
          startSec: 2,
          endSec: 4,
          onImageCopyZh: "CTA",
          sceneDescriptionZh: "end",
        },
      ],
      { clipBoundaries: multi },
    );
    assert.equal(lines[0].endSec, 6);
    assert.equal(lines[1].startSec, 6);
    assert.equal(boundaries.length, 1);
  });
});
