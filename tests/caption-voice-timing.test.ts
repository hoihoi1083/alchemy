import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  captionVoiceStartSec,
  splitCaptionLinesOverDuration,
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
