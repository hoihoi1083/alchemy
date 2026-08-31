import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isBrowseInputOnlyChange,
  isLibraryBrowseQuery,
  phaseCompleted,
  phaseForMicroStep,
  phasesForWorkflow,
  preferredMicroStepForPhase,
  resolveLibraryHighlightProjectId,
} from "../lib/project-browse";
import { EMPTY_PROJECT_SNAPSHOT } from "../lib/project-snapshot";

describe("project browse phases", () => {
  it("maps workflow modes to phase lists", () => {
    assert.deepEqual(phasesForWorkflow("image-only"), ["setup", "image", "done"]);
    assert.deepEqual(phasesForWorkflow("combined"), [
      "setup",
      "image",
      "video",
      "done",
    ]);
  });

  it("maps micro steps to phases", () => {
    assert.equal(phaseForMicroStep("identity.product_name"), "setup");
    assert.equal(phaseForMicroStep("setup.pre_generate"), "image");
    assert.equal(phaseForMicroStep("image.review"), "image");
    assert.equal(phaseForMicroStep("setup.pre_video"), "video");
    assert.equal(phaseForMicroStep("done.export"), "done");
  });

  it("marks completed phases from media", () => {
    const wizard = {
      imageUrl: "https://x/a.png",
      videoUrl: null as string | null,
      storyboardScenes: [] as { imageUrl: string }[],
      campaignSlides: [] as { imageUrl: string }[],
      product: "Tea",
      headline: "",
      conceptIdea: "",
    };
    assert.equal(phaseCompleted("setup", wizard), true);
    assert.equal(phaseCompleted("image", wizard), true);
    assert.equal(phaseCompleted("video", wizard), false);
    assert.equal(phaseCompleted("done", wizard), true);
  });

  it("prefers review when image exists", () => {
    const steps = [
      { id: "setup.pre_generate" },
      { id: "image.review" },
      { id: "done.export" },
    ];
    const wizard = {
      imageUrl: "https://x/a.png",
      videoUrl: null as string | null,
      storyboardScenes: [] as { imageUrl: string }[],
      campaignSlides: [] as { imageUrl: string }[],
    };
    assert.equal(preferredMicroStepForPhase("image", steps, wizard), "image.review");
  });
});

describe("browse isolation helpers", () => {
  it("detects input-only snapshot deltas while media unchanged", () => {
    const base = EMPTY_PROJECT_SNAPSHOT("physical");
    base.media.imageUrl = "https://x/a.png";
    const baselineJson = JSON.stringify(base);
    const next = structuredClone(base);
    next.inputs.headline = "New hook";
    assert.equal(isBrowseInputOnlyChange(next, baselineJson), true);
  });

  it("detects media URL changes", () => {
    const base = EMPTY_PROJECT_SNAPSHOT("physical");
    base.media.imageUrl = "https://x/a.png";
    const baselineJson = JSON.stringify(base);
    const next = structuredClone(base);
    next.media.imageUrl = "https://x/b.png";
    assert.equal(isBrowseInputOnlyChange(next, baselineJson), false);
  });
});

describe("library browse query", () => {
  it("recognizes from=library", () => {
    assert.equal(isLibraryBrowseQuery("library"), true);
    assert.equal(isLibraryBrowseQuery("Library"), true);
    assert.equal(isLibraryBrowseQuery("studio"), false);
    assert.equal(isLibraryBrowseQuery(null), false);
  });

  it("prefers highlight query over session storage", () => {
    assert.equal(resolveLibraryHighlightProjectId("proj-highlight"), "proj-highlight");
  });
});
