import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { join } from "node:path";
import {
  allStoryboardCellsViewed,
  retainStoryboardCellViewed,
  urlsFromStoryboardSceneSig,
} from "../lib/storyboard-cell-review";

describe("storyboard cell review (stills are the product)", () => {
  it("parses scene sig URLs and keeps viewed only for unchanged stills", () => {
    const prev = "1:https://a/1.png|2:https://a/2.png|3:https://a/3.png|4:https://a/4.png";
    const next = "1:https://a/1.png|2:https://a/2b.png|3:https://a/3.png|4:https://a/4.png";
    assert.deepEqual(urlsFromStoryboardSceneSig(prev)[1], "https://a/2.png");
    assert.deepEqual(
      retainStoryboardCellViewed([0, 1, 2, 3], prev, next),
      [0, 2, 3],
    );
    assert.equal(allStoryboardCellsViewed(4, [0, 1, 2, 3]), true);
    assert.equal(allStoryboardCellsViewed(4, [0, 2, 3]), false);
  });

  it("gallery + generateVideo require one confirm; poster skips empty prompt", () => {
    const root = process.cwd();
    const gallery = readFileSync(
      join(root, "components/studio/ImageReviewGallery.tsx"),
      "utf8",
    );
    const wizard = readFileSync(join(root, "hooks/useStudioWizard.ts"), "utf8");
    assert.match(gallery, /storyboardGridApproved/);
    assert.doesNotMatch(gallery, /disabled=\{!wizard\.storyboardAllCellsViewed\}/);
    assert.doesNotMatch(gallery, /reviewable=\{isStoryboardReview\}/);
    assert.match(gallery, /reviewable=\{false\}/);
    assert.doesNotMatch(wizard, /storyboardApproveNeedLookHint/);
    assert.match(wizard, /isStoryboardOutput && !storyboardGridApproved/);
    assert.match(wizard, /videoCreativeMode !== "motion-poster"/);
    assert.match(wizard, /const rawPrompt = posterPrompt/);
  });

  it("combined storyboard: look + text mode before plan; poster hides picker", () => {
    const root = process.cwd();
    const src = readFileSync(
      join(root, "components/studio/PreGenerateSetupPanel.tsx"),
      "utf8",
    );
    const lookAt = src.indexOf("pg.storyboardLookBeforePlanHint");
    const textHintAt = src.indexOf("pg.storyboardTextModeHint");
    const planAt = src.indexOf("void wizard.planStoryboard()");
    assert.ok(lookAt > 0 && lookAt < planAt, "style picker must sit above 生成分鏡大綱");
    assert.ok(
      textHintAt > lookAt && textHintAt < planAt,
      "有字/無字 picker sits on the look card before 生成分鏡大綱",
    );
    assert.match(src, /videoCreativeMode !== "motion-poster"/);
    assert.match(src, /!combinedStoryboard \? \(/);

    const images = readFileSync(
      join(root, "app/api/generate-storyboard-images/route.ts"),
      "utf8",
    );
    assert.match(images, /parseImageTextMode/);
    assert.match(images, /textless: textlessStills/);
    assert.doesNotMatch(images, /textless: true/);

    const micro = readFileSync(
      join(root, "components/studio/micro-wizard/MicroStepRenderer.tsx"),
      "utf8",
    );
    assert.match(micro, /isStoryboardVideoStyle\(wizard\.visualStyleId\)/);
    assert.match(micro, /videoCreativeMode !== "motion-poster"/);
  });
});
