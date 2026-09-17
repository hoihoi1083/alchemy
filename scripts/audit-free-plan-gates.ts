/**
 * Free-plan restriction audit for a live clerkId (Mongo-backed).
 *   npx tsx scripts/audit-free-plan-gates.ts --clerk user_xxx
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

  console.log("\n=== Free plan audit ===");
  console.log({
    clerkId,
    email: user.email,
    mongoPlan: user.plan,
    effectivePlan: plan,
    creditBalance: user.creditBalance,
    signupGrantAt: user.signupGrantAt,
    hasUsedProTrial: Boolean(user.hasUsedProTrial),
    stripeSubscriptionId: user.stripeSubscriptionId ?? null,
    internalUnlimited: unlimited,
  });

  if (unlimited) {
    console.error(
      "\n✗ FAIL: INTERNAL_UNLIMITED is ON for this user — Free restrictions are bypassed.",
    );
  } else {
    console.log("\n✓ Not on INTERNAL_UNLIMITED allowlist");
  }

  if (plan !== "free") {
    console.error(`\n✗ FAIL: expected plan free, got ${plan}`);
  } else {
    console.log("✓ Effective plan is free");
  }

  if (user.creditBalance !== 300) {
    console.warn(`⚠ Balance is ${user.creditBalance}, expected 300`);
  } else {
    console.log("✓ Balance is 300 (signup grant)");
  }

  type Check = { name: string; ok: boolean; detail: string };
  const checks: Check[] = [];

  const expectBlocked = (name: string, allowed: boolean) => {
    checks.push({
      name,
      ok: allowed === false,
      detail: allowed ? "ALLOWED (should be blocked)" : "blocked",
    });
  };
  const expectAllowed = (name: string, allowed: boolean) => {
    checks.push({
      name,
      ok: allowed === true,
      detail: allowed ? "allowed" : "BLOCKED (should be allowed)",
    });
  };

  // Allowed on Free
  expectAllowed("template product-reel", canUseTemplate(plan, "product-reel"));
  expectAllowed("template info-poster", canUseTemplate(plan, "info-poster"));
  expectAllowed("video 480p", canUseVideoResolution(plan, "480p"));
  expectAllowed("image 1K", canUseImageResolution(plan, "1K"));

  // Blocked on Free
  expectBlocked("template shop-promo (Light+)", canUseTemplate(plan, "shop-promo"));
  expectBlocked(
    "template brand-campaign (Standard+)",
    canUseTemplate(plan, "brand-campaign"),
  );
  expectBlocked(
    "template storyboard-video (Pro+)",
    canUseTemplate(plan, "storyboard-video"),
  );
  expectBlocked("carousel (Standard+)", canUseCarousel(plan));
  expectBlocked("platform research (Standard+)", canUsePlatformResearch(plan));
  expectBlocked("storyboard (Pro+)", canUseStoryboard(plan));
  expectBlocked("video 720p (Standard+)", canUseVideoResolution(plan, "720p"));
  expectBlocked("video 1080p (Pro+)", canUseVideoResolution(plan, "1080p"));
  expectBlocked("image 2K (Master+)", canUseImageResolution(plan, "2K"));
  expectBlocked("image 4K (Master+)", canUseImageResolution(plan, "4K"));
  expectBlocked("Ultra / pro canvas (Master+)", canUseProCanvas(plan));
  expectBlocked("top-up (Light+)", planMeetsMinimum(plan, minPlanForFeature("top_up")));
  expectBlocked(
    "campaign_mode (Standard+)",
    planMeetsMinimum(plan, minPlanForFeature("campaign_mode")),
  );

  checks.push({
    name: "API assertPlatformResearchAllowed → 403",
    ok: researchGate?.status === 403,
    detail: researchGate
      ? `status ${researchGate.status}`
      : "null (would allow — FAIL)",
  });
  checks.push({
    name: "API assertProCanvasAllowedForUser → 403",
    ok: ultraGate?.status === 403,
    detail: ultraGate
      ? `status ${ultraGate.status}`
      : "null (would allow — FAIL)",
  });

  const videoCap = videoCapForPlan(plan);
  const imageCap = imageCapForPlan(plan);
  checks.push({
    name: "video cap is 480p",
    ok: videoCap === "480p",
    detail: `cap=${videoCap}`,
  });
  checks.push({
    name: "image cap is 1K",
    ok: imageCap === "1K",
    detail: `cap=${imageCap}`,
  });
  checks.push({
    name: "PLAN_DEFINITIONS.free.canTopUp is false",
    ok: PLAN_DEFINITIONS.free.canTopUp === false,
    detail: `canTopUp=${PLAN_DEFINITIONS.free.canTopUp}`,
  });
  checks.push({
    name: "PLAN_DEFINITIONS.free.proCanvas is false",
    ok: PLAN_DEFINITIONS.free.proCanvas === false,
    detail: `proCanvas=${PLAN_DEFINITIONS.free.proCanvas}`,
  });

  console.log("\n--- restriction matrix ---");
  let failed = 0;
  for (const c of checks) {
    const mark = c.ok ? "✓" : "✗";
    if (!c.ok) failed += 1;
    console.log(`${mark} ${c.name}: ${c.detail}`);
  }

  // Route source contracts (static) — free must hit these gates
  const { readFileSync: read } = await import("node:fs");
  const { join } = await import("node:path");
  const root = process.cwd();
  const routeChecks: Array<{ file: string; needle: RegExp; label: string }> = [
    {
      file: "app/api/generate-teaching-carousel/route.ts",
      needle: /planMeetsMinimum\(userPlan,\s*"standard"\)/,
      label: "carousel API Standard+",
    },
    {
      file: "app/api/generate-campaign/route.ts",
      needle: /planMeetsMinimum\(userPlan,\s*"standard"\)/,
      label: "campaign API Standard+",
    },
    {
      file: "app/api/generate-storyboard-video/route.ts",
      needle: /planMeetsMinimum\(userPlan,\s*"pro"\)/,
      label: "storyboard video API Pro+",
    },
    {
      file: "app/api/generate-image/route.ts",
      needle: /assertProCanvasAllowedForUser/,
      label: "Ultra compose Master+",
    },
    {
      file: "lib/billing/assert-platform-research.ts",
      needle: /planMeetsMinimum\(userPlan,\s*"standard"\)/,
      label: "research helper Standard+",
    },
  ];

  console.log("\n--- API route gate contracts ---");
  for (const r of routeChecks) {
    const src = read(join(root, r.file), "utf8");
    const ok = r.needle.test(src);
    if (!ok) failed += 1;
    console.log(`${ok ? "✓" : "✗"} ${r.label} (${r.file})`);
  }

  console.log(
    `\n=== Result: ${failed === 0 ? "PASS — Free restrictions look correct" : `FAIL — ${failed} issue(s)`} ===\n`,
  );
  if (unlimited || failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
