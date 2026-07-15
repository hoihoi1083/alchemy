import { NextResponse } from "next/server";
import type { CreditTransaction } from "@/lib/billing/ledger";
import { getDb, isMongoConfigured } from "@/lib/mongodb";
import { requireAppUser } from "@/lib/require-app-user";

export const runtime = "nodejs";

const MAX = 50;

export async function GET(request: Request) {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;

  if (!isMongoConfigured()) {
    return NextResponse.json({ error: "MONGODB_URI is not set" }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const limitRaw = Number(searchParams.get("limit") ?? MAX);
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(Math.trunc(limitRaw), 1), MAX)
    : MAX;

  const db = await getDb();
  const rows = await db
    .collection<CreditTransaction>("credit_transactions")
    .find({ clerkId: auth.user.userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();

  return NextResponse.json({
    ok: true,
    transactions: rows.map((t) => ({
      id: String(t._id ?? `${t.ref ?? ""}-${t.createdAt?.toISOString?.() ?? ""}`),
      delta: t.delta,
      reason: t.reason,
      ref: t.ref ?? null,
      meta: t.meta ?? null,
      balanceAfter: t.balanceAfter,
      createdAt: t.createdAt instanceof Date ? t.createdAt.toISOString() : t.createdAt,
    })),
  });
}
