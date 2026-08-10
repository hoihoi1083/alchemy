import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  artStyleAvoidTail,
  artStyleMandatoryLead,
  artStyleSystemPrompt,
  isIllustratedArtStyle,
  isLookGradeArtStyle,
} from "../lib/art-style";

describe("illustrated vs look-grade art styles", () => {
  it("treats film/CCD/国风/cinematic as look grade, not illustration", () => {
    for (const id of ["cinematic", "film", "ccd", "guofeng"] as const) {
      assert.equal(isLookGradeArtStyle(id), true);
      assert.equal(isIllustratedArtStyle(id), false);
    }
    assert.equal(isLookGradeArtStyle("realistic"), false);
    assert.equal(isIllustratedArtStyle("realistic"), false);
  });

  it("treats anime/comic/3D/watercolor as illustrated mediums", () => {
    for (const id of ["anime-2d", "cartoon-3d", "comic-webtoon", "watercolor"] as const) {
      assert.equal(isIllustratedArtStyle(id), true);
      assert.equal(isLookGradeArtStyle(id), false);
    }
  });

  it("国风 lead keeps photoreal and bans manga icons", () => {
    const lead = artStyleMandatoryLead("guofeng");
    assert.match(lead, /LOOK GRADE/i);
    assert.match(lead, /photoreal/i);
    assert.match(lead, /manga|webtoon|cartoon icons/i);
    assert.doesNotMatch(lead, /Do NOT use photorealistic photography/);
    assert.doesNotMatch(artStyleAvoidTail("guofeng"), /photorealistic commercial photo/);
    assert.match(artStyleSystemPrompt("guofeng") ?? "", /photographic|Photoreal/i);
  });

  it("comic lead still forbids photoreal photography", () => {
    const lead = artStyleMandatoryLead("comic-webtoon");
    assert.match(lead, /MANDATORY RENDER MEDIUM/);
    assert.match(lead, /Do NOT use photorealistic photography/);
  });
});
