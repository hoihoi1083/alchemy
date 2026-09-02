import { NextResponse } from "next/server";
import { assertProCanvasAllowedForUser } from "@/lib/billing/assert-pro-canvas";
import {
  deleteUltraCanvasBoard,
  getUltraCanvasBoardForUser,
  updateUltraCanvasBoard,
} from "@/lib/db/ultra-canvas";
import { isMongoReady, mongoRequiredErrorMessage } from "@/lib/mongodb-production";
import { requireAppUser } from "@/lib/require-app-user";
import type { UltraCanvasSnapshot } from "@/lib/ultra-canvas-snapshot";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

function parseSnapshot(raw: unknown): UltraCanvasSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const snap = raw as UltraCanvasSnapshot;
  if (snap.version !== 1 || !Array.isArray(snap.nodes) || !Array.isArray(snap.edges)) {
    return null;
  }
  return snap;
}

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;
  const gated = await assertProCanvasAllowedForUser(auth.user.userId);
  if (gated) return gated;
  if (!isMongoReady()) {
    return NextResponse.json({ error: mongoRequiredErrorMessage() }, { status: 503 });
  }

  const { id } = await context.params;
  const board = await getUltraCanvasBoardForUser(auth.user.userId, id);
  if (!board) {
    return NextResponse.json({ error: "Board not found." }, { status: 404 });
  }

  return NextResponse.json({
    id: String(board._id),
    name: board.name,
    snapshot: board.snapshot,
    createdAt: board.createdAt,
    updatedAt: board.updatedAt,
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;
  const gated = await assertProCanvasAllowedForUser(auth.user.userId);
  if (gated) return gated;
  if (!isMongoReady()) {
    return NextResponse.json({ error: mongoRequiredErrorMessage() }, { status: 503 });
  }

  const { id } = await context.params;
  let body: { name?: string; snapshot?: unknown } | null = null;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const snapshot = body?.snapshot ? parseSnapshot(body.snapshot) : undefined;
  if (body?.snapshot && !snapshot) {
    return NextResponse.json({ error: "Invalid canvas snapshot." }, { status: 400 });
  }

  const board = await updateUltraCanvasBoard(auth.user.userId, id, {
    name: body?.name,
    snapshot: snapshot ?? undefined,
  });
  if (!board) {
    return NextResponse.json({ error: "Board not found." }, { status: 404 });
  }

  return NextResponse.json({
    id: String(board._id),
    name: board.name,
    snapshot: board.snapshot,
    updatedAt: board.updatedAt,
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;
  const gated = await assertProCanvasAllowedForUser(auth.user.userId);
  if (gated) return gated;
  if (!isMongoReady()) {
    return NextResponse.json({ error: mongoRequiredErrorMessage() }, { status: 503 });
  }

  const { id } = await context.params;
  const ok = await deleteUltraCanvasBoard(auth.user.userId, id);
  if (!ok) {
    return NextResponse.json({ error: "Board not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
