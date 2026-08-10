import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  buildMotionPosterTypeFilter,
  planMotionPosterTypeOverlay,
} from "../lib/motion-poster-type-overlay";

describe("motion-poster type overlay", () => {
  it("returns null without copy", () => {
    assert.equal(
      planMotionPosterTypeOverlay({ durationSec: 6 }),
      null,
    );
  });

  it("liquid-reveal wipes type up after a short hold", () => {
    const plan = planMotionPosterTypeOverlay({
      headline: "冰滴 Dirty Coffee",
      offer: "今日試飲",
      dialect: "liquid-reveal",
      durationSec: 6,
    });
    assert.ok(plan);
    assert.equal(plan.kind, "wipe-up");
    assert.ok(plan.headStartSec >= 0.4);
    assert.equal(plan.headline, "冰滴 Dirty Coffee");
    assert.equal(plan.cta, "今日試飲");
  });

  it("burn loops still PNG overlays so fade is visible", () => {
    const src = readFileSync(
      join(process.cwd(), "lib/pipeline/motion-poster-type-burn.ts"),
      "utf8",
    );
    assert.match(src, /"-loop", "1"/);
    assert.match(src, /without -loop/);
  });

  it("kinetic-type slides letters", () => {
    const plan = planMotionPosterTypeOverlay({
      headline: "Glow",
      dialect: "kinetic-type",
      durationSec: 6,
    });
    assert.ok(plan);
    assert.equal(plan.kind, "slide-up");
    const filter = buildMotionPosterTypeFilter({
      kind: plan.kind,
      hasHeadline: true,
      hasCta: false,
      headStartSec: plan.headStartSec,
      headDurSec: plan.headDurSec,
      ctaStartSec: plan.ctaStartSec,
      ctaDurSec: plan.ctaDurSec,
    });
    assert.match(filter, /fade=t=in/);
    assert.match(filter, /overlay=x=0:y=/);
    assert.match(filter, /\[vout\]/);
  });

  it("card-warp fades headline then CTA", () => {
    const plan = planMotionPosterTypeOverlay({
      product: "Jade bottle",
      offer: "Shop now",
      dialect: "card-warp",
      durationSec: 6,
    });
    assert.ok(plan);
    assert.equal(plan.kind, "fade");
    const filter = buildMotionPosterTypeFilter({
      kind: plan.kind,
      hasHeadline: true,
      hasCta: true,
      headStartSec: plan.headStartSec,
      headDurSec: plan.headDurSec,
      ctaStartSec: plan.ctaStartSec,
      ctaDurSec: plan.ctaDurSec,
    });
    assert.match(filter, /\[1:v\]format=rgba,fade/);
    assert.match(filter, /\[2:v\]format=rgba,fade/);
    assert.match(filter, /\[vout\]/);
  });
});
