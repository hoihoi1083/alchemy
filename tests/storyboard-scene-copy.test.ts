import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  inferKlingClipFromScenes,
  storyboardSceneDisplayCopy,
  storyboardScenePrimaryScript,
} from "../lib/storyboard-scene-copy";

describe("storyboardSceneDisplayCopy", () => {
  it("prefers on-image caption and keeps beat when different", () => {
    const copy = storyboardSceneDisplayCopy({
      onImageCopyZh: "今晚就預約",
      sceneDescriptionZh: "接待處微笑填表",
      role: "demo",
    });
    assert.equal(copy.caption, "今晚就預約");
    assert.equal(copy.beat, "接待處微笑填表");
    assert.equal(
      storyboardScenePrimaryScript({
        onImageCopyZh: "今晚就預約",
        sceneDescriptionZh: "接待處微笑填表",
      }),
      "今晚就預約",
    );
  });

  it("falls back to beat when caption missing", () => {
    assert.equal(
      storyboardScenePrimaryScript({
        sceneDescriptionZh: "望住電話擔心",
        role: "hook",
      }),
      "望住電話擔心",
    );
  });
});

describe("inferKlingClipFromScenes", () => {
  it("maps short spans to 5s and longer to 10s", () => {
    assert.equal(
      inferKlingClipFromScenes([
        { startSec: 0, endSec: 2 },
        { startSec: 2, endSec: 4 },
      ]),
      5,
    );
    assert.equal(
      inferKlingClipFromScenes([
        { startSec: 0, endSec: 10 },
        { startSec: 10, endSec: 20 },
      ]),
      10,
    );
  });
});
