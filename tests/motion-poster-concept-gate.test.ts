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
    const skips = [...wizard.matchAll(/videoCreativeMode !== "motion-poster"/g)];
    assert.ok(skips.length >= 4, "unblock must skip plan + generate + disabled gates");
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
