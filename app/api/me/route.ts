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

export async function GET() {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;

  if (!isMongoConfigured()) {
    return NextResponse.json({ error: "MONGODB_URI is not set" }, { status: 503 });
  }

  const db = await getDb();
  const user = await db.collection<DbUser>("users").findOne({ clerkId: auth.user.userId });

  const [resolvedPlan, teamMembership, payer] = user
    ? await Promise.all([
        getUserPlan(auth.user.userId),
        getTeamContextForUser(auth.user.userId),
        resolveTokenPayer(auth.user.userId),
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
        clerkId: auth.user.userId,
        email: user.emailNormalized ?? user.email,
      })
    : isInternalUnlimitedClerkId(auth.user.userId);
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
      ? {
          ...user,
          // Override Mongo `plan` too — some clients read `.plan` not `.effectivePlan`.
          plan: unlimited ? INTERNAL_UNLIMITED_PLAN : user.plan,
          effectivePlan,
          creditBalance,
          ownCreditBalance: user.creditBalance,
        }
      : null,
    teamMembership,
  });
}
