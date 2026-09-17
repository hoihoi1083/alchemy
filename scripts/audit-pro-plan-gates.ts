/**
 * Pro-plan entitlement audit for a live clerkId (Mongo-backed).
 *   npx tsx scripts/audit-pro-plan-gates.ts --clerk user_xxx
 */
import { existsSync, readFileSync } from "node:fs";

function loadEnv() {
  if (!existsSync(".env.local")) return;
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m && !process.env[m[1].trim()]) {
      process.env[m[1].trim()] = m[2].trim().replace(/^"|"$/g, "");
    }
  }
}

function argValue(flag: string): string | null {
  const i = process.argv.indexOf(flag);
  if (i === -1 || i + 1 >= process.argv.length) return null;
  return process.argv[i + 1]?.trim() || null;
}

async function main() {
  loadEnv();
  const clerkId =
    argValue("--clerk") || "user_3Ihq493aOsZssQ8Fc2BFnANolRc";

  const { getDb } = await import("../lib/mongodb");
  const { getUserPlan } = await import("../lib/billing/get-user-plan");
  const {
    canUseCarousel,
    canUsePlatformResearch,
    canUseStoryboard,
    canUseVideoResolution,
    canUseImageResolution,
    canUseTemplate,
    planMeetsMinimum,
    minPlanForFeature,
    hasPriorityQueue,
  } = await import("../lib/billing/plan-gates");
  const { canUseProCanvas, videoCapForPlan, imageCapForPlan } = await import(
    "../lib/billing/entitlements"
  );
  const { isInternalUnlimitedUser } = await import(
    "../lib/billing/internal-unlimited"
  );
  const { assertPlatformResearchAllowed } = await import(
    "../lib/billing/assert-platform-research"
  );
  const { assertProCanvasAllowedForUser } = await import(
    "../lib/billing/assert-pro-canvas"
  );
  const {
    PLAN_DEFINITIONS,
    PRO_TRIAL_BONUS_TOKENS,
    FREE_SIGNUP_GRANT_TOKENS,
  } = await import("../lib/billing/plans");

  const db = await getDb();
  const user = await db.collection("users").findOne({ clerkId });
  if (!user) {
    console.error("User not found:", clerkId);
    process.exit(1);
  }

  const plan = await getUserPlan(clerkId);
  const unlimited = await isInternalUnlimitedUser(clerkId);
  const researchGate = await assertPlatformResearchAllowed(clerkId);
  const ultraGate = await assertProCanvasAllowedForUser(clerkId);

  const txs = await db
    .collection("credit_transactions")
    .find({ clerkId })
    .sort({ createdAt: -1 })
    .limit(12)
    .toArray();

  console.log("\n=== Pro plan audit (pricing card) ===");
  console.log({
    clerkId,
    email: user.email,
    mongoPlan: user.plan,
    effectivePlan: plan,
    creditBalance: user.creditBalance,
    hasUsedProTrial: Boolean(user.hasUsedProTrial),
    proTrialEndsAt: user.proTrialEndsAt ?? null,
    stripeCustomerId: user.stripeCustomerId ?? null,
    stripeSubscriptionId: user.stripeSubscriptionId ?? null,
    stripeSubscriptionStatus: user.stripeSubscriptionStatus ?? null,
    internalUnlimited: unlimited,
  });

  console.log("\nRecent credit_transactions:");
  for (const t of txs) {
    console.log({
      type: t.type,
      amount: t.amount,
      balanceAfter: t.balanceAfter,
      ref: t.ref ?? t.idempotencyKey ?? null,
      createdAt: t.createdAt,
    });
  }

  type Check = { name: string; ok: boolean; detail: string };
  const checks: Check[] = [];
  const expectAllowed = (name: string, allowed: boolean) => {
    checks.push({
      name,
      ok: allowed === true,
      detail: allowed ? "allowed" : "BLOCKED (should be allowed on Pro)",
    });
  };
  const expectBlocked = (name: string, allowed: boolean) => {
    checks.push({
      name,
      ok: allowed === false,
      detail: allowed ? "ALLOWED (should stay Master+)" : "blocked",
    });
  };

  checks.push({
    name: "effective plan is pro",
    ok: plan === "pro",
    detail: `plan=${plan}`,
  });
  checks.push({
    name: "hasUsedProTrial marked",
    ok: Boolean(user.hasUsedProTrial),
    detail: `hasUsedProTrial=${Boolean(user.hasUsedProTrial)}`,
  });
  const trialEnd =
    user.proTrialEndsAt instanceof Date
      ? user.proTrialEndsAt
      : user.proTrialEndsAt
        ? new Date(user.proTrialEndsAt)
        : null;
  checks.push({
    name: "proTrialEndsAt in the future (active trial)",
    ok: Boolean(trialEnd && trialEnd.getTime() > Date.now()),
    detail: trialEnd ? trialEnd.toISOString() : "null",
  });
  checks.push({
    name: "stripe subscription present",
    ok: Boolean(user.stripeSubscriptionId),
    detail: String(user.stripeSubscriptionId ?? null),
  });
  // Status may be null until subscription.updated syncs; Stripe source of truth is used below via plan + trial end.
  if (user.stripeSubscriptionStatus != null) {
    checks.push({
      name: "subscription status trialing (or active)",
      ok:
        user.stripeSubscriptionStatus === "trialing" ||
        user.stripeSubscriptionStatus === "active",
      detail: String(user.stripeSubscriptionStatus),
    });
  } else {
    checks.push({
      name: "subscription status field (optional; Stripe may lag)",
      ok: true,
      detail: "null in Mongo — ok if plan=pro + proTrialEndsAt set",
    });
  }

  // Pricing card Pro: storyboard, research, carousel, A/B (via templates), 1080p video, 1K image
  expectAllowed("storyboard", canUseStoryboard(plan));
  expectAllowed("carousel", canUseCarousel(plan));
  expectAllowed("platform research", canUsePlatformResearch(plan));
  expectAllowed("campaign_mode", planMeetsMinimum(plan, minPlanForFeature("campaign_mode")));
  expectAllowed("video 480p", canUseVideoResolution(plan, "480p"));
  expectAllowed("video 720p", canUseVideoResolution(plan, "720p"));
  expectAllowed("video 1080p", canUseVideoResolution(plan, "1080p"));
  expectAllowed("image 1K", canUseImageResolution(plan, "1K"));
  expectAllowed("top-up", planMeetsMinimum(plan, minPlanForFeature("top_up")));
  expectAllowed("priority queue", hasPriorityQueue(plan));
  expectAllowed("template storyboard-video", canUseTemplate(plan, "storyboard-video"));
  expectAllowed("template creative-video", canUseTemplate(plan, "creative-video"));
  expectAllowed("template brand-campaign", canUseTemplate(plan, "brand-campaign"));
  expectAllowed("template shop-promo", canUseTemplate(plan, "shop-promo"));

  // Master+ only per pricing card
  expectBlocked("image 2K (Master+)", canUseImageResolution(plan, "2K"));
  expectBlocked("image 4K (Master+)", canUseImageResolution(plan, "4K"));
  expectBlocked("Ultra / pro canvas (Master+)", canUseProCanvas(plan));

  checks.push({
    name: "API platform research allowed (null gate)",
    ok: researchGate == null,
    detail: researchGate ? `status ${researchGate.status}` : "null (allowed)",
  });
  checks.push({
    name: "API Ultra still blocked (403)",
    ok: ultraGate?.status === 403,
    detail: ultraGate
      ? `status ${ultraGate.status}`
      : "null (would allow — FAIL for Pro)",
  });

  const videoCap = videoCapForPlan(plan);
  const imageCap = imageCapForPlan(plan);
  checks.push({
    name: "video cap is 1080p (pricing card)",
    ok: videoCap === "1080p",
    detail: `cap=${videoCap}`,
  });
  checks.push({
    name: "image cap is 1K (pricing card)",
    ok: imageCap === "1K",
    detail: `cap=${imageCap}`,
  });
  checks.push({
    name: "PLAN_DEFINITIONS.pro matches card (16k / 1080p / 1K / no ultra)",
    ok:
      PLAN_DEFINITIONS.pro.monthlyTokens === 16000 &&
      PLAN_DEFINITIONS.pro.maxVideoResolution === "1080p" &&
      PLAN_DEFINITIONS.pro.maxImageResolution === "1K" &&
      PLAN_DEFINITIONS.pro.proCanvas === false &&
      PLAN_DEFINITIONS.pro.canTopUp === true,
    detail: JSON.stringify({
      monthlyTokens: PLAN_DEFINITIONS.pro.monthlyTokens,
      maxVideoResolution: PLAN_DEFINITIONS.pro.maxVideoResolution,
      maxImageResolution: PLAN_DEFINITIONS.pro.maxImageResolution,
      proCanvas: PLAN_DEFINITIONS.pro.proCanvas,
      canTopUp: PLAN_DEFINITIONS.pro.canTopUp,
    }),
  });

  // Balance sanity: trial bonus 700; 870 ≈ spent some after ~1000
  const bal = user.creditBalance ?? 0;
  checks.push({
    name: `balance >= trial bonus floor (${PRO_TRIAL_BONUS_TOKENS})`,
    ok: bal >= PRO_TRIAL_BONUS_TOKENS,
    detail: `balance=${bal}; signup was ${FREE_SIGNUP_GRANT_TOKENS}, trial +${PRO_TRIAL_BONUS_TOKENS}`,
  });

  console.log("\n--- Gate checks (vs Pro pricing card) ---");
  let failed = 0;
  for (const c of checks) {
    const mark = c.ok ? "✓" : "✗";
    if (!c.ok) failed += 1;
    console.log(`${mark} ${c.name}: ${c.detail}`);
  }
  console.log(
    failed === 0
      ? `\nPASS: ${checks.length} checks — Pro entitlements match pricing card`
      : `\nFAIL: ${failed}/${checks.length} checks failed`,
  );
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
