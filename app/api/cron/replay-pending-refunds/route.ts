import { NextResponse } from "next/server";
import { processAllPendingRefunds } from "@/lib/billing/pending-refunds";
import { isMongoConfigured } from "@/lib/mongodb";

export const runtime = "nodejs";
/** Allow enough time for a modest pending-refund sweep. */
export const maxDuration = 60;

function authorizeCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const auth = request.headers.get("authorization")?.trim() ?? "";
  return auth === `Bearer ${secret}`;
}

/** Vercel Cron (or manual ops): replay queued token refunds without waiting for /api/me. */
export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isMongoConfigured()) {
    return NextResponse.json(
      { error: "MONGODB_URI is not set" },
      { status: 503 },
    );
  }

  const result = await processAllPendingRefunds();
  return NextResponse.json({ ok: true, ...result });
}
