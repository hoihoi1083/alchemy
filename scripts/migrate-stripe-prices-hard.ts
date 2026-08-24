#!/usr/bin/env npx tsx
/**
 * Hard-migrate active Stripe subscriptions onto current catalog Price IDs
 * (from .env.local STRIPE_PRICE_*).
 *
 * Safe for test accounts: dry-run by default.
 *
 *   npx tsx scripts/migrate-stripe-prices-hard.ts
 *   npx tsx scripts/migrate-stripe-prices-hard.ts --apply
 *   npx tsx scripts/migrate-stripe-prices-hard.ts --apply --proration always_invoice
 *
 * Default proration: none (swap price now; next invoice uses new amount).
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
loadEnv();

import type Stripe from "stripe";
import {
  isPaidPlan,
  priceIdForPlan,
  planFromPriceId,
  type BillingInterval,
  type PaidPlan,
} from "../lib/stripe/prices";
import { getStripe, isStripeConfigured } from "../lib/stripe/client";

const APPLY = process.argv.includes("--apply");
const PRORATION: "none" | "always_invoice" = process.argv.includes(
  "--proration=always_invoice",
)
  ? "always_invoice"
  : "none";

/** Known historical unit amounts (cents) → plan guess when metadata is missing. */
const LEGACY_AMOUNT_HINTS: Array<{
  cents: number;
  interval: BillingInterval;
  plan: PaidPlan;
}> = [
  // Current catalog
  { cents: 1999, interval: "monthly", plan: "light" },
  { cents: 17988, interval: "yearly", plan: "light" },
  { cents: 4999, interval: "monthly", plan: "standard" },
  { cents: 47988, interval: "yearly", plan: "standard" },
  { cents: 9999, interval: "monthly", plan: "pro" },
  { cents: 95988, interval: "yearly", plan: "pro" },
  { cents: 16999, interval: "monthly", plan: "master" },
  { cents: 167988, interval: "yearly", plan: "master" },
  { cents: 24999, interval: "monthly", plan: "custom" },
  { cents: 239988, interval: "yearly", plan: "custom" },
  // Pre–Option A catalog (Standard/Pro/Master were one tier low)
  { cents: 1999, interval: "monthly", plan: "standard" }, // ambiguous with light
  { cents: 17988, interval: "yearly", plan: "standard" },
  { cents: 4999, interval: "monthly", plan: "pro" },
  { cents: 47999, interval: "yearly", plan: "pro" },
  { cents: 9999, interval: "monthly", plan: "master" },
  { cents: 94800, interval: "yearly", plan: "master" },
];

function intervalFromPrice(price: Stripe.Price): BillingInterval | null {
  const i = price.recurring?.interval;
  if (i === "month") return "monthly";
  if (i === "year") return "yearly";
  return null;
}

function resolveTarget(
  sub: Stripe.Subscription,
  price: Stripe.Price,
): {
  plan: PaidPlan;
  interval: BillingInterval;
  targetPriceId: string;
  source: string;
} | null {
  const interval = intervalFromPrice(price);
  if (!interval) return null;

  const metaPlan = sub.metadata?.plan?.trim();
  if (metaPlan && isPaidPlan(metaPlan)) {
    const targetPriceId = priceIdForPlan(metaPlan, interval);
    if (!targetPriceId) return null;
    return { plan: metaPlan, interval, targetPriceId, source: "metadata.plan" };
  }

  const fromEnv = planFromPriceId(price.id);
  if (fromEnv) {
    const targetPriceId = priceIdForPlan(fromEnv.plan, fromEnv.interval);
    if (!targetPriceId) return null;
    return {
      plan: fromEnv.plan,
      interval: fromEnv.interval,
      targetPriceId,
      source: "already_catalog",
    };
  }

  const cents = price.unit_amount ?? -1;
  const hints = LEGACY_AMOUNT_HINTS.filter(
    (h) => h.cents === cents && h.interval === interval,
  );
  if (hints.length === 1) {
    const plan = hints[0]!.plan;
    const targetPriceId = priceIdForPlan(plan, interval);
    if (!targetPriceId) return null;
    return { plan, interval, targetPriceId, source: "legacy_amount" };
  }
  if (hints.length > 1) {
    // Ambiguous (e.g. $19.99/mo was Light and old Standard) — prefer metadata only.
    return null;
  }
  return null;
}

