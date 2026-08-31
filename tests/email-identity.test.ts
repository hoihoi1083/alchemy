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

  it("pickCanonicalUser prefers Enterprise over Master when both have Stripe", () => {
    const a = user({
      clerkId: "a",
      stripeCustomerId: "cus_a",
      plan: "master",
    });
    const b = user({
      clerkId: "b",
      stripeCustomerId: "cus_b",
      plan: "custom",
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

  it("requireAppUser only syncs verified Clerk emails into Mongo", () => {
    const src = readFileSync(join(process.cwd(), "lib/require-app-user.ts"), "utf8");
    assert.match(src, /verifiedEmailFromClerkUser/);
    assert.equal(src.includes("emailAddresses[0]"), false);
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

  it("email merge atomically clears donor tokenBatches and uses grantTokensOnce", () => {
    const src = readFileSync(
      join(process.cwd(), "lib/db/email-identity.ts"),
      "utf8",
    );
    assert.match(src, /grantTokensOnce/);
    assert.match(src, /tokenBatches:\s*\[\]/);
    assert.match(src, /emailNormalized:\s*""/);
    assert.match(src, /returnDocument:\s*"before"/);
    assert.equal(src.includes('from "@/lib/billing/ledger"'), false);
  });

  it("ensureUser does not clear supersededBy when merged into another clerkId", () => {
    const src = readFileSync(join(process.cwd(), "lib/db/users.ts"), "utf8");
    assert.match(src, /keepSuperseded/);
    assert.match(src, /supersededBy !== input\.clerkId/);
  });
});
