import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { detectStudioCoachMode } from "../lib/studio-assistant-coach-modes";
import { getNextStudioCoachTask } from "../lib/studio-assistant-coach-profile";
import { buildDefaultAssistantSnapshot } from "../lib/studio-assistant-default-snapshot";
import {
  assistantSurfaceFromPathname,
  isLandingLikeSurface,
  isToolAssistantSurface,
  usesDarkAssistantChrome,
} from "../lib/studio-assistant-surface";

describe("studio-assistant-surface", () => {
  it("maps every public route to a surface or hide", () => {
    assert.equal(assistantSurfaceFromPathname("/"), "landing");
    assert.equal(assistantSurfaceFromPathname("/start"), null);
    assert.equal(assistantSurfaceFromPathname("/studio"), "studio");
    assert.equal(assistantSurfaceFromPathname("/studio/"), "studio");
    assert.equal(assistantSurfaceFromPathname("/edit-image"), null);
    assert.equal(assistantSurfaceFromPathname("/captions"), null);
    assert.equal(assistantSurfaceFromPathname("/captions/visual"), null);
    assert.equal(assistantSurfaceFromPathname("/pro"), null);
    assert.equal(assistantSurfaceFromPathname("/brand-kit"), null);
    assert.equal(assistantSurfaceFromPathname("/library"), null);
    assert.equal(assistantSurfaceFromPathname("/ugc"), null);
    assert.equal(assistantSurfaceFromPathname("/pricing"), null);
    assert.equal(assistantSurfaceFromPathname("/how"), null);
    assert.equal(assistantSurfaceFromPathname("/account"), null);
    assert.equal(assistantSurfaceFromPathname("/sign-in"), null);
    assert.equal(assistantSurfaceFromPathname("/sign-up/sso"), null);
  });

  it("uses dark launcher chrome on tool pages", () => {
    assert.equal(usesDarkAssistantChrome("edit-image"), true);
    assert.equal(usesDarkAssistantChrome("captions"), true);
    assert.equal(usesDarkAssistantChrome("pro"), true);
    assert.equal(usesDarkAssistantChrome("landing"), false);
    assert.equal(usesDarkAssistantChrome("start"), false);
    assert.equal(isToolAssistantSurface("edit-image"), true);
    assert.equal(isLandingLikeSurface("site"), true);
  });

  it("coaches the current tool instead of routing to studio", () => {
    const edit = buildDefaultAssistantSnapshot("edit-image");
    assert.equal(detectStudioCoachMode(edit), "edit-image");
    assert.equal(getNextStudioCoachTask(edit, { userText: "help" }), "guide-edit-image");

    const caps = buildDefaultAssistantSnapshot("captions");
    assert.equal(detectStudioCoachMode(caps), "captions");
    assert.equal(getNextStudioCoachTask(caps, { userText: "help" }), "guide-captions");

    const pro = buildDefaultAssistantSnapshot("pro");
    assert.equal(detectStudioCoachMode(pro), "ultra-canvas");
    assert.equal(getNextStudioCoachTask(pro), "guide-ultra-canvas");
  });
});
