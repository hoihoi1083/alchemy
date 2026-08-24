/**
 * Billing safety runner — critical before Stripe.
 *
 *   npx tsx scripts/test-billing-safety.ts
 *   npm run test:billing
 *
 * Optional live Mongo ledger probe (read-only + isolated test user):
 *   BILLING_LIVE=1 npx tsx scripts/test-billing-safety.ts
 */
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const root = process.cwd();

function run(label: string, args: string[]): void {
  console.log(`\n=== ${label} ===\n`);
  const r = spawnSync("npx", ["tsx", "--test", ...args], {
    cwd: root,
    stdio: "inherit",
    shell: false,
  });
  if (r.status !== 0) {
    console.error(`\n✗ ${label} failed\n`);
    process.exit(r.status ?? 1);
  }
  console.log(`\n✓ ${label} passed\n`);
}

run("Billing economics", [join(root, "tests/billing-token-costs.test.ts")]);
run("Billing Phase 1 costs", [join(root, "tests/billing-phase1-costs.test.ts")]);
run("Billing safety (overcharge guards)", [join(root, "tests/billing-safety.test.ts")]);
run("Billing charge/refund smokes", [join(root, "tests/billing-charge-refund-smoke.test.ts")]);
run("Stripe checkout paid-gate", [join(root, "tests/stripe-checkout-paid-gate.test.ts")]);
run("Pro trial billing contracts", [join(root, "tests/pro-trial-billing.test.ts")]);
run("i18n key parity", [join(root, "tests/i18n-key-parity.test.ts")]);

if (process.env.BILLING_LIVE?.trim() === "1") {
  console.log("\n=== Live Mongo wallet probe ===\n");
  const r = spawnSync("npx", ["tsx", join(root, "scripts/billing-live-probe.ts")], {
    cwd: root,
    stdio: "inherit",
    shell: false,
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
} else {
  console.log(
    "Live Mongo probe skipped (set BILLING_LIVE=1 to run isolated wallet probe).\n",
  );
}

console.log(`
=== BILLING SAFETY PASSED ===
Rules verified:
  • Failed jobs charge 0
  • Success charges catalog cost exactly once
  • Insufficient balance blocks with 0 charge
  • Free logo stamp = 0
  • Signup grant is idempotent (300 once)
  • Balance never goes negative
  • Concurrent settle cannot overdraw
  • API routes: require before settle; no settle in catch
`);
