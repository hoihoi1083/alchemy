import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildTornPaperRevealStillPrompt,
  buildTornPaperRevealVideoPrompt,
  clampTornPaperRevealDurationSec,
  resolveTornPaperRevealDialect,
  resolveTornPaperTearAxis,
  tornPaperRevealDurationOptions,
  TORN_PAPER_REVEAL_MOTION_STRENGTH,
} from "../lib/torn-paper-reveal";
import {
  isRecipeOwnedVideoMode,
  videoModeHidesAutoDuration,
} from "../lib/creative-workflow";
import { isLandingRecipeId, LANDING_RECIPES } from "../lib/landing-recipes";
import { resolveVideoGenerationKind } from "../lib/video-generation-path";

describe("torn-paper-reveal", () => {
  it("registers as recipe-owned mode with no auto duration", () => {
    assert.equal(isRecipeOwnedVideoMode("torn-paper-reveal"), true);
    assert.equal(videoModeHidesAutoDuration("torn-paper-reveal"), true);
    assert.deepEqual(tornPaperRevealDurationOptions(), ["6", "8"]);
    assert.equal(clampTornPaperRevealDurationSec("auto"), 6);
    assert.equal(clampTornPaperRevealDurationSec("6"), 6);
    assert.equal(clampTornPaperRevealDurationSec(14), 8);
    assert.ok(TORN_PAPER_REVEAL_MOTION_STRENGTH >= 60);
  });

  it("resolves Strip / Peel / Wide dialects", () => {
    assert.equal(
      resolveTornPaperRevealDialect({ pick: "strip-tear" }),
      "strip-tear",
    );
    assert.equal(
      resolveTornPaperRevealDialect({ pick: "peel-curl" }),
      "peel-curl",
    );
    assert.equal(
      resolveTornPaperRevealDialect({ pick: "wide-rip" }),
      "wide-rip",
    );
    assert.equal(
      resolveTornPaperRevealDialect({
        pick: "auto",
        headline: "peel curl paper",
      }),
      "peel-curl",
    );
    assert.equal(
      resolveTornPaperRevealDialect({ pick: "auto" }),
      "strip-tear",
    );
  });

  it("picks tear axis from product shape (not vision bbox)", () => {
    assert.equal(
      resolveTornPaperTearAxis({ product: "amber serum bottle with pump" }),
      "vertical",
    );
    assert.equal(
      resolveTornPaperTearAxis({ product: "gift box carton set" }),
      "horizontal",
    );
    assert.equal(
      resolveTornPaperTearAxis({ dialect: "peel-curl" }),
      "diagonal",
    );
    assert.equal(
      resolveTornPaperTearAxis({ headline: "竖撕 reveal" }),
      "vertical",
    );
    assert.equal(
      resolveTornPaperTearAxis({ headline: "diagonal tear" }),
      "diagonal",
    );
  });

  it("builds still and video prompts with DRY paper tear DNA (not wet glass)", () => {
    const still = buildTornPaperRevealStillPrompt({
      dialect: "strip-tear",
      product: "amber cleanser bottle",
      frame: "start",
    });
    assert.match(still, /paper|tear|pear|fiber/i);
    assert.match(still, /DRY|dry/);
    assert.match(still, /3:4/);
    assert.match(still, /IMAGE 1|identity|locks hero/i);
    assert.match(still, /NOT wet glass|FORBIDDEN:.*wet glass/i);
    assert.match(still, /vertical tear/i); // bottle → vertical

    const end = buildTornPaperRevealStillPrompt({
      dialect: "strip-tear",
      product: "amber cleanser bottle",
      frame: "end",
      editingStartPlate: true,
    });
    assert.match(end, /START PLATE EDIT|tear|logo/i);
    assert.match(end, /vertical/i);

    const video = buildTornPaperRevealVideoPrompt({
      dialect: "peel-curl",
      product: "amber cleanser bottle",
      durationSec: 6,
      tearAxis: "diagonal",
    });
    assert.match(video, /6/);
    assert.match(video, /Peel|tear|paper/i);
    assert.match(video, /diagonal/i);
    assert.match(video, /RENDS|rending|tear crack|fibrous/i);
    assert.match(video, /fog|droplet|wet glass/i); // forbidden callouts present
  });

  it("has concept + product landing recipes at 6s", () => {
    assert.ok(isLandingRecipeId("product-torn-paper-reveal-6s"));
    assert.ok(isLandingRecipeId("concept-torn-paper-reveal-6s"));
    assert.equal(
      LANDING_RECIPES["product-torn-paper-reveal-6s"].videoCreativeMode,
      "torn-paper-reveal",
    );
    assert.equal(LANDING_RECIPES["product-torn-paper-reveal-6s"].duration, "6");
  });

  it("resolves generation kind and wires wizard", () => {
    assert.equal(
      resolveVideoGenerationKind({
        videoCreativeMode: "torn-paper-reveal",
        workflowMode: "video-only",
      }),
      "torn-paper-reveal",
    );
    const wiz = readFileSync(
      join(process.cwd(), "hooks/useStudioWizard.ts"),
      "utf8",
    );
    assert.match(wiz, /case "torn-paper-reveal"/);
    assert.match(wiz, /makeTornPaperRevealVideo/);
    assert.match(wiz, /tornPaperDialectPick/);
    assert.match(wiz, /resolveTornPaperTearAxis/);
    assert.match(wiz, /keepNativeAudio:\s*true/);
  });
});