async function main() {
  console.log("\n=== Hard migrate Stripe subscriptions → catalog prices ===\n");
  console.log(`Mode: ${APPLY ? "APPLY (live updates)" : "DRY-RUN (no changes)"}`);
  console.log(`Proration: ${PRORATION}\n`);

  if (!isStripeConfigured()) {
    console.error("STRIPE_SECRET_KEY missing — abort.");
    process.exit(1);
  }

  const stripe = getStripe();
  const catalog = (
    ["light", "standard", "pro", "master", "custom"] as PaidPlan[]
  ).flatMap((plan) =>
    (["monthly", "yearly"] as BillingInterval[]).map((interval) => ({
      plan,
      interval,
      id: priceIdForPlan(plan, interval),
    })),
  );
  const missing = catalog.filter((c) => !c.id);
  if (missing.length) {
    console.error("Missing env Price IDs:", missing);
    process.exit(1);
  }
  const catalogIds = new Set(catalog.map((c) => c.id!));

  let scanned = 0;
  let alreadyOk = 0;
  let wouldUpdate = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const status of ["active", "trialing", "past_due"] as const) {
    let startingAfter: string | undefined;
    for (;;) {
      const page = await stripe.subscriptions.list({
        status,
        limit: 100,
        starting_after: startingAfter,
        expand: ["data.items.data.price"],
      });
      for (const sub of page.data) {
        scanned++;
        const item = sub.items.data[0];
        const price =
          typeof item?.price === "string"
            ? await stripe.prices.retrieve(item.price)
            : item?.price;
        if (!item || !price) {
          console.warn(`⊘ ${sub.id} — no price item (${status})`);
          skipped++;
          continue;
        }

        if (catalogIds.has(price.id)) {
          alreadyOk++;
          console.log(`✓ ${sub.id} already on catalog ${price.id} (${status})`);
          continue;
        }

        const target = resolveTarget(sub, price);
        if (!target) {
          console.warn(
            `⊘ ${sub.id} — cannot map price ${price.id} ($${(
              (price.unit_amount ?? 0) / 100
            ).toFixed(2)} / ${price.recurring?.interval}). Set metadata.plan or skip.`,
          );
          skipped++;
          continue;
        }

        if (price.id === target.targetPriceId) {
          alreadyOk++;
          continue;
        }

        const line = `${sub.id} ${status}: ${price.id} → ${target.targetPriceId} (${target.plan}/${target.interval}, via ${target.source})`;
        wouldUpdate++;

        if (!APPLY) {
          console.log(`→ would update ${line}`);
          continue;
        }

        try {
          await stripe.subscriptions.update(sub.id, {
            items: [{ id: item.id, price: target.targetPriceId }],
            proration_behavior: PRORATION,
            metadata: {
              ...sub.metadata,
              plan: target.plan,
              interval: target.interval,
              migrated_to_catalog: new Date().toISOString(),
            },
          });
          updated++;
          console.log(`✓ updated ${line}`);
        } catch (e) {
          failed++;
          const msg = e instanceof Error ? e.message : String(e);
          console.error(`✗ failed ${sub.id}: ${msg}`);
        }
      }
      if (!page.has_more) break;
      startingAfter = page.data[page.data.length - 1]?.id;
      if (!startingAfter) break;
    }
  }

  console.log("\n--- Summary ---");
  console.log(`Scanned:     ${scanned}`);
  console.log(`Already OK:  ${alreadyOk}`);
  console.log(`Need update: ${wouldUpdate}`);
  if (APPLY) {
    console.log(`Updated:     ${updated}`);
    console.log(`Failed:      ${failed}`);
  } else {
    console.log(`(dry-run — re-run with --apply to migrate)`);
  }
  console.log(`Skipped:     ${skipped}\n`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
