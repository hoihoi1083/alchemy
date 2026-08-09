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

  it("gallery + generateVideo require look-then-approve; poster skips empty prompt", () => {
    const root = process.cwd();
    const gallery = readFileSync(
      join(root, "components/studio/ImageReviewGallery.tsx"),
      "utf8",
    );
    const wizard = readFileSync(join(root, "hooks/useStudioWizard.ts"), "utf8");
    assert.match(gallery, /markStoryboardCellViewed/);
    assert.match(gallery, /storyboardAllCellsViewed/);
    assert.match(gallery, /disabled=\{!wizard\.storyboardAllCellsViewed\}/);
    assert.match(wizard, /storyboardApproveNeedLookHint/);
    assert.match(wizard, /videoCreativeMode !== "motion-poster"/);
    assert.match(wizard, /const rawPrompt = posterPrompt/);
  });
});
