import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import {
  INTERNAL_UNLIMITED_DISPLAY_BALANCE,
  INTERNAL_UNLIMITED_PLAN,
  isInternalUnlimitedClerkId,
  isInternalUnlimitedIdentity,
} from "@/lib/billing/internal-unlimited";
import { getUserPlan } from "@/lib/billing/get-user-plan";
import { resolveTokenPayer } from "@/lib/billing/team-payer";
import { processPendingRefundsForBilledUser } from "@/lib/billing/pending-refunds";
import type { DbUser } from "@/lib/db/types";
import { getDb, isMongoConfigured } from "@/lib/mongodb";
import { requireAppUser } from "@/lib/require-app-user";
import { getTeamContextForUser } from "@/lib/team/service";

export const runtime = "nodejs";

/** Client-safe subset of DbUser — never spread the full Mongo document. */
function publicMeUser(
  user: DbUser,
  opts: {
    plan: DbUser["plan"];
    effectivePlan: string | null;
    creditBalance: number | null;
  },
) {
  return {
    clerkId: user.clerkId,
    email: user.email,
    name: user.name,
    imageUrl: user.imageUrl,
    region: user.region,
    plan: opts.plan,
    effectivePlan: opts.effectivePlan,
    creditBalance: opts.creditBalance,
    ownCreditBalance: user.creditBalance,
    planRenewsAt: user.planRenewsAt ?? null,
    pendingPlan: user.pendingPlan ?? null,
    pendingPlanInterval: user.pendingPlanInterval ?? null,
    pendingPlanEffectiveAt: user.pendingPlanEffectiveAt ?? null,
    stripeCustomerId: user.stripeCustomerId ?? null,
    stripeSubscriptionId: user.stripeSubscriptionId ?? null,
    hasUsedProTrial: user.hasUsedProTrial ?? false,
    proTrialEndsAt: user.proTrialEndsAt ?? null,
    teamId: user.teamId ?? null,
    teamRole: user.teamRole ?? null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export async function GET() {
  if (!isMongoConfigured()) {
    return NextResponse.json({ error: "MONGODB_URI is not set" }, { status: 503 });
  }

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = await getDb();
  let user = await db.collection<DbUser>("users").findOne({ clerkId: userId });

  // First-time users still need Clerk profile sync + signup grant.
  // Existing rows skip currentUser()/ensureUser — that round-trip was ~3–5s
  // and ran on every plan-gate mount.
  if (!user) {
    const provisioned = await requireAppUser();
    if (!provisioned.ok) return provisioned.response;
    user = await db.collection<DbUser>("users").findOne({ clerkId: userId });
  }

  const authUserId = userId;

  const [resolvedPlan, teamMembership, payer] = user
    ? await Promise.all([
        getUserPlan(authUserId),
        getTeamContextForUser(authUserId),
        resolveTokenPayer(authUserId),
      ])
    : [null, null, null];

  let creditBalance = user?.creditBalance ?? null;
  if (payer?.pooled) {
    const owner = await db.collection<DbUser>("users").findOne({
      clerkId: payer.payerClerkId,
    });
    creditBalance = owner?.creditBalance ?? 0;
  }
  const unlimited = user
    ? isInternalUnlimitedIdentity({
        clerkId: authUserId,
        email: user.emailNormalized ?? user.email,
      })
    : isInternalUnlimitedClerkId(authUserId);
  // Backdoor: balance + Master entitlements must stay in lockstep. Never show
  // 999,999 tokens while UI gates still think the account is Free/Pro.
  if (unlimited) {
    creditBalance = INTERNAL_UNLIMITED_DISPLAY_BALANCE;
  }
  const effectivePlan = unlimited ? INTERNAL_UNLIMITED_PLAN : resolvedPlan;

  if (payer && !unlimited) {
    void processPendingRefundsForBilledUser(payer.payerClerkId).catch(() => {
      /* background replay — non-fatal */
    });
  }

  return NextResponse.json({
    ok: true,
    user: user
      ? publicMeUser(user, {
          plan: unlimited ? INTERNAL_UNLIMITED_PLAN : user.plan,
          effectivePlan,
          creditBalance,
        })
      : null,
    teamMembership,
  });
}
