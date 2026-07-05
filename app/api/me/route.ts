import { NextResponse } from "next/server";
import type { DbUser } from "@/lib/db/types";
import { getDb, isMongoConfigured } from "@/lib/mongodb";
import { requireAppUser } from "@/lib/require-app-user";

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
      message: "alchemy.ai database test",
      source: "GET /api/me?test=1",
      createdAt: new Date(),
    });
    testWrite = {
      collection: "connection_tests",
      id: String(inserted.insertedId),
    };
  }

  return NextResponse.json({
    ok: true,
    user,
    testWrite,
  });
}
