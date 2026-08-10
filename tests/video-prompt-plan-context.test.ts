import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { appendArtStyleSeedanceHintIfNeeded } from "../lib/art-style";
import { videoPlannerContextBlock } from "../lib/video-prompt-plan";

describe("videoPlannerContextBlock", () => {
  it("includes art style and stylized guard for anime", () => {
    const block = videoPlannerContextBlock({
      artStyleId: "anime-2d",
      subjectFraming: "hands-only",
      promptExtra: "Style-only reference: meme energy",
    }).join("\n");
    assert.match(block, /anime/i);
    assert.match(block, /stylized medium/i);
    assert.match(block, /hands holding the product/i);
    assert.match(block, /Style-only reference/);
  });

  it("omits framing line when auto", () => {
    const block = videoPlannerContextBlock({ subjectFraming: "auto" }).join("\n");
    assert.doesNotMatch(block, /Framing preference/);
  });

  it("skips art-style hints when hasReferenceVideo", () => {
    const block = videoPlannerContextBlock({
      artStyleId: "watercolor",
      hasReferenceVideo: true,
    }).join("\n");
    assert.match(block, /follow @Video1/i);
    assert.doesNotMatch(block, /stylized medium/i);
  });
});

describe("creative planner brand fuse", () => {
  it("creative plan prompt accepts optional brand DNA", () => {
    const src = readFileSync(join(process.cwd(), "lib/video-prompt-plan.ts"), "utf8");
    assert.match(src, /brandProfile\?: BrandProfile/);
    assert.match(src, /Brand DNA below is OPTIONAL lock/);
    assert.match(src, /brandProfilePromptBlock\(input\.brandProfile\)/);
  });
});

describe("appendArtStyleSeedanceHintIfNeeded", () => {
  it("appends stylized hint once", () => {
    const out = appendArtStyleSeedanceHintIfNeeded(
      "Slow push-in on product.",
      "cartoon-3d",
    );
    assert.match(out, /Pixar-style/i);
    const again = appendArtStyleSeedanceHintIfNeeded(out, "cartoon-3d");
    assert.equal(again, out);
  });

  it("leaves realistic prompts unchanged aside from trim", () => {
    const p = "Slow push-in on product.";
    assert.equal(appendArtStyleSeedanceHintIfNeeded(p, "realistic"), p);
  });

  it("does not glue illustration styles onto @Video1 R2V prompts", () => {
    const p =
      "Follow @Video1 shot structure. @Image1 replaces the hero product.";
    assert.equal(appendArtStyleSeedanceHintIfNeeded(p, "watercolor"), p);
  });

  it("applies video-safe grade on @Video1 when user picked cinematic", () => {
    const p =
      "Follow @Video1 shot structure. @Image1 replaces the hero product.";
    const out = appendArtStyleSeedanceHintIfNeeded(p, "cinematic");
    assert.match(out, /cinematic lighting|contrast/i);
  });

  it("honors explicit skip for reference video without @Video1 text", () => {
    const p = "Multi-angle product showcase with commercial pacing.";
    assert.equal(
      appendArtStyleSeedanceHintIfNeeded(p, "watercolor", { skip: true }),
      p,
    );
  });
});
