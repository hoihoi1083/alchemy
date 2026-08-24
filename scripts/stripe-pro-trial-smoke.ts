/**
 * Stripe Pro trial smoke — config + price sanity + manual test checklist.
 *
 *   npx tsx scripts/stripe-pro-trial-smoke.ts
 *   npx tsx scripts/stripe-pro-trial-smoke.ts --clerk user_xxx   # optional Mongo user snapshot
 *
 * For webhook forwarding during manual test:
 *   stripe listen --forward-to localhost:3000/api/stripe/webhook
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
loadEnv();

import {
  FREE_SIGNUP_GRANT_TOKENS,
  PRO_TRIAL_BONUS_TOKENS,
  PRO_TRIAL_DAYS,
} from "../lib/billing/plans";
import type { DbUser } from "../lib/db/types";
import { getDb, isMongoConfigured } from "../lib/mongodb";
import { priceIdForPlan } from "../lib/stripe/prices";
import { getStripe, isStripeConfigured } from "../lib/stripe/client";

function argValue(flag: string): string | null {
  const i = process.argv.indexOf(flag);
  if (i === -1 || i + 1 >= process.argv.length) return null;
  return process.argv[i + 1]?.trim() || null;
}

async function checkStripePrice(label: string, priceId: string | null): Promise<boolean> {
  if (!priceId) {
    console.error(`  ✗ ${label}: missing (set STRIPE_PRICE_* in .env.local)`);
    return false;
  }
  try {
    const stripe = getStripe();
    const price = await stripe.prices.retrieve(priceId, { expand: ["product"] });
    const recurring = price.recurring;
    if (!recurring) {
      console.error(`  ✗ ${label}: price ${priceId} is not recurring`);
      return false;
    }
    const amount =
      typeof price.unit_amount === "number"
        ? `$${(price.unit_amount / 100).toFixed(2)}/${recurring.interval}`
        : "custom amount";
    console.log(
      `  ✓ ${label}: ${priceId} (${amount}, ${recurring.interval_count ?? 1}× ${recurring.interval})`,
    );
    return true;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`  ✗ ${label}: ${priceId} — ${msg}`);
    return false;
  }
}

async function printUserSnapshot(clerkId: string): Promise<void> {
  if (!isMongoConfigured()) {
    console.log("\nMongo not configured — skip user snapshot.\n");
    return;
  }
  const db = await getDb();
  const user = await db.collection<DbUser>("users").findOne({ clerkId });
  if (!user) {
    console.log(`\nNo user found for clerkId ${clerkId}\n`);
    return;
  }
  const bonusRef = `pro_trial_bonus_${clerkId}`;
  const bonusTx = await db.collection("credit_transactions").findOne({ ref: bonusRef });
  console.log("\n--- Mongo user snapshot ---");
  console.log(`  clerkId:           ${clerkId}`);
  console.log(`  plan:              ${user.plan ?? "free"}`);
  console.log(`  creditBalance:     ${user.creditBalance ?? 0}`);
  console.log(`  hasUsedProTrial:   ${Boolean(user.hasUsedProTrial)}`);
  console.log(`  proTrialEndsAt:    ${user.proTrialEndsAt?.toISOString?.() ?? "—"}`);
  console.log(`  stripeCustomerId:  ${user.stripeCustomerId ?? "—"}`);
  console.log(`  stripeSubId:       ${user.stripeSubscriptionId ?? "—"}`);
  console.log(`  trial +700 granted: ${bonusTx ? "yes" : "no"} (ref ${bonusRef})`);
  console.log("---------------------------\n");
}

function printManualChecklist(baseUrl: string): void {
  console.log(`
=== Manual Pro trial test (Stripe test mode) ===

Prereqs:
  1. npm run dev
  2. stripe listen --forward-to localhost:3000/api/stripe/webhook
  3. Use a NEW test user (or delete prior trial state in Mongo)

Test card: 4242 4242 4242 4242 · any future expiry · any CVC

A) Signup grant
   • Sign up → Account balance should be ${FREE_SIGNUP_GRANT_TOKENS} tokens

B) Start Pro trial
   • Drain tokens in Studio until insufficient-balance modal appears
   • Click trial CTA → Stripe Checkout (Pro monthly, $0 today)
   • Complete checkout
   • Expect: plan Pro, balance +${PRO_TRIAL_BONUS_TOKENS} (≈ ${FREE_SIGNUP_GRANT_TOKENS + PRO_TRIAL_BONUS_TOKENS} if you started at ${FREE_SIGNUP_GRANT_TOKENS})
   • Stripe Dashboard: subscription status "trialing", trial ${PRO_TRIAL_DAYS} days

C) Cancel trial (immediate)
   • Account → Cancel subscription
   • Expect: plan Free immediately, tokens unchanged, Stripe sub canceled
   • Repeat trial with same user → blocked ("already used")

D) Trial → paid (optional — Test Clock or wait ${PRO_TRIAL_DAYS} days)
   • New user completes trial, do NOT cancel
   • Advance Stripe Test Clock past trial end OR wait
   • First paid invoice → full Pro monthly tokens; proTrialEndsAt cleared

Verify snapshot anytime:
  npx tsx scripts/stripe-pro-trial-smoke.ts --clerk <clerkId>

App URL: ${baseUrl}
`);
}

async function main() {
  console.log("\n=== Stripe Pro trial smoke ===\n");

  let ok = true;

  if (!isStripeConfigured()) {
    console.error("✗ STRIPE_SECRET_KEY missing");
    ok = false;
  } else {
    console.log("✓ STRIPE_SECRET_KEY set");
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET?.trim()) {
    console.warn("⚠ STRIPE_WEBHOOK_SECRET missing (needed for webhook fulfill)");
  } else {
    console.log("✓ STRIPE_WEBHOOK_SECRET set");
  }

  const proMonthly = priceIdForPlan("pro", "monthly");
  if (isStripeConfigured()) {
    console.log("\nStripe prices:");
    const priceOk = await checkStripePrice("Pro monthly (trial)", proMonthly);
    ok = ok && priceOk;
  }

  const clerkId = argValue("--clerk");
  if (clerkId) await printUserSnapshot(clerkId);

  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "http://localhost:3000";
  printManualChecklist(base);

  if (!ok) {
    console.error("Smoke checks failed — fix env / Stripe prices before manual test.\n");
    process.exit(1);
  }
  console.log("Config smoke passed. Follow the checklist above for end-to-end verification.\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
