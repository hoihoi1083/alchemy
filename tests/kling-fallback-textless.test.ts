import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  extractKlingMotionFromSeedancePrompt,
  klingFallbackSceneCountForDuration,
  parseKlingBeatsFromSeedancePrompt,
  planKlingFallbackScenesFromSeedancePrompt,
} from "../lib/kling-motion-from-plan";

describe("Seedance→Kling fallback textless contract", () => {
  it("generate route uses Kling adapter (not raw Seedance prompt)", () => {
    const src = readFileSync(join(process.cwd(), "app/api/generate/route.ts"), "utf8");
    assert.ok(src.includes("runKlingStoryboardFallback"));
    assert.ok(src.includes("adaptScriptForKlingFallback"));
    assert.ok(
      !/motionPrompt:\s*promptRaw/.test(src),
      "motionPrompt must not be promptRaw",
    );
    assert.ok(
      !/motionPrompt:\s*prompt\b/.test(src),
      "motionPrompt must not be the full Seedance prompt",
    );
    assert.ok(
      !/theme:\s*promptRaw\.slice/.test(src),
      "theme must not be sliced from marketing promptRaw",
    );
    assert.match(src, /adaptScriptForKlingFallback\(/);
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

  it("extracts timed English beats from a DeepSeek R2V script", () => {
    const hint = extractKlingMotionFromSeedancePrompt(
      [
        "UGC-style review video. @Video1 pacing. @Image1 is a white dropper bottle.",
        "0-2s: Close-up of hands holding the white dropper bottle, squeezing dropper.",
        "2-4.5s: Cut to a young woman applying the serum to her cheek.",
        "4.5-6s: She smiles, gives a thumbs up to camera.",
        "Image 1 is the user's product — hero it. Silent video output: no speech.",
      ].join(" "),
    );
    assert.ok(hint);
    assert.match(String(hint), /dropper|serum|thumbs/i);
    assert.doesNotMatch(String(hint), /@Image|Silent video|hero it/i);
  });

  it("plans multi-clip Kling fallback from DeepSeek beats for longer durations", () => {
    const script = [
      "0-2s: Close-up of hands holding the white dropper bottle, squeezing dropper.",
      "2-5s: Cut to a young woman applying the serum to her cheek.",
      "5-10s: She smiles, gives a thumbs up to camera with soft glow.",
    ].join(" ");
    assert.equal(klingFallbackSceneCountForDuration(6), 1);
    assert.equal(klingFallbackSceneCountForDuration(10), 2);
    assert.equal(parseKlingBeatsFromSeedancePrompt(script).length, 3);

    const short = planKlingFallbackScenesFromSeedancePrompt({
      prompt: script,
      totalDurationSec: 6,
      existingSceneCount: 1,
    });
    assert.equal(short.length, 1);
    assert.match(short[0]!.cameraMotionEn, /dropper|serum|thumbs/i);

    const longer = planKlingFallbackScenesFromSeedancePrompt({
      prompt: script,
      totalDurationSec: 10,
      existingSceneCount: 1,
    });
    assert.equal(longer.length, 2);
    assert.match(longer[0]!.cameraMotionEn, /dropper/i);
  });
});
