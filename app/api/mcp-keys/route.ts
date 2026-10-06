import { NextResponse } from "next/server";
import {
  createMcpApiKey,
  listMcpApiKeys,
  revokeMcpApiKey,
} from "@/lib/mcp/api-keys";
import { isMongoConfigured } from "@/lib/mongodb";
import { requireAppUser } from "@/lib/require-app-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** List personal Alchemy MCP API keys (prefixes only — secrets are never re-shown). */
export async function GET() {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;
  if (!isMongoConfigured()) {
    return NextResponse.json(
      { error: "Database is not configured." },
      { status: 503 },
    );
  }
  const keys = await listMcpApiKeys(auth.user.userId);
  return NextResponse.json({ keys });
}

/** Create a new MCP API key. Response includes `secret` once. */
export async function POST(request: Request) {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;
  if (!isMongoConfigured()) {
    return NextResponse.json(
      { error: "Database is not configured." },
      { status: 503 },
    );
  }
  const body = (await request.json().catch(() => null)) as {
    label?: string;
  } | null;
  try {
    const created = await createMcpApiKey({
      clerkId: auth.user.userId,
      label: body?.label,
    });
    return NextResponse.json({
      key: created.key,
      secret: created.secret,
      note: "Copy the secret now. It will not be shown again.",
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not create key";
    const status = message.includes("at most") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

/** Revoke a key: { keyId } */
export async function DELETE(request: Request) {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;
  if (!isMongoConfigured()) {
    return NextResponse.json(
      { error: "Database is not configured." },
      { status: 503 },
    );
  }
  const body = (await request.json().catch(() => null)) as {
    keyId?: string;
  } | null;
  const keyId = body?.keyId?.trim();
  if (!keyId) {
    return NextResponse.json({ error: "keyId is required" }, { status: 400 });
  }
  const ok = await revokeMcpApiKey({
    clerkId: auth.user.userId,
    keyId,
  });
  if (!ok) {
    return NextResponse.json(
      { error: "Key not found or already revoked." },
      { status: 404 },
    );
  }
  return NextResponse.json({ ok: true });
}
