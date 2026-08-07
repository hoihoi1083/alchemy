import {
  sendDowngradeScheduledEmail,
  sendSubscriptionEndedEmail,
  type SubscriptionEndedReason,
} from "@/lib/email/lifecycle";
import { sendPurchaseConfirmationEmail } from "@/lib/email/purchase-confirmation";
import { resolvePurchaseEmail } from "@/lib/email/resolve-user-email";
import {
  claimEmailLockOnce,
  releaseEmailLock,
} from "@/lib/stripe/billing-sync";
import type { PaidPlan } from "@/lib/stripe/prices";

/**
 * Send a lifecycle/purchase email at most once per ref (Stripe event / invoice / upgrade).
 */
export async function sendLockedEmail(opts: {
  ref: string;
  clerkId: string;
  reason: string;
  stripeEmail?: string | null;
  send: (to: string) => Promise<{ sent: boolean; skipped?: string; error?: string; id?: string }>;
}): Promise<boolean> {
  const claimed = await claimEmailLockOnce(opts.ref, opts.clerkId, opts.reason);
  if (!claimed) {
    console.info("[email] already sent", { ref: opts.ref, reason: opts.reason });
    return false;
  }
  const to = await resolvePurchaseEmail({
    clerkId: opts.clerkId,
    stripeEmail: opts.stripeEmail,
  });
  if (!to) {
    console.warn("[email] skipped — no recipient", {
      ref: opts.ref,
      clerkId: opts.clerkId,
      reason: opts.reason,
    });
    await releaseEmailLock(opts.ref);
    return false;
  }
  const result = await opts.send(to);
  if (!result.sent) {
    console.error("[email] send failed — releasing lock for retry", {
      ref: opts.ref,
      to,
      skipped: result.skipped,
      error: result.error,
    });
    await releaseEmailLock(opts.ref);
    return false;
  }
  console.info("[email] sent", { ref: opts.ref, to, id: result.id, reason: opts.reason });
  return true;
}

export async function notifySubscriptionEndedOnce(opts: {
  clerkId: string;
  reason: Exclude<SubscriptionEndedReason, "payment_failed">;
  subscriptionId: string;
  stripeEmail?: string | null;
}): Promise<void> {
  await sendLockedEmail({
    ref: `email_sub_ended_${opts.subscriptionId}`,
    clerkId: opts.clerkId,
    reason: `subscription_ended_${opts.reason}`,
    stripeEmail: opts.stripeEmail,
    send: (to) => sendSubscriptionEndedEmail({ to, reason: opts.reason }),
  });
}

export async function notifyPaymentFailedOnce(opts: {
  clerkId: string;
  invoiceId: string;
  stripeEmail?: string | null;
}): Promise<void> {
  await sendLockedEmail({
    ref: `email_payment_failed_${opts.invoiceId}`,
    clerkId: opts.clerkId,
    reason: "payment_failed",
    stripeEmail: opts.stripeEmail,
    send: (to) => sendSubscriptionEndedEmail({ to, reason: "payment_failed" }),
  });
}

export async function notifyUpgradeReceiptOnce(opts: {
  clerkId: string;
  subscriptionId: string;
  periodStart: number;
  plan: PaidPlan;
  tokensGranted: number;
  balanceAfter: number | null;
  renewsAt?: Date | null;
  amountLabel?: string | null;
  stripeEmail?: string | null;
}): Promise<void> {
  await sendLockedEmail({
    ref: `email_upgrade_${opts.subscriptionId}_${opts.plan}_${opts.periodStart}`,
    clerkId: opts.clerkId,
    reason: "upgrade_receipt",
    stripeEmail: opts.stripeEmail,
    send: (to) =>
      sendPurchaseConfirmationEmail({
        to,
        kind: "subscription",
        plan: opts.plan,
        tokensGranted: opts.tokensGranted,
        balanceAfter: opts.balanceAfter,
        renewsAt: opts.renewsAt,
        amountLabel: opts.amountLabel,
      }),
  });
}

export async function notifyDowngradeScheduledOnce(opts: {
  clerkId: string;
  subscriptionId: string;
  currentPlan: PaidPlan;
  pendingPlan: PaidPlan;
  effectiveAt: Date;
  stripeEmail?: string | null;
}): Promise<void> {
  const day = opts.effectiveAt.toISOString().slice(0, 10);
  await sendLockedEmail({
    ref: `email_downgrade_${opts.subscriptionId}_${opts.pendingPlan}_${day}`,
    clerkId: opts.clerkId,
    reason: "downgrade_scheduled",
    stripeEmail: opts.stripeEmail,
    send: (to) =>
      sendDowngradeScheduledEmail({
        to,
        currentPlan: opts.currentPlan,
        pendingPlan: opts.pendingPlan,
        effectiveAt: opts.effectiveAt,
      }),
  });
}
