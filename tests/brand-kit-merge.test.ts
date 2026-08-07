import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_BRAND_KIT,
  preferNewerBrandKit,
  type BrandKit,
} from "../lib/brand-kit";
import { brandKitForGeneration, brandKitWantsLogo } from "../lib/brand-merge";

function kit(partial: Partial<BrandKit>): BrandKit {
  return { ...DEFAULT_BRAND_KIT, ...partial };
}

describe("preferNewerBrandKit", () => {
  it("keeps local when remote is older (does not wipe newer logo)", () => {
    const local = kit({
      logoUrl: "data:image/png;base64,NEWER",
      updatedAt: "2026-08-03T12:00:00.000Z",
    });
    const remote = kit({
      logoUrl: null,
      updatedAt: "2026-08-01T12:00:00.000Z",
    });
    assert.equal(preferNewerBrandKit(local, remote).logoUrl, local.logoUrl);
  });

  it("applies remote when remote is newer", () => {
    const local = kit({
      logoUrl: null,
      updatedAt: "2026-08-01T12:00:00.000Z",
    });
    const remote = kit({
      logoUrl: "/api/library/download/aaaaaaaaaaaaaaaaaaaaaaaa?inline=1",
      updatedAt: "2026-08-03T12:00:00.000Z",
    });
    assert.equal(preferNewerBrandKit(local, remote).logoUrl, remote.logoUrl);
  });

  it("keeps local on equal timestamps", () => {
    const ts = "2026-08-03T12:00:00.000Z";
    const local = kit({ logoUrl: "local-logo", updatedAt: ts });
    const remote = kit({ logoUrl: "remote-logo", updatedAt: ts });
    assert.equal(preferNewerBrandKit(local, remote).logoUrl, "local-logo");
  });
});

describe("brandKitWantsLogo / brandKitForGeneration", () => {
  it("wants logo only when opted in and logoUrl exists", () => {
    assert.equal(brandKitWantsLogo(kit({ logoUrl: "x", useBrandLogo: false })), false);
    assert.equal(brandKitWantsLogo(kit({ logoUrl: null, useBrandLogo: true })), false);
    assert.equal(brandKitWantsLogo(kit({ logoUrl: "x", useBrandLogo: true })), true);
  });

  it("strips logoUrl for generation when useBrandLogo is off", () => {
    const out = brandKitForGeneration(
      kit({ logoUrl: "data:image/png;base64,ABC", useBrandLogo: false }),
    );
    assert.equal(out?.logoUrl, null);
    assert.equal(out?.useBrandLogo, false);
  });

  it("keeps logo when opted in", () => {
    const out = brandKitForGeneration(
      kit({ logoUrl: "/api/library/download/x", useBrandLogo: true }),
    );
    assert.equal(out?.logoUrl, "/api/library/download/x");
    assert.equal(out?.useBrandLogo, true);
  });
});
