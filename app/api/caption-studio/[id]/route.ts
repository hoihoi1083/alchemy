import { NextResponse } from "next/server";
import {
  deleteCaptionStudioPack,
  getCaptionStudioPackForUser,
  updateCaptionStudioPack,
} from "@/lib/db/caption-studio";
import { parseCaptionStudioSnapshot } from "@/lib/caption-studio-snapshot";
import { isMongoReady, mongoRequiredErrorMessage } from "@/lib/mongodb-production";
import { requireAppUser } from "@/lib/require-app-user";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;
  if (!isMongoReady()) {
    return NextResponse.json({ error: mongoRequiredErrorMessage() }, { status: 503 });
  }

  const { id } = await context.params;
  const pack = await getCaptionStudioPackForUser(auth.user.userId, id);
  if (!pack) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  return NextResponse.json({
    id: String(pack._id),
    name: pack.name,
    snapshot: pack.snapshot,
    createdAt: pack.createdAt,
    updatedAt: pack.updatedAt,
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;
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

  const snapshot = body?.snapshot
    ? parseCaptionStudioSnapshot(body.snapshot)
    : undefined;
  if (body?.snapshot && !snapshot) {
    return NextResponse.json({ error: "Invalid caption project snapshot." }, { status: 400 });
  }
  if (
    snapshot &&
    snapshot.captionLines.length < 1 &&
    snapshot.timelineClips.length < 1
  ) {
    return NextResponse.json(
      { error: "Save at least one caption line or timeline clip." },
      { status: 400 },
    );
  }

  const pack = await updateCaptionStudioPack(auth.user.userId, id, {
    name: body?.name,
    snapshot: snapshot ?? undefined,
  });
  if (!pack) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  return NextResponse.json({
    id: String(pack._id),
    name: pack.name,
    snapshot: pack.snapshot,
    updatedAt: pack.updatedAt,
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;
  if (!isMongoReady()) {
    return NextResponse.json({ error: mongoRequiredErrorMessage() }, { status: 503 });
  }

  const { id } = await context.params;
  const ok = await deleteCaptionStudioPack(auth.user.userId, id);
  if (!ok) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
