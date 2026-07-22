import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  captionLinesFromEqualKlingClips,
  captionLinesFromStoryboardScenes,
} from "../lib/storyboard-captions";

describe("storyboard captions", () => {
  it("builds timed lines from onImageCopyZh", () => {
    const lines = captionLinesFromStoryboardScenes([
      { startSec: 0, endSec: 2, onImageCopyZh: "頭痛？" },
      { startSec: 2, endSec: 4, onImageCopyZh: "一站式" },
      { startSec: 4, endSec: 8, sceneDescriptionZh: "fallback only" },
    ]);
    assert.equal(lines.length, 3);
    assert.equal(lines[0].text, "頭痛？");
    assert.equal(lines[2].text, "fallback only");
    assert.equal(lines[0].endSec, 2);
  });

  it("scales plan timings to Kling-length video", () => {
    const lines = captionLinesFromStoryboardScenes(
      [
        { startSec: 0, endSec: 2, onImageCopyZh: "A" },
        { startSec: 2, endSec: 4, onImageCopyZh: "B" },
        { startSec: 4, endSec: 6, onImageCopyZh: "C" },
        { startSec: 6, endSec: 8, onImageCopyZh: "D" },
      ],
      { videoDurationSec: 20 },
    );
    assert.equal(lines[0].startSec, 0);
    assert.equal(lines[0].endSec, 5);
    assert.equal(lines[3].startSec, 15);
    assert.equal(lines[3].endSec, 20);
  });

  it("maps equal Kling clips", () => {
    const lines = captionLinesFromEqualKlingClips(["一", "二", "", "四"], 5);
    assert.equal(lines.length, 3);
    assert.deepEqual(
      lines.map((l) => [l.startSec, l.endSec, l.text]),
      [
        [0, 5, "一"],
        [5, 10, "二"],
        [15, 20, "四"],
      ],
    );
  });
});
