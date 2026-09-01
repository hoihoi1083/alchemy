import type Stripe from "stripe";
import {
  comparePaidPlans,
  isBillingInterval,
  isPaidPlan,
  planFromPriceId,
  type BillingInterval,
  type PaidPlan,
} from "@/lib/stripe/prices";

export type SwitchEffective = "immediate" | "next_cycle" | "unchanged";

export type SwitchSubscriptionResult = {
  subscriptionId: string;
  renewsAt: Date | null;
  effective: SwitchEffective;
  /** Plan the customer is entitled to right now (unchanged on deferred downgrade). */
  activePlan: PaidPlan;
  activeInterval: BillingInterval;
  /** Plan before this switch (for upgrade token grant). */
  previousPlan: PaidPlan;
  previousInterval: BillingInterval;
  /** Billing period start (unix) — after upgrade reset, this is the new period. */
  periodStart: number | null;
  /** Set when a downgrade is scheduled for period end. */
  pendingPlan: PaidPlan | null;
  pendingInterval: BillingInterval | null;
  pendingEffectiveAt: Date | null;
};

function scheduleIdOf(sub: Stripe.Subscription): string | null {
  const raw = sub.schedule;
  if (!raw) return null;
  if (typeof raw === "string") return raw;
  return raw.id ?? null;
}

async function releaseScheduleIfAny(
  stripe: Stripe,
  sub: Stripe.Subscription,
): Promise<void> {
  const id = scheduleIdOf(sub);
  if (!id) return;
  try {
    await stripe.subscriptionSchedules.release(id);
  } catch (e: unknown) {
    console.warn(
      "[stripe] release schedule failed (may already be released)",
      id,
      e instanceof Error ? e.message : e,
    );
  }
}

/**
 * Defer a lower-tier price to the next billing period via Subscription Schedule.
 * Keeps current price + entitlements until period end — closes the
 * "pay Standard, keep Master tokens" loophole from immediate prorated downgrades.
 *
 * Important: once a subscription is schedule-managed, Stripe rejects most
 * `subscriptions.update` calls. Set metadata / clear cancel_at_period_end
 * *before* creating the schedule, then only touch the schedule.
 */
async function scheduleDowngradeAtPeriodEnd(opts: {
  stripe: Stripe;
  clerkId: string;
  primary: Stripe.Subscription;
  currentPlan: PaidPlan;
  currentInterval: BillingInterval;
  currentPriceId: string;
  periodStart: number;
  periodEnd: number;
  plan: PaidPlan;
  interval: BillingInterval;
  price: string;
}): Promise<SwitchSubscriptionResult> {
  const {
    stripe,
    clerkId,
    primary,
    currentPlan,
    currentInterval,
    plan,
    interval,
    price,
  } = opts;

  // Drop any prior schedule so we can update subscription metadata safely.
  await releaseScheduleIfAny(stripe, primary);
  const live = await stripe.subscriptions.retrieve(primary.id);

  const item = live.items.data[0];
  const periodStart = item?.current_period_start ?? opts.periodStart;
  const periodEnd = item?.current_period_end ?? opts.periodEnd;
  const currentPriceId =
    (typeof item?.price === "string" ? item.price : item?.price?.id) ??
    opts.currentPriceId;
  if (!periodStart || !periodEnd || !currentPriceId) {
    throw new Error("Active subscription missing billing period or price.");
  }

  // While unmanaged: clear portal cancel-at-period-end and stamp pending plan.
  await stripe.subscriptions.update(live.id, {
    cancel_at_period_end: false,
    metadata: {
      ...live.metadata,
      clerkId,
      plan: currentPlan,
      interval: currentInterval,
      pendingPlan: plan,
      pendingInterval: interval,
    },
  });

  const schedule = await stripe.subscriptionSchedules.create({
    from_subscription: live.id,
  });
  const phase0Start =
    schedule.current_phase?.start_date ??
    schedule.phases[0]?.start_date ??
    periodStart;

  await stripe.subscriptionSchedules.update(schedule.id, {
    end_behavior: "release",
    phases: [
      {
        items: [{ price: currentPriceId, quantity: 1 }],
        start_date: phase0Start,
        end_date: periodEnd,
        proration_behavior: "none",
        metadata: {
          clerkId,
          plan: currentPlan,
          interval: currentInterval,
          pendingPlan: plan,
          pendingInterval: interval,
        },
      },
      {
        items: [{ price, quantity: 1 }],
        duration: {
          interval: interval === "yearly" ? "year" : "month",
          interval_count: 1,
        },
        proration_behavior: "none",
        metadata: {
          clerkId,
          plan,
          interval,
          pendingPlan: "",
          pendingInterval: "",
        },
      },
    ],
  });

  const effectiveAt = new Date(periodEnd * 1000);
  return {
    subscriptionId: live.id,
    renewsAt: effectiveAt,
    effective: "next_cycle",
    activePlan: currentPlan,
    activeInterval: currentInterval,
    previousPlan: currentPlan,
    previousInterval: currentInterval,
    periodStart,
    pendingPlan: plan,
    pendingInterval: interval,
    pendingEffectiveAt: effectiveAt,
  };
}

