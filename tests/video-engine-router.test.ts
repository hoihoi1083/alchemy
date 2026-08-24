import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { join } from "node:path";
import {
  isFaceHeavyVideoJob,
  klingStitchCanHitDuration,
  parseFaceHeavyFlag,
  resolveVideoEnginePlan,
  stripReferenceVideoTags,
} from "../lib/video-engine-router";
import { DEFAULT_VIDEO_SETTINGS } from "../lib/video-settings";
import { normalizeSeedanceR2vResolution } from "../lib/seedance-r2v-run";

describe("video engine router (A vs B)", () => {
  it("poster is always H3, never Kling or Seedance", () => {
    const plan = resolveVideoEnginePlan({
      motionPoster: true,
      hasReel: true,
      faceHeavy: true,
    });
    assert.equal(plan.stack, "a-poster");
    assert.equal(plan.firstEngine, "minimax-h3");
    assert.equal(plan.allowKling, false);
    assert.equal(plan.seedanceFast, false);
  });

  it("reel without faces is B: Seedance quality first, no Kling", () => {
    const plan = resolveVideoEnginePlan({ hasReel: true, faceHeavy: false });
    assert.equal(plan.stack, "b-reel");
    assert.equal(plan.firstEngine, "seedance");
    assert.equal(plan.seedanceFast, false);
    assert.equal(plan.allowKling, false);
  });

  it("face-heavy + reel skips Seedance → H3 + reel, no Kling", () => {
    const plan = resolveVideoEnginePlan({ hasReel: true, faceHeavy: true });
    assert.equal(plan.stack, "a-reel-faces");
    assert.equal(plan.firstEngine, "minimax-h3");
    assert.equal(plan.allowKling, false);
  });

  it("九宫格 stills TVC may Kling; hunt I2V / assistant may not", () => {
    const tvc = resolveVideoEnginePlan({ hasReel: false, storyboard: true });
    assert.equal(tvc.stack, "a-stills");
    assert.equal(tvc.firstEngine, "minimax-h3");
    assert.equal(tvc.allowKling, true);
    const hunt = resolveVideoEnginePlan({ hasReel: false });
    assert.equal(hunt.allowKling, false);
  });

  it("detects face-heavy styles / modes", () => {
    assert.equal(isFaceHeavyVideoJob({ visualStyleId: "model-wear" }), true);
    assert.equal(isFaceHeavyVideoJob({ visualStyleId: "ugc-presenter" }), true);
    assert.equal(isFaceHeavyVideoJob({ videoCreativeMode: "ugc" }), true);
    assert.equal(
      isFaceHeavyVideoJob({
        visualStyleId: "product",
        subjectFraming: "product-only",
      }),
      false,
    );
    assert.equal(parseFaceHeavyFlag("1"), true);
    assert.equal(parseFaceHeavyFlag("0"), false);
  });

  it("Kling 4×5s can hit 12s but not 6s/8s", () => {
    assert.equal(klingStitchCanHitDuration(20, 12, { clipCount: 4 }), true);
    assert.equal(klingStitchCanHitDuration(20, 8, { clipCount: 4 }), false);
    assert.equal(klingStitchCanHitDuration(20, 6, { clipCount: 4 }), false);
    assert.equal(klingStitchCanHitDuration(10, 8, { clipCount: 1 }), true);
  });

  it("strips leftover @Video1 so assistant/poster prompts cannot require an MP4", () => {
    const out = stripReferenceVideoTags(
      "@Video1 is the spine. @Image1 bottle. Follow Video 1 cuts.",
    );
    assert.doesNotMatch(out, /Video\s*1/i);
    assert.match(out, /bottle/);
  });

  it("simple studio defaults to MiniMax H3, not Seedance fast", () => {
    assert.equal(DEFAULT_VIDEO_SETTINGS.videoEngine, "minimax-h3");
    assert.equal(DEFAULT_VIDEO_SETTINGS.fast, false);
  });
});

describe("storyboard route + wizard wiring", () => {
  const root = process.cwd();

  it("reel path is Seedance R2V then H3 then REFERENCE_VIDEO_REQUIRED (no Kling)", () => {
    const src = readFileSync(
      join(root, "app/api/generate-kling-storyboard/route.ts"),
      "utf8",
    );
    assert.match(src, /runSeedanceStoryboardR2v/);
    assert.match(src, /runMinimaxH3Fallback/);
    assert.match(src, /REFERENCE_VIDEO_REQUIRED/);
    assert.match(src, /expectsReel \|\| !enginePlan\.allowKling/);
    const seedanceAt = src.indexOf("Seedance R2V first");
    const h3After = src.indexOf("MiniMax H3 failed after Seedance");
    const klingAt = src.indexOf("Kling fallback");
    assert.ok(seedanceAt > 0 && h3After > seedanceAt);
    assert.ok(klingAt > h3After);
    assert.match(src, /KLING_DURATION_UNREACHABLE/);
  });

  it("Seedance storyboard runner forbids I2V and /fast", () => {
    const src = readFileSync(join(root, "lib/seedance-r2v-run.ts"), "utf8");
    assert.match(src, /bytedance\/seedance-2\.0\/reference-to-video/);
    assert.doesNotMatch(src, /seedance-2\.0\/fast/);
    assert.doesNotMatch(src, /SEEDANCE_R2V_QUALITY = "bytedance\/seedance-2\.0\/image-to-video"/);
    assert.match(src, /@Video1/);
    assert.match(src, /normalizeSeedanceR2vResolution/);
  });

  it("storyboard Seedance uses the plan-clamped resolution, not hardcoded 1080p", () => {
    const src = readFileSync(
      join(root, "app/api/generate-kling-storyboard/route.ts"),
      "utf8",
    );
    assert.match(src, /clampVideoResolution/);
    assert.doesNotMatch(src, /resolution:\s*"1080p"/);
  });

  it("wizard sends face_heavy, forces reel quality, poster ignores leftover MP4", () => {
    const wizard = readFileSync(join(root, "hooks/useStudioWizard.ts"), "utf8");
    assert.match(wizard, /fd\.set\(\s*"face_heavy"/);
    assert.match(wizard, /motion_poster", "1"/);
    assert.match(wizard, /researchReelCopyingNote/);
    assert.match(wizard, /never attach leftover research MP4/);
    assert.match(wizard, /Leftover research MP4 is not this job/);
    assert.match(wizard, /makeImageToVideo[\s\S]*hasReel: false/);
  });

  it("/api/generate forces quality Seedance when a reel is attached", () => {
    const src = readFileSync(join(root, "app/api/generate/route.ts"), "utf8");
    assert.match(src, /reelExpectedEarly \? false : formData\.get\("fast"\)/);
  });

  it("simple VideoSettingsPanel hides engine picker", () => {
    const src = readFileSync(
      join(root, "components/VideoSettingsPanel.tsx"),
      "utf8",
    );
    assert.match(src, /showEnginePicker \?/);
    assert.doesNotMatch(src, /motionPoster \? null/);
    assert.match(src, /VIDEO_RESOLUTION_CAPS\.map/);
    assert.match(src, /canUseVideoResolution/);
    assert.match(src, /PlanGateDialog/);
    assert.doesNotMatch(src, /allowedResolutions\.map/);
  });
});

describe("Seedance R2V resolution", () => {
  it("does not bump 480p up to 720p", () => {
    assert.equal(normalizeSeedanceR2vResolution("480p"), "480p");
    assert.equal(normalizeSeedanceR2vResolution("720p"), "720p");
    assert.equal(normalizeSeedanceR2vResolution("1080p"), "1080p");
  });
});
