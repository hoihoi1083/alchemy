/**
 * Static contract: grantTokensOnce must release billing_event_locks when grant fails,
 * otherwise Stripe retries permanently block credits (paid → 0 tokens).
 *
 *   npx tsx --test tests/billing-grant-once-lock.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const src = readFileSync(join(process.cwd(), "lib/stripe/billing-sync.ts"), "utf8");

describe("grantTokensOnce lock release", () => {
  it("releases lock when grantTokens returns null", () => {
    assert.match(src, /deleteOne\(\{\s*_id:\s*ref\s*\}\)/);
    assert.match(src, /released lock after null grant/);
  });

  it("releases lock when grantTokens throws", () => {
    assert.match(src, /released lock after grant error/);
    assert.match(src, /catch\s*\(err\)/);
  });

  it("still short-circuits when lock already claimed (idempotent)", () => {
    assert.match(src, /if\s*\(prior\)/);
    assert.match(src, /credit_transactions/);
  });
});
