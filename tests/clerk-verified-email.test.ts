import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { verifiedEmailFromClerkUser } from "@/lib/clerk-verified-email";

describe("verifiedEmailFromClerkUser", () => {
  it("returns verified primary email", () => {
    const email = verifiedEmailFromClerkUser({
      primaryEmailAddress: {
        emailAddress: "owner@example.com",
        verification: { status: "verified" },
      },
      emailAddresses: [
        {
          emailAddress: "other@example.com",
          verification: { status: "verified" },
        },
      ],
    } as Parameters<typeof verifiedEmailFromClerkUser>[0]);
    assert.equal(email, "owner@example.com");
  });

  it("returns null when only unverified addresses exist", () => {
    const email = verifiedEmailFromClerkUser({
      primaryEmailAddress: {
        emailAddress: "victim@gmail.com",
        verification: { status: "unverified" },
      },
      emailAddresses: [
        {
          emailAddress: "victim@gmail.com",
          verification: { status: "unverified" },
        },
      ],
    } as Parameters<typeof verifiedEmailFromClerkUser>[0]);
    assert.equal(email, null);
  });

  it("falls back to first verified non-primary address", () => {
    const email = verifiedEmailFromClerkUser({
      primaryEmailAddress: {
        emailAddress: "pending@example.com",
        verification: { status: "unverified" },
      },
      emailAddresses: [
        {
          emailAddress: "pending@example.com",
          verification: { status: "unverified" },
        },
        {
          emailAddress: "verified@example.com",
          verification: { status: "verified" },
        },
      ],
    } as Parameters<typeof verifiedEmailFromClerkUser>[0]);
    assert.equal(email, "verified@example.com");
  });
});
