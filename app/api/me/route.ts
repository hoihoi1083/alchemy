import { NextResponse } from "next/server";
import {
  INTERNAL_UNLIMITED_DISPLAY_BALANCE,
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

export async function GET(request: Request) {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;

  if (!isMongoConfigured()) {
    return NextResponse.json({ error: "MONGODB_URI is not set" }, { status: 503 });
  }

  const db = await getDb();
  const user = await db.collection<DbUser>("users").findOne({ clerkId: auth.user.userId });

  const { searchParams } = new URL(request.url);
  let testWrite: { collection: string; id: string } | null = null;

  if (searchParams.get("test") === "1") {
    const inserted = await db.collection("connection_tests").insertOne({
      clerkId: auth.user.userId,
      message: "Alchemy AI Lab database test",
      source: "GET /api/me?test=1",
      createdAt: new Date(),
    });
    testWrite = {
      collection: "connection_tests",
      id: String(inserted.insertedId),
    };
  }

  const [effectivePlan, teamMembership, payer] = user
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
  if (unlimited) {
    creditBalance = INTERNAL_UNLIMITED_DISPLAY_BALANCE;
  }

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
          effectivePlan,
          creditBalance,
          ownCreditBalance: user.creditBalance,
        }
      : null,
    teamMembership,
    testWrite,
  });
}
