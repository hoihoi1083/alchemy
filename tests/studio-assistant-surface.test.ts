import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { detectStudioCoachMode } from "../lib/studio-assistant-coach-modes";
import { getNextStudioCoachTask } from "../lib/studio-assistant-coach-profile";
import { buildDefaultAssistantSnapshot } from "../lib/studio-assistant-default-snapshot";
import {
  assistantSurfaceFromPathname,
  isLandingLikeSurface,
  isStudioAssistantMounted,
  isToolAssistantSurface,
  usesDarkAssistantChrome,
} from "../lib/studio-assistant-surface";

describe("studio-assistant-surface", () => {
  it("maps public routes to surfaces", () => {
    assert.equal(assistantSurfaceFromPathname("/"), "landing");
    assert.equal(assistantSurfaceFromPathname("/start"), "start");
    assert.equal(assistantSurfaceFromPathname("/studio"), "studio");
    assert.equal(assistantSurfaceFromPathname("/studio/"), "studio");
    assert.equal(assistantSurfaceFromPathname("/edit-image"), "edit-image");
    assert.equal(assistantSurfaceFromPathname("/edit-image-2"), "edit-image");
    assert.equal(assistantSurfaceFromPathname("/captions"), "captions");
    assert.equal(assistantSurfaceFromPathname("/captions-2"), "captions");
    assert.equal(assistantSurfaceFromPathname("/ultra"), "pro");
    assert.equal(assistantSurfaceFromPathname("/pro"), "pro");
    assert.equal(assistantSurfaceFromPathname("/brand-kit"), "brand-kit");
    assert.equal(assistantSurfaceFromPathname("/library"), "library");
    assert.equal(assistantSurfaceFromPathname("/ugc"), "ugc");
    assert.equal(assistantSurfaceFromPathname("/pricing"), null);
    assert.equal(assistantSurfaceFromPathname("/how"), null);
    assert.equal(assistantSurfaceFromPathname("/account"), null);
    assert.equal(assistantSurfaceFromPathname("/sign-in"), null);
  });

  it("mounts landing always; tools only behind flag", () => {
    const prev = process.env.NEXT_PUBLIC_ASSISTANT_TOOL_SURFACES;
    delete process.env.NEXT_PUBLIC_ASSISTANT_TOOL_SURFACES;
    assert.equal(isStudioAssistantMounted("/"), true);
    assert.equal(isStudioAssistantMounted("/studio"), false);
    assert.equal(isStudioAssistantMounted("/ultra"), false);
    assert.equal(isStudioAssistantMounted("/captions-2"), false);
    assert.equal(isStudioAssistantMounted("/edit-image-2"), false);
    assert.equal(isStudioAssistantMounted("/start"), false);

    process.env.NEXT_PUBLIC_ASSISTANT_TOOL_SURFACES = "1";
    assert.equal(isStudioAssistantMounted("/"), true);
    assert.equal(isStudioAssistantMounted("/ultra"), true);
    assert.equal(isStudioAssistantMounted("/captions-2"), true);
    assert.equal(isStudioAssistantMounted("/edit-image-2"), true);
    assert.equal(isStudioAssistantMounted("/studio"), false);

    if (prev === undefined) delete process.env.NEXT_PUBLIC_ASSISTANT_TOOL_SURFACES;
    else process.env.NEXT_PUBLIC_ASSISTANT_TOOL_SURFACES = prev;
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