async function ensureCustomerDefaultPaymentMethod(
  stripe: Stripe,
  customerId: string,
  sub: Stripe.Subscription,
): Promise<string | null> {
  const fromSub =
    typeof sub.default_payment_method === "string"
      ? sub.default_payment_method
      : sub.default_payment_method?.id ?? null;
  if (!fromSub) return null;

  try {
    const customer = await stripe.customers.retrieve(customerId);
    if ("deleted" in customer && customer.deleted) return fromSub;
    const current = customer.invoice_settings?.default_payment_method;
    const currentId =
      typeof current === "string" ? current : current?.id ?? null;
    if (currentId === fromSub) return fromSub;
    await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: fromSub },
    });
  } catch (e: unknown) {
    console.warn(
      "[stripe] could not sync customer default_payment_method",
      customerId,
      e instanceof Error ? e.message : e,
    );
  }
  return fromSub;
}

/** Stripe rejects cancel_at_period_end on the same update as pending_if_incomplete. */
async function clearCancelAtPeriodEndIfSet(
  stripe: Stripe,
  sub: Stripe.Subscription,
): Promise<void> {
  if (!sub.cancel_at_period_end) return;
  await stripe.subscriptions.update(sub.id, {
    cancel_at_period_end: false,
  });
}

async function applyImmediatePlanChange(opts: {
  stripe: Stripe;
  clerkId: string;
  primary: Stripe.Subscription;
  itemId: string;
  plan: PaidPlan;
  interval: BillingInterval;
  price: string;
  previousPlan: PaidPlan;
  previousInterval: BillingInterval;
  periodStart: number;
  /** Upgrades restart the billing period today; lateral interval switches keep the anchor. */
  resetBillingCycle: boolean;
}): Promise<SwitchSubscriptionResult> {
  const {
    stripe,
    clerkId,
    primary,
    itemId,
    plan,
    interval,
    price,
    previousPlan,
    previousInterval,
    periodStart,
    resetBillingCycle,
  } = opts;

  // Drop any deferred downgrade so the upgrade (or lateral switch) wins now.
  await releaseScheduleIfAny(stripe, primary);

  const customerId =
    typeof primary.customer === "string"
      ? primary.customer
      : primary.customer?.id;
  // Sync PM onto the customer only — do NOT pass default_payment_method on the
  // subscription.update when payment_behavior=pending_if_incomplete (Stripe
  // rejects unsupported params and our catch was mislabeling that as a card decline).
  if (customerId) {
    await ensureCustomerDefaultPaymentMethod(stripe, customerId, primary);
  }

  // Same restriction as default_payment_method — clear in a separate call first.
  await clearCancelAtPeriodEndIfSet(stripe, primary);

  // Money-critical:
  // - always_invoice → create + attempt payment on the proration/cycle-reset invoice now
  // - pending_if_incomplete → do NOT apply the plan change if payment fails / needs action
  // Without these, Stripe can leave the sub upgraded while the card declines, and we
  // must never grant tokens before payment succeeds.
  let updated: Stripe.Subscription;
  try {
    updated = await stripe.subscriptions.update(primary.id, {
      items: [{ id: itemId, price }],
      metadata: {
        ...primary.metadata,
        clerkId,
        plan,
        interval,
        previousPlan,
        pendingPlan: "",
        pendingInterval: "",
      },
      ...(resetBillingCycle ? { billing_cycle_anchor: "now" as const } : {}),
      proration_behavior: "always_invoice",
      payment_behavior: "pending_if_incomplete",
      expand: ["latest_invoice", "latest_invoice.payment_intent"],
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    const code =
      e && typeof e === "object" && "code" in e
        ? String((e as { code?: unknown }).code ?? "")
        : "";
    const type =
      e && typeof e === "object" && "type" in e
        ? String((e as { type?: unknown }).type ?? "")
        : "";
    // Do not treat StripeInvalidRequestError (bad params) as a card decline.
    if (type === "StripeInvalidRequestError") {
      console.error("[stripe] upgrade invalid request:", msg);
      throw e;
    }
    if (
      /card|declined|insufficient|authentication_required|incomplete/i.test(msg) ||
      /card_declined|authentication_required/i.test(code)
    ) {
      const err = new Error(
        "PAYMENT_INCOMPLETE: Card was declined or needs authentication. Update your card in Manage billing, then try the upgrade again.",
      );
      err.name = "PaymentIncompleteError";
      throw err;
    }
    throw e;
  }

  if (updated.pending_update) {
    console.warn("[stripe] upgrade left pending_update", {
      subscriptionId: updated.id,
      clerkId,
      plan,
    });
    const err = new Error(
      "PAYMENT_INCOMPLETE: Card was declined or needs authentication. Update your card in Manage billing, then try the upgrade again.",
    );
    err.name = "PaymentIncompleteError";
    throw err;
  }

  const latestInvoice = updated.latest_invoice;
  const invoiceObj =
    latestInvoice && typeof latestInvoice !== "string" ? latestInvoice : null;
  const invoiceStatus = invoiceObj?.status ?? null;
  type InvoiceWithExpandedPi = Stripe.Invoice & {
    payment_intent?: Stripe.PaymentIntent | string | null;
  };
  const expandedInvoice = invoiceObj as InvoiceWithExpandedPi | null;
  const pi =
    expandedInvoice?.payment_intent &&
    typeof expandedInvoice.payment_intent !== "string"
      ? expandedInvoice.payment_intent
      : null;
  // open / uncollectible means we did not collect — treat as failure (should be rare
  // with pending_if_incomplete, but belt-and-suspenders for money safety).
  if (invoiceStatus === "open" || invoiceStatus === "uncollectible") {
    console.warn("[stripe] upgrade invoice unpaid", {
      subscriptionId: updated.id,
      invoiceStatus,
      paymentIntentStatus: pi?.status ?? null,
      lastError: pi?.last_payment_error?.message ?? null,
    });
    const err = new Error(
      "PAYMENT_INCOMPLETE: Upgrade invoice was not paid. Update your card in Manage billing, then try again.",
    );
    err.name = "PaymentIncompleteError";
    throw err;
  }

  const newPeriodStart =
    updated.items.data[0]?.current_period_start ?? periodStart;
  const periodEnd = updated.items.data[0]?.current_period_end ?? null;
  return {
    subscriptionId: updated.id,
    renewsAt: periodEnd ? new Date(periodEnd * 1000) : null,
    effective: "immediate",
    activePlan: plan,
    activeInterval: interval,
    previousPlan,
    previousInterval,
    periodStart: newPeriodStart,
    pendingPlan: null,
    pendingInterval: null,
    pendingEffectiveAt: null,
  };
}

/**
 * One paid subscription per customer.
 * Upgrades: immediate, billing cycle resets to now, full new-plan token grant.
 * Lateral interval switches: immediate proration, same cycle anchor.
 * Downgrades: deferred to next cycle via subscription schedule.
 */
export async function switchExistingSubscription(opts: {
  stripe: Stripe;
  clerkId: string;
  customerId: string;
  preferredSubId: string | null | undefined;
  plan: PaidPlan;
  interval: BillingInterval;
  price: string;
  listBillable: (customerId: string) => Promise<Stripe.Subscription[]>;
}): Promise<SwitchSubscriptionResult> {
  const billable = await opts.listBillable(opts.customerId);
  if (!billable.length) {
    throw new Error("NO_ACTIVE_SUB");
  }

  const primary =
    billable.find((sub) => sub.id === opts.preferredSubId) ??
    [...billable].sort((a, b) => (b.created ?? 0) - (a.created ?? 0))[0];

  for (const extra of billable) {
    if (extra.id === primary.id) continue;
    try {
      await opts.stripe.subscriptions.cancel(extra.id, {
        invoice_now: false,
        prorate: true,
      });
    } catch (e: unknown) {
      console.error(
        "[stripe] failed to cancel duplicate subscription",
        extra.id,
        e instanceof Error ? e.message : e,
      );
    }
  }

  const item = primary.items.data[0];
  const itemId = item?.id;
  const currentPriceId =
    typeof item?.price === "string" ? item.price : item?.price?.id;
  if (!itemId || !currentPriceId) {
    throw new Error("Active subscription has no price item.");
  }

  const periodEnd = item.current_period_end;
  const periodStart = item.current_period_start;
  if (!periodEnd || !periodStart) {
    throw new Error("Active subscription missing billing period.");
  }

  const currentFromPrice = planFromPriceId(currentPriceId);
  if (!currentFromPrice) {
    throw new Error("Active subscription price is not a known Alchemy plan.");
  }

  if (currentPriceId === opts.price) {
    const pendingRaw = primary.metadata?.pendingPlan;
    const pendingPlan =
      pendingRaw && isPaidPlan(pendingRaw) ? pendingRaw : null;
    const pendingIntervalRaw = primary.metadata?.pendingInterval;
    const pendingInterval =
      pendingIntervalRaw && isBillingInterval(pendingIntervalRaw)
        ? pendingIntervalRaw
        : null;
    // Same price requested — if they had a pending downgrade away from this
    // price, leave it; otherwise report unchanged.
    return {
      subscriptionId: primary.id,
      renewsAt: new Date(periodEnd * 1000),
      effective: pendingPlan ? "next_cycle" : "unchanged",
      activePlan: currentFromPrice.plan,
      activeInterval: currentFromPrice.interval,
      previousPlan: currentFromPrice.plan,
      previousInterval: currentFromPrice.interval,
      periodStart,
      pendingPlan,
      pendingInterval,
      pendingEffectiveAt: pendingPlan ? new Date(periodEnd * 1000) : null,
    };
  }

  const kind = comparePaidPlans(currentFromPrice.plan, opts.plan);

  if (kind === "downgrade") {
    return scheduleDowngradeAtPeriodEnd({
      stripe: opts.stripe,
      clerkId: opts.clerkId,
      primary,
      currentPlan: currentFromPrice.plan,
      currentInterval: currentFromPrice.interval,
      currentPriceId,
      periodStart,
      periodEnd,
      plan: opts.plan,
      interval: opts.interval,
      price: opts.price,
    });
  }

  return applyImmediatePlanChange({
    stripe: opts.stripe,
    clerkId: opts.clerkId,
    primary,
    itemId,
    plan: opts.plan,
    interval: opts.interval,
    price: opts.price,
    previousPlan: currentFromPrice.plan,
    previousInterval: currentFromPrice.interval,
    periodStart,
    resetBillingCycle: kind === "upgrade",
  });
}
