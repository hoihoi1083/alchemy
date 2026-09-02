import { NextResponse } from "next/server";
import { assertProCanvasAllowedForUser } from "@/lib/billing/assert-pro-canvas";
import {
  createUltraCanvasBoard,
  listUltraCanvasBoardsForUser,
} from "@/lib/db/ultra-canvas";
import { isMongoReady, mongoRequiredErrorMessage } from "@/lib/mongodb-production";
import { requireAppUser } from "@/lib/require-app-user";
import type { UltraCanvasSnapshot } from "@/lib/ultra-canvas-snapshot";

export const runtime = "nodejs";

function parseSnapshot(raw: unknown): UltraCanvasSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const snap = raw as UltraCanvasSnapshot;
  if (snap.version !== 1 || !Array.isArray(snap.nodes) || !Array.isArray(snap.edges)) {
    return null;
  }
  return snap;
}

export async function GET() {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;
  const gated = await assertProCanvasAllowedForUser(auth.user.userId);
  if (gated) return gated;
  if (!isMongoReady()) {
    return NextResponse.json({ error: mongoRequiredErrorMessage() }, { status: 503 });
  }

  const boards = await listUltraCanvasBoardsForUser(auth.user.userId, 40);
  return NextResponse.json({
    boards: boards.map((b) => ({
      id: String(b._id),
      name: b.name,
      updatedAt: b.updatedAt,
      createdAt: b.createdAt,
      nodeCount: b.snapshot.nodes.length,
    })),
  });
}

export async function POST(request: Request) {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;
  const gated = await assertProCanvasAllowedForUser(auth.user.userId);
  if (gated) return gated;
  if (!isMongoReady()) {
    return NextResponse.json({ error: mongoRequiredErrorMessage() }, { status: 503 });
  }

  let body: { name?: string; snapshot?: unknown } | null = null;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const snapshot = parseSnapshot(body?.snapshot);
  if (!snapshot) {
    return NextResponse.json({ error: "Invalid canvas snapshot." }, { status: 400 });
  }

  const board = await createUltraCanvasBoard({
    clerkId: auth.user.userId,
    name: body?.name?.trim() || "Untitled board",
    snapshot,
  });

  return NextResponse.json({
    id: String(board._id),
    name: board.name,
    snapshot: board.snapshot,
    createdAt: board.createdAt,
    updatedAt: board.updatedAt,
  });
}
