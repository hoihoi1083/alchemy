/**
 * Standard-plan entitlement audit for a live clerkId (Mongo-backed).
 *   npx tsx scripts/audit-standard-plan-gates.ts --clerk user_xxx
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
    hasEmailSupport,
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
  const { PLAN_DEFINITIONS } = await import("../lib/billing/plans");

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

  console.log("\n=== Standard plan audit (pricing card) ===");
  console.log({
    clerkId,
    email: user.email,
    mongoPlan: user.plan,
    effectivePlan: plan,
    creditBalance: user.creditBalance,
    hasUsedProTrial: Boolean(user.hasUsedProTrial),
    stripeCustomerId: user.stripeCustomerId ?? null,
    stripeSubscriptionId: user.stripeSubscriptionId ?? null,
    planRenewsAt: user.planRenewsAt ?? null,
    internalUnlimited: unlimited,
  });

  type Check = { name: string; ok: boolean; detail: string };
  const checks: Check[] = [];
  const expectAllowed = (name: string, allowed: boolean) => {
    checks.push({
      name,
      ok: allowed === true,
      detail: allowed ? "allowed" : "BLOCKED (should be allowed on Standard)",
    });
  };
  const expectBlocked = (name: string, allowed: boolean) => {
    checks.push({
      name,
      ok: allowed === false,
      detail: allowed ? "ALLOWED (should be higher tier)" : "blocked",
    });
  };

  checks.push({
    name: "effective plan is standard",
    ok: plan === "standard",
    detail: `plan=${plan}`,
  });
  checks.push({
    name: "balance ~10756 (kept 2756 + Standard 8000)",
    ok: (user.creditBalance ?? 0) >= 10000 && (user.creditBalance ?? 0) <= 12000,
    detail: `balance=${user.creditBalance}`,
  });

  // Pricing card Standard: 720p, 1K, carousel, research, campaign, top-ups
  expectAllowed("video 480p", canUseVideoResolution(plan, "480p"));
  expectAllowed("video 720p", canUseVideoResolution(plan, "720p"));
  expectAllowed("image 1K", canUseImageResolution(plan, "1K"));
  expectAllowed("carousel", canUseCarousel(plan));
  expectAllowed("platform research", canUsePlatformResearch(plan));
  expectAllowed(
    "campaign_mode",
    planMeetsMinimum(plan, minPlanForFeature("campaign_mode")),
  );
  expectAllowed("top-up", planMeetsMinimum(plan, minPlanForFeature("top_up")));
  expectAllowed("email support", hasEmailSupport(plan));
  expectAllowed("template brand-campaign", canUseTemplate(plan, "brand-campaign"));
  expectAllowed("template shop-promo", canUseTemplate(plan, "shop-promo"));
  expectAllowed("template parts-poster", canUseTemplate(plan, "parts-poster"));

  // Pro+
  expectBlocked("storyboard (Pro+)", canUseStoryboard(plan));
  expectBlocked("video 1080p (Pro+)", canUseVideoResolution(plan, "1080p"));
  expectBlocked(
    "template storyboard-video (Pro+)",
    canUseTemplate(plan, "storyboard-video"),
  );
  expectBlocked(
    "template creative-video (Pro+)",
    canUseTemplate(plan, "creative-video"),
  );
  expectBlocked("priority queue (Pro+)", hasPriorityQueue(plan));

  // Master+
  expectBlocked("image 2K (Master+)", canUseImageResolution(plan, "2K"));
  expectBlocked("Ultra / pro canvas (Master+)", canUseProCanvas(plan));

  checks.push({
    name: "API platform research allowed",
    ok: researchGate == null,
    detail: researchGate ? `status ${researchGate.status}` : "null (allowed)",
  });
  checks.push({
    name: "API Ultra → 403",
    ok: ultraGate?.status === 403,
    detail: ultraGate ? `status ${ultraGate.status}` : "null (FAIL)",
  });

  const videoCap = videoCapForPlan(plan);
  const imageCap = imageCapForPlan(plan);
  checks.push({
    name: "video cap is 720p",
    ok: videoCap === "720p",
    detail: `cap=${videoCap}`,
  });
  checks.push({
    name: "image cap is 1K",
    ok: imageCap === "1K",
    detail: `cap=${imageCap}`,
  });
  checks.push({
    name: "PLAN_DEFINITIONS.standard (8k / 720p / 1K / top-up / no ultra)",
    ok:
      PLAN_DEFINITIONS.standard.monthlyTokens === 8000 &&
      PLAN_DEFINITIONS.standard.maxVideoResolution === "720p" &&
      PLAN_DEFINITIONS.standard.maxImageResolution === "1K" &&
      PLAN_DEFINITIONS.standard.proCanvas === false &&
      PLAN_DEFINITIONS.standard.canTopUp === true,
    detail: JSON.stringify({
      monthlyTokens: PLAN_DEFINITIONS.standard.monthlyTokens,
      maxVideoResolution: PLAN_DEFINITIONS.standard.maxVideoResolution,
      maxImageResolution: PLAN_DEFINITIONS.standard.maxImageResolution,
      canTopUp: PLAN_DEFINITIONS.standard.canTopUp,
      proCanvas: PLAN_DEFINITIONS.standard.proCanvas,
    }),
  });

  console.log("\n--- Gate checks (vs Standard pricing card) ---");
  let failed = 0;
  for (const c of checks) {
    const mark = c.ok ? "✓" : "✗";
    if (!c.ok) failed += 1;
    console.log(`${mark} ${c.name}: ${c.detail}`);
  }
  console.log(
    failed === 0
      ? `\nPASS: ${checks.length} checks — Standard entitlements match pricing card`
      : `\nFAIL: ${failed}/${checks.length} checks failed`,
  );
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
