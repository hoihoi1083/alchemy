import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("Seedance→Kling fallback textless contract", () => {
  it("generate route does not pass Seedance marketing prompt as Kling motionPrompt", () => {
    const src = readFileSync(join(process.cwd(), "app/api/generate/route.ts"), "utf8");
    assert.ok(src.includes("runKlingStoryboardFallback"));
    // Must not wire promptRaw into motionPrompt (burns captions onto video).
    assert.ok(
      !/motionPrompt:\s*promptRaw/.test(src),
      "motionPrompt must not be promptRaw",
    );
    assert.ok(
      !/theme:\s*promptRaw\.slice/.test(src),
      "theme must not be sliced from marketing promptRaw",
    );
    assert.match(src, /motionPrompt:\s*""/);
    // Shot-list must still be passed so Kling gets role/timing motion (not generic push-in only).
    assert.match(src, /scenesMeta/);
    assert.match(src, /resolveKlingScenesMeta/);
    assert.match(src, /parseKlingScenesMeta/);
  });

  it("kling-storyboard-run always uses klingSceneMotionPrompt (not raw marketing blob)", () => {
    const src = readFileSync(join(process.cwd(), "lib/kling-storyboard-run.ts"), "utf8");
    assert.match(src, /klingSceneMotionPrompt\(/);
    assert.ok(
      !/motionPrompt\.slice\(0,\s*400\)/.test(src),
      "must not embed a 400-char marketing blob as the primary Kling prompt",
    );
  });
});
