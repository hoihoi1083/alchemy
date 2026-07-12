import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_VIDEO_SETTINGS,
  isExplicitVideoDuration,
  resolveWizardOutputDurationSec,
} from "../lib/video-settings";

describe("resolveWizardOutputDurationSec", () => {
  it("maps auto to fallback", () => {
    assert.equal(resolveWizardOutputDurationSec({ duration: "auto" }), 8);
    assert.equal(resolveWizardOutputDurationSec({ duration: "auto" }, 6), 6);
  });

  it("uses explicit seconds", () => {
    assert.equal(resolveWizardOutputDurationSec({ duration: "6" }), 6);
    assert.equal(resolveWizardOutputDurationSec({ duration: "12" }), 12);
  });
});

describe("isExplicitVideoDuration", () => {
  it("treats auto as not ready for reel analyze", () => {
    assert.equal(isExplicitVideoDuration("auto"), false);
    assert.equal(isExplicitVideoDuration(DEFAULT_VIDEO_SETTINGS.duration), true);
  });
});
