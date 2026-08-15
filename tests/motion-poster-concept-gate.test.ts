import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { join } from "node:path";
import {
  buildMotionPosterPrompt,
  resolveMotionPosterPromptIdentity,
} from "../lib/shot-recipes";

describe("concept motion-poster unblock + recipe lock", () => {
  it("identity prefers concept idea when product name is empty", () => {
    const id = resolveMotionPosterPromptIdentity({
      product: "",
      headline: "",
      conceptIdea: "周末瑜伽班",
      conceptMode: true,
    });
    assert.equal(id.conceptMode, true);
    assert.equal(id.product, "周末瑜伽班");
    assert.equal(id.headline, "周末瑜伽班");
    const prompt = buildMotionPosterPrompt({
      ...id,
      durationSec: 6,
      mode: "loop",
    });
    assert.match(prompt, /周末瑜伽班/);
    assert.match(prompt, /CONCEPT \/ SERVICE|service scene|Claim\/title only/i);
  });

  it("generateVideo skips empty-prompt gates; poster POST uses recipe only", () => {
    const wizard = readFileSync(join(process.cwd(), "hooks/useStudioWizard.ts"), "utf8");
    assert.match(wizard, /resolveMotionPosterPromptIdentity/);
    assert.match(wizard, /const rawPrompt = posterPrompt/);
    assert.match(wizard, /generateMotionPosterKeyframe/);
    assert.match(wizard, /motion_poster_frame/);
    assert.match(wizard, /motionPosterBuildingEnd/);
    assert.match(wizard, /mode = "start-end"/);
    const posterCase = wizard.slice(
      wizard.indexOf('case "motion-poster":'),
      wizard.indexOf('case "image-to-video":'),
    );
    assert.doesNotMatch(posterCase, /addBgm/);
    assert.doesNotMatch(posterCase, /videoBgmEnabled/);
    assert.match(wizard, /Keep MiniMax H3 native audio/);
    assert.match(wizard, /buildMotionPosterStillPrompt/);
    assert.match(wizard, /never H3 the raw catalog photo/);
    assert.match(wizard, /motionPosterStillUrlRef/);
    assert.match(wizard, /motionPosterBuildingStill/);
    assert.match(wizard, /motionPosterBuildingEnd/);
    assert.match(wizard, /motionPosterCanAutoStill/);
    assert.match(wizard, /if \(videoCreativeMode === "motion-poster"\) return;/);
    assert.match(
      wizard,
      /!conceptTextVideoReady &&\s*\n\s*!motionPosterCanAutoStill &&/,
    );
    assert.match(wizard, /resolveMotionPosterDialect/);
    assert.match(wizard, /motionPosterDialectPick/);
    assert.match(wizard, /skip vision QA/);
    const applyBlock = wizard.slice(
      wizard.indexOf("function applyGeneratedImages"),
      wizard.indexOf("function applyGeneratedStoryboard"),
    );
    assert.doesNotMatch(applyBlock, /refreshImagePostflight/);
    const skips = [...wizard.matchAll(/videoCreativeMode !== "motion-poster"/g)];
    assert.ok(skips.length >= 4, "unblock must skip plan + generate + disabled gates");
  });

  it("generate-image ignores client prompt and uses textless system prompt for posters", () => {
    const src = readFileSync(
      join(process.cwd(), "app/api/generate-image/route.ts"),
      "utf8",
    );
    assert.match(src, /posterFrame === "end"/);
    assert.match(src, /buildMotionPosterEndStillPrompt/);
    assert.match(src, /textless: motionPoster && posterFrame !== "end"/);
    assert.doesNotMatch(src, /motionPoster\s*\n\s*\? clientPrompt \|\| builtPrompt/);
  });

  it("pre-video poster setup exposes full art-style picker", () => {
    const src = readFileSync(
      join(process.cwd(), "components/studio/PreVideoSetupPanel.tsx"),
      "utf8",
    );
    assert.match(src, /ArtStylePicker/);
    assert.match(src, /motionPosterArtStyleTitle/);
    assert.match(src, /videoSafeOnly=\{false\}/);
  });

  it("simple studio hides Seedance vs H3 picker (poster included)", () => {
    const src = readFileSync(
      join(process.cwd(), "components/VideoSettingsPanel.tsx"),
      "utf8",
    );
    assert.match(src, /showEnginePicker = false/);
    assert.match(src, /showEnginePicker \?/);
  });
});
