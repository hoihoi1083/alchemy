import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, it } from "node:test";
import {
  INTERNAL_UNLIMITED_PLAN,
  isInternalUnlimitedClerkId,
  isInternalUnlimitedEmail,
  isInternalUnlimitedIdentity,
  parseCsvEnvList,
} from "../lib/billing/internal-unlimited";
import { canUseProCanvas } from "../lib/billing/entitlements";

const root = process.cwd();
const prevIds = process.env.INTERNAL_UNLIMITED_CLERK_IDS;
const prevEmails = process.env.INTERNAL_UNLIMITED_EMAILS;

afterEach(() => {
  if (prevIds === undefined) delete process.env.INTERNAL_UNLIMITED_CLERK_IDS;
  else process.env.INTERNAL_UNLIMITED_CLERK_IDS = prevIds;
  if (prevEmails === undefined) delete process.env.INTERNAL_UNLIMITED_EMAILS;
  else process.env.INTERNAL_UNLIMITED_EMAILS = prevEmails;
});

describe("internal unlimited allowlist", () => {
  it("parses comma/semicolon lists and drops empties", () => {
    assert.deepEqual(parseCsvEnvList(" user_a, user_b ;user_a\nuser_c "), [
      "user_a",
      "user_b",
      "user_c",
    ]);
    assert.deepEqual(parseCsvEnvList("  "), []);
    assert.deepEqual(parseCsvEnvList(undefined), []);
  });

  it("matches Clerk IDs exactly and emails case-insensitively", () => {
    process.env.INTERNAL_UNLIMITED_CLERK_IDS = "user_abc,user_def";
    process.env.INTERNAL_UNLIMITED_EMAILS = "Ops@Alchemyailab.com";

    assert.equal(isInternalUnlimitedClerkId("user_abc"), true);
    assert.equal(isInternalUnlimitedClerkId("user_xyz"), false);
    assert.equal(isInternalUnlimitedClerkId(""), false);
    assert.equal(isInternalUnlimitedEmail("ops@alchemyailab.com"), true);
    assert.equal(isInternalUnlimitedEmail("other@example.com"), false);
    assert.equal(
      isInternalUnlimitedIdentity({ clerkId: "user_xyz", email: "ops@alchemyailab.com" }),
      true,
    );
    assert.equal(
      isInternalUnlimitedIdentity({ clerkId: "user_abc", email: "nobody@example.com" }),
      true,
    );
    assert.equal(
      isInternalUnlimitedIdentity({ clerkId: "user_xyz", email: "nobody@example.com" }),
      false,
    );
  });

  it("does not match anyone when env is unset", () => {
    delete process.env.INTERNAL_UNLIMITED_CLERK_IDS;
    delete process.env.INTERNAL_UNLIMITED_EMAILS;
    assert.equal(isInternalUnlimitedClerkId("user_abc"), false);
    assert.equal(isInternalUnlimitedEmail("ops@alchemyailab.com"), false);
  });

  it("grants Master entitlements (Pro canvas) for allowlisted accounts", () => {
    assert.equal(INTERNAL_UNLIMITED_PLAN, "master");
    assert.equal(canUseProCanvas(INTERNAL_UNLIMITED_PLAN), true);
  });

  it("billing gates consult the allowlist before debiting", () => {
    const charge = readFileSync(join(root, "lib/billing/charge.ts"), "utf8");
    const plan = readFileSync(join(root, "lib/billing/get-user-plan.ts"), "utf8");
    const me = readFileSync(join(root, "app/api/me/route.ts"), "utf8");
    const kling = readFileSync(
      join(root, "app/api/generate-kling-storyboard/route.ts"),
      "utf8",
    );
    assert.match(charge, /isInternalUnlimitedUser/);
    assert.match(charge, /getAffordabilityBalance/);
    assert.match(plan, /INTERNAL_UNLIMITED_PLAN/);
    assert.match(me, /INTERNAL_UNLIMITED_DISPLAY_BALANCE/);
    assert.match(kling, /getAffordabilityBalance/);
    assert.doesNotMatch(kling, /getUserBalance\(/);
  });
});
