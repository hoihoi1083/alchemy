/**
 * Pro trial billing contracts — grant order, idempotency, webhook $0 skip.
 *
 *   npx tsx --test tests/pro-trial-billing.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  FREE_SIGNUP_GRANT_TOKENS,
  PRO_TRIAL_BONUS_TOKENS,
  PRO_TRIAL_DAYS,
} from "../lib/billing/plans";

const fulfillSrc = readFileSync(
  join(process.cwd(), "lib/stripe/fulfill-checkout.ts"),
  "utf8",
);
const webhookSrc = readFileSync(
  join(process.cwd(), "app/api/stripe/webhook/route.ts"),
  "utf8",
);
const checkoutSrc = readFileSync(
  join(process.cwd(), "app/api/stripe/checkout/route.ts"),
  "utf8",
);
const cancelSrc = readFileSync(
  join(process.cwd(), "app/api/stripe/cancel-subscription/route.ts"),
  "utf8",
);

describe("Pro trial plan constants", () => {
  it("signup grant is 300 and trial bonus is +700 for 7 days", () => {
    assert.equal(FREE_SIGNUP_GRANT_TOKENS, 300);
    assert.equal(PRO_TRIAL_BONUS_TOKENS, 700);
    assert.equal(PRO_TRIAL_DAYS, 7);
    assert.equal(
      FREE_SIGNUP_GRANT_TOKENS + PRO_TRIAL_BONUS_TOKENS,
      1000,
      "trial should bring free user to ~1000 tokens",
    );
  });
});

describe("Pro trial checkout API", () => {
  it("uses Pro monthly price with 7-day trial and card required", () => {
    assert.match(checkoutSrc, /kind === "pro_trial"/);
    assert.match(checkoutSrc, /priceIdForPlan\("pro", "monthly"\)/);
    assert.match(checkoutSrc, /trial_period_days:\s*PRO_TRIAL_DAYS/);
    assert.match(checkoutSrc, /payment_method_collection:\s*"always"/);
  });

  it("blocks non-free users and repeat trial", () => {
    assert.match(checkoutSrc, /Pro trial is only for Free accounts/);
    assert.match(checkoutSrc, /You already used the Pro trial/);
    assert.match(checkoutSrc, /hasUsedProTrial/);
  });
});

describe("Pro trial fulfill-checkout", () => {
  it("bonus idempotency ref is per clerkId (not per session)", () => {
    assert.match(fulfillSrc, /pro_trial_bonus_\$\{clerkId\}/);
    assert.doesNotMatch(fulfillSrc, /pro_trial_bonus_\$\{session/);
  });

  it("re-validates eligibility at fulfill time", () => {
    assert.match(fulfillSrc, /assertProTrialFulfillEligible/);
    assert.match(fulfillSrc, /trial_not_eligible_plan/);
    assert.match(fulfillSrc, /trial_already_used/);
    assert.match(fulfillSrc, /trial_not_trialing/);
    assert.match(fulfillSrc, /trial_not_eligible_no_sub/);
  });

  it("grants +700 before upgrading plan", () => {
    const bonusIdx = fulfillSrc.indexOf("grantTokensOnce");
    const planIdx = fulfillSrc.indexOf("setUserSubscription", bonusIdx);
    assert.ok(bonusIdx > 0 && planIdx > bonusIdx, "bonus grant must precede setUserSubscription");
    assert.match(fulfillSrc, /PRO_TRIAL_BONUS_TOKENS/);
    assert.match(fulfillSrc, /markProTrialUsed/);
  });

  it("does not upgrade plan when bonus grant fails", () => {
    assert.match(fulfillSrc, /trial_bonus_failed/);
    assert.match(fulfillSrc, /bonus grant failed — plan not upgraded/);
  });
});

describe("Pro trial webhook invoice.paid", () => {
  it("skips monthly token grant on $0 trial setup invoices only", () => {
    assert.match(webhookSrc, /amount_paid/);
    assert.match(webhookSrc, /skip token grant for \$0 trial setup invoice/);
    assert.match(webhookSrc, /subscription_create/);
    assert.match(webhookSrc, /markProTrialUsed/);
    const skipBlock = webhookSrc.indexOf("skip token grant for $0 trial setup invoice");
    const applyGrant = webhookSrc.indexOf("await applySubscriptionGrant({");
    assert.ok(skipBlock > 0 && applyGrant > skipBlock);
  });

  it("marks Pro trial used from subscription.updated when trialing", () => {
    assert.match(webhookSrc, /sub\.status === "trialing"/);
    assert.match(webhookSrc, /markProTrialUsed/);
  });

  it("clears proTrialEndsAt on first paid invoice grant", () => {
    assert.match(webhookSrc, /proTrialEndsAt:\s*null/);
    const clearIdx = webhookSrc.indexOf("proTrialEndsAt: null");
    const grantIdx = webhookSrc.indexOf("applySubscriptionGrant");
    assert.ok(clearIdx > grantIdx, "clear trial end after paid grant path");
  });
});

describe("Pro trial cancel from Account", () => {
  it("cancels trialing subs immediately and keeps tokens", () => {
    assert.match(cancelSrc, /sub\.status === "trialing"/);
    assert.match(cancelSrc, /markProTrialUsed/);
    assert.match(cancelSrc, /subscriptions\.cancel/);
    assert.match(cancelSrc, /mode:\s*"trial_canceled"/);
    assert.match(cancelSrc, /remaining tokens kept/);
  });

  it("schedules paid subs at period end", () => {
    assert.match(cancelSrc, /cancel_at_period_end:\s*true/);
    assert.match(cancelSrc, /mode:\s*"cancel_at_period_end"/);
  });
});
