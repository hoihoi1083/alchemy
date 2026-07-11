import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/require-app-user";
import { isMongoConfigured } from "@/lib/mongodb";
import { getBrandKit, upsertBrandKit } from "@/lib/db/brand-kits";
import { parseBrandKit } from "@/lib/brand-kit";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;

  if (!isMongoConfigured()) {
    return NextResponse.json({ kit: null, storage: "client" });
  }

  const kit = await getBrandKit(auth.user.userId);
  return NextResponse.json({ kit, storage: "mongo" });
}

export async function PUT(req: Request) {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;

  const body = (await req.json()) as { kit?: unknown };
  const kit = parseBrandKit(body.kit);

  if (!isMongoConfigured()) {
    return NextResponse.json({ kit, storage: "client" });
  }

  const saved = await upsertBrandKit(auth.user.userId, kit);
  return NextResponse.json({ kit: saved, storage: "mongo" });
}
