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
    assert.equal(assistantSurfaceFromPathname("/start"), "start");
    assert.equal(assistantSurfaceFromPathname("/studio"), null);
    assert.equal(assistantSurfaceFromPathname("/studio/"), null);
    assert.equal(assistantSurfaceFromPathname("/edit-image"), "edit-image");
    assert.equal(assistantSurfaceFromPathname("/captions"), "captions");
    assert.equal(assistantSurfaceFromPathname("/captions/visual"), "captions");
    assert.equal(assistantSurfaceFromPathname("/pro"), "pro");
    assert.equal(assistantSurfaceFromPathname("/brand-kit"), "brand-kit");
    assert.equal(assistantSurfaceFromPathname("/library"), "library");
    assert.equal(assistantSurfaceFromPathname("/ugc"), "ugc");
    assert.equal(assistantSurfaceFromPathname("/pricing"), "site");
    assert.equal(assistantSurfaceFromPathname("/how"), "site");
    assert.equal(assistantSurfaceFromPathname("/account"), "site");
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
    assert.equal(detectStudioCoachMode(pro), "pro-canvas");
    assert.equal(getNextStudioCoachTask(pro), "guide-pro");
  });
});
