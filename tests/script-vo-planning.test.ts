import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  mergeSceneBeatsFromCinematicScenes,
  motionPromptWithDialogue,
  scriptDialogueFingerprint,
} from "../lib/pro-canvas-script-plan";
import { normalizeCinematicReelPlan } from "../lib/cinematic-reel-plan";

describe("script VO planning helpers", () => {
  it("normalizeCinematicReelPlan keeps spokenLine + speaker", () => {
    const plan = normalizeCinematicReelPlan(
      {
        scenes: [
          {
            sceneIndex: 1,
            role: "hook",
            startSec: 0,
            endSec: 8,
            sceneDescriptionZh: "tired at desk",
            imagePrompt: "office still",
            videoMotionPrompt: "slow push",
            spokenLine: "Still on this?",
            speaker: "PersonA",
          },
        ],
      },
      1,
    );
    assert.equal(plan.scenes[0]?.spokenLine, "Still on this?");
    assert.equal(plan.scenes[0]?.speaker, "PersonA");
  });

  it("mergeSceneBeatsFromCinematicScenes fills line/speaker", () => {
    const beats = mergeSceneBeatsFromCinematicScenes(
      [
        {
          spokenLine: "One click",
          speaker: "Host",
          role: "payoff",
          startSec: 0,
          endSec: 8,
          sceneDescriptionZh: "reveal",
        },
      ],
      [{ framing: "MCU" }],
    );
    assert.equal(beats[0]?.line, "One click");
    assert.equal(beats[0]?.speaker, "Host");
    assert.equal(beats[0]?.framing, "MCU");
  });

  it("motionPromptWithDialogue appends spoken cue once", () => {
    const once = motionPromptWithDialogue("Slow push-in", {
      line: "One click",
      speaker: "Host",
    });
    assert.match(once, /One click/);
    assert.match(once, /Host speaks/);
    const twice = motionPromptWithDialogue(once, {
      line: "One click",
      speaker: "Host",
    });
    assert.equal(twice, once);
  });

  it("scriptDialogueFingerprint is stable", () => {
    assert.equal(
      scriptDialogueFingerprint([
        { speaker: "A", line: "Hi" },
        { speaker: "B", line: "Hey" },
      ]),
      "A|Hi\nB|Hey",
    );
  });
});
