import { describe, expect, it } from "vitest";
import {
  DEFAULT_BRAND_KIT,
  preferNewerBrandKit,
  type BrandKit,
} from "../lib/brand-kit";

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
    expect(preferNewerBrandKit(local, remote).logoUrl).toBe(local.logoUrl);
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
    expect(preferNewerBrandKit(local, remote).logoUrl).toBe(remote.logoUrl);
  });

  it("keeps local on equal timestamps", () => {
    const ts = "2026-08-03T12:00:00.000Z";
    const local = kit({ logoUrl: "local-logo", updatedAt: ts });
    const remote = kit({ logoUrl: "remote-logo", updatedAt: ts });
    expect(preferNewerBrandKit(local, remote).logoUrl).toBe("local-logo");
  });
});
