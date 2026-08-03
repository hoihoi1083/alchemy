import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  captionVoiceStartSec,
  fitCaptionLinesToVoiceDuration,
  offsetCaptionLinesBySec,
  scaleCaptionLinesToDuration,
  splitCaptionLinesOverDuration,
  voiceTimingStatus,
} from "../lib/caption-voice-timing";

describe("splitCaptionLinesOverDuration", () => {
  it("fits 4 caption lines into an 8s voice window", () => {
    const lines = splitCaptionLinesOverDuration(
      [
        { startSec: 5, endSec: 10, text: "a" },
        { startSec: 10, endSec: 15, text: "b" },
        { startSec: 15, endSec: 20, text: "c" },
        { startSec: 0, endSec: 5, text: "d" },
      ],
      8,
    );
    assert.equal(lines.length, 4);
    assert.equal(lines[0].startSec, 0);
    assert.equal(lines[0].endSec, 2);
    assert.equal(lines[3].startSec, 6);
    assert.equal(lines[3].endSec, 8);
  });
});

describe("captionVoiceStartSec", () => {
  it("uses the earliest caption start", () => {
    assert.equal(
      captionVoiceStartSec([
        { startSec: 5.1, endSec: 10, text: "a" },
        { startSec: 10, endSec: 15, text: "b" },
      ]),
      5.1,
    );
  });

  it("returns 0 when no caption text", () => {
    assert.equal(captionVoiceStartSec([{ startSec: 3, endSec: 5, text: "  " }]), 0);
  });
});

describe("scaleCaptionLinesToDuration", () => {
  it("preserves relative windows while scaling to a new end time", () => {
    const lines = scaleCaptionLinesToDuration(
      [
        { startSec: 0, endSec: 2, text: "hook" },
        { startSec: 2, endSec: 5, text: "proof" },
        { startSec: 5, endSec: 10, text: "cta" },
      ],
      8,
    );
    assert.deepEqual(
      lines.map((line) => [line.startSec, line.endSec]),
      [
        [0, 1.6],
        [1.6, 4],
        [4, 8],
      ],
    );
  });

  it("falls back to even split when existing timing is zero-ish", () => {
    const lines = scaleCaptionLinesToDuration(
      [
        { startSec: 0, endSec: 0, text: "a" },
        { startSec: 0, endSec: 0, text: "b" },
        { startSec: 0, endSec: 0, text: "c" },
      ],
      9,
    );
    assert.deepEqual(
      lines.map((line) => [line.startSec, line.endSec]),
      [
        [0, 3],
        [3, 6],
        [6, 9],
      ],
    );
  });

  it("keeps a minimum 150ms window by pulling starts earlier", () => {
    const lines = scaleCaptionLinesToDuration([{ startSec: 0.95, endSec: 1, text: "a" }], 1);
    assert.deepEqual(lines.map((line) => [line.startSec, line.endSec]), [[0.85, 1]]);
  });
});

describe("voiceTimingStatus", () => {
  it("reports fitted duration, overflow, and remaining tail silence", () => {
    assert.deepEqual(voiceTimingStatus(8, 10), {
      fittedSec: 8,
      exceedsVideo: false,
      overflowSec: 0,
      tailSilenceSec: 2,
    });
  });

  it("marks overflow beyond the video cap with tolerance", () => {
    assert.deepEqual(voiceTimingStatus(12.4, 12), {
      fittedSec: 12,
      exceedsVideo: true,
      overflowSec: 0.40000000000000036,
      tailSilenceSec: 0,
    });
  });
});

describe("fitCaptionLinesToVoiceDuration", () => {
  it("fits captions to voice duration without wiping scene timing gaps", () => {
    const result = fitCaptionLinesToVoiceDuration(
      [
        { startSec: 0, endSec: 1, text: "hook" },
        { startSec: 3, endSec: 6, text: "proof" },
        { startSec: 6, endSec: 10, text: "cta" },
      ],
      8,
      10,
    );
    assert.deepEqual(
      result.lines.map((line) => [line.startSec, line.endSec]),
      [
        [0, 0.8],
        [2.4, 4.8],
        [4.8, 8],
      ],
    );
    assert.equal(result.fittedSec, 8);
    assert.equal(result.exceedsVideo, false);
    assert.equal(result.overflowSec, 0);
    assert.equal(result.tailSilenceSec, 2);
  });

  it("caps fitted timing to the video duration", () => {
    const result = fitCaptionLinesToVoiceDuration(
      [
        { startSec: 0, endSec: 2, text: "a" },
        { startSec: 2, endSec: 4, text: "b" },
      ],
      12.4,
      12,
    );
    assert.deepEqual(
      result.lines.map((line) => [line.startSec, line.endSec]),
      [
        [0, 6],
        [6, 12],
      ],
    );
    assert.equal(result.fittedSec, 12);
    assert.equal(result.exceedsVideo, true);
    assert.equal(result.overflowSec, 0.40000000000000036);
    assert.equal(result.tailSilenceSec, 0);
  });

  it("returns empty lines when there is nothing to fit", () => {
    assert.deepEqual(fitCaptionLinesToVoiceDuration([], 8, 10), {
      lines: [],
      fittedSec: 8,
      exceedsVideo: false,
      overflowSec: 0,
      tailSilenceSec: 2,
    });
  });
});

describe("offsetCaptionLinesBySec", () => {
  it("maps 0-based fit times onto the full timeline at trimIn", () => {
    const lines = offsetCaptionLinesBySec(
      [
        { startSec: 0, endSec: 2, text: "a" },
        { startSec: 2, endSec: 4, text: "b" },
      ],
      3,
    );
    assert.deepEqual(
      lines.map((line) => [line.startSec, line.endSec]),
      [
        [3, 5],
        [5, 7],
      ],
    );
  });
});
