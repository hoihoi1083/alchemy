#!/usr/bin/env npx tsx
/**
 * Compare Stripe Price IDs (env) vs i18n + plans.ts expected amounts.
 *   npx tsx scripts/audit-stripe-prices.ts
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
loadEnv();

import { readFileSync } from "node:fs";
import { PLAN_DEFINITIONS, TOP_UP_PRICE_USD } from "../lib/billing/plans";
import { priceIdForPlan, topUpPriceId, type PaidPlan } from "../lib/stripe/prices";
import { getStripe, isStripeConfigured } from "../lib/stripe/client";

type PaidPlanKey = PaidPlan;

const PAID: PaidPlanKey[] = ["light", "standard", "pro", "master", "custom"];

function parseUsdFromI18n(block: string, key: string): number | null {
  const m = block.match(new RegExp(`${key}:\\s*"\\$(\\d+(?:\\.\\d+)?)"`));
  return m ? Number(m[1]) : null;
}

async function main() {
  console.log("\n=== Stripe vs catalog price audit ===\n");

  const enSrc = readFileSync("lib/i18n/en.ts", "utf8");
  let ok = true;

  for (const plan of PAID) {
    const planBlock = enSrc.slice(
      enSrc.indexOf(`${plan}: {`),
      enSrc.indexOf(`${plan}: {`) + 800,
    );
    const monthlyUi = parseUsdFromI18n(planBlock, "monthlyPrice");
    const yearlyUi = parseUsdFromI18n(planBlock, "yearlyPrice");
    const monthlyRef = PLAN_DEFINITIONS[plan].monthlyPriceUsd;
    const yearlyRef = PLAN_DEFINITIONS[plan].yearlyPriceUsd;

    if (monthlyUi !== monthlyRef) {
      console.error(`✗ ${plan} i18n monthly ${monthlyUi} != plans.ts ${monthlyRef}`);
      ok = false;
    }
    if (yearlyUi !== yearlyRef) {
      console.error(`✗ ${plan} i18n yearly display ${yearlyUi} != plans.ts ${yearlyRef}`);
      ok = false;
    }

    if (!isStripeConfigured()) continue;

    const stripe = getStripe();
    for (const interval of ["monthly", "yearly"] as const) {
      const priceId = priceIdForPlan(plan, interval);
      if (!priceId) {
        console.error(`✗ Missing env STRIPE_PRICE_${plan.toUpperCase()}_${interval.toUpperCase()}`);
        ok = false;
        continue;
      }
      const price = await stripe.prices.retrieve(priceId);
      const amount = (price.unit_amount ?? 0) / 100;
      const expected =
        interval === "monthly" ? monthlyRef! : (yearlyRef! * 12);
      const match = Math.abs(amount - expected) < 0.02;
      console.log(
        `${match ? "✓" : "✗"} ${plan} ${interval}: Stripe $${amount.toFixed(2)} vs expected $${expected.toFixed(2)} (${priceId})`,
      );
      if (!match) ok = false;
    }
  }

  if (isStripeConfigured()) {
    const topId = topUpPriceId();
    if (topId) {
      const price = await getStripe().prices.retrieve(topId);
      const amount = (price.unit_amount ?? 0) / 100;
      const match = Math.abs(amount - TOP_UP_PRICE_USD) < 0.02;
      console.log(
        `${match ? "✓" : "✗"} topup: Stripe $${amount.toFixed(2)} vs $${TOP_UP_PRICE_USD}`,
      );
      if (!match) ok = false;
    } else {
      console.error("✗ STRIPE_PRICE_TOPUP missing");
      ok = false;
    }
  } else {
    console.warn("⚠ STRIPE_SECRET_KEY not set — skipping live Stripe comparison");
  }

  console.log(ok ? "\nAudit passed.\n" : "\nAudit found mismatches — update Stripe Price IDs or i18n/plans.ts.\n");
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
