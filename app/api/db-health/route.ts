import { NextResponse } from "next/server";
import { ensureIndexes } from "@/lib/mongodb";

export const runtime = "nodejs";

let indexesReady: Promise<void> | null = null;

function indexesOnce(): Promise<void> {
  if (!indexesReady) {
    indexesReady = ensureIndexes().catch((err) => {
      indexesReady = null;
      throw err;
    });
  }
  return indexesReady;
}

export async function GET() {
  if (!process.env.MONGODB_URI) {
    return NextResponse.json({ ok: false, error: "MONGODB_URI is not set" }, { status: 503 });
  }

  try {
    await indexesOnce();
    return NextResponse.json({ ok: true, database: "alchemy" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Database connection failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
