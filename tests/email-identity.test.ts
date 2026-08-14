import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  normalizeEmail,
  pickCanonicalUser,
} from "@/lib/db/email-identity";
import type { DbUser } from "@/lib/db/types";

function user(partial: Partial<DbUser> & { clerkId: string }): DbUser {
  return {
    email: "a@example.com",
    name: null,
    imageUrl: null,
    region: "hk",
    creditBalance: 0,
    plan: "free",
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...partial,
  };
}

describe("email-identity", () => {
  it("normalizeEmail lowercases and trims", () => {
    assert.equal(normalizeEmail("  Foo@Bar.COM "), "foo@bar.com");
    assert.equal(normalizeEmail(""), null);
    assert.equal(normalizeEmail(null), null);
  });

  it("pickCanonicalUser prefers Stripe customer", () => {
    const a = user({ clerkId: "a", stripeCustomerId: "cus_a", plan: "free" });
    const b = user({ clerkId: "b", plan: "pro", creditBalance: 9999 });
    assert.equal(pickCanonicalUser(a, b).clerkId, "a");
  });

  it("pickCanonicalUser prefers higher plan when both have Stripe", () => {
    const a = user({
      clerkId: "a",
      stripeCustomerId: "cus_a",
      plan: "standard",
    });
    const b = user({
      clerkId: "b",
      stripeCustomerId: "cus_b",
      plan: "pro",
    });
    assert.equal(pickCanonicalUser(a, b).clerkId, "b");
  });

  it("pickCanonicalUser prefers higher balance then older", () => {
    const a = user({
      clerkId: "a",
      stripeCustomerId: "cus_a",
      plan: "pro",
      creditBalance: 100,
      createdAt: new Date("2026-01-01"),
    });
    const b = user({
      clerkId: "b",
      stripeCustomerId: "cus_b",
      plan: "pro",
      creditBalance: 100,
      createdAt: new Date("2026-02-01"),
    });
    assert.equal(pickCanonicalUser(a, b).clerkId, "a");
  });

  it("ensureUser blocks free signup grant re-claim by email", () => {
    const src = readFileSync(join(process.cwd(), "lib/db/users.ts"), "utf8");
    assert.match(src, /emailAlreadyClaimedSignupGrant/);
    assert.match(src, /tryReserveSignupGrantForEmail/);
    assert.match(src, /markSignupGrantClaimedWithoutCredit/);
    assert.match(src, /ensureSignupGrant/);
  });

  it("email merge carries signupGrantAt to survivor", () => {
    const src = readFileSync(
      join(process.cwd(), "lib/db/email-identity.ts"),
      "utf8",
    );
    assert.match(src, /signupGrantAt/);
    assert.match(src, /emailAlreadyClaimedSignupGrant/);
    assert.match(src, /tryReserveSignupGrantForEmail/);
    assert.match(src, /signup_grant_claims/);
    assert.match(src, /signupGrantCarried/);
  });
});
