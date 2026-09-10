import { NextResponse } from "next/server";
import {
  createCaptionStudioPack,
  listCaptionStudioPacksForUser,
} from "@/lib/db/caption-studio";
import {
  captionStudioPackSummary,
  parseCaptionStudioSnapshot,
} from "@/lib/caption-studio-snapshot";
import { isMongoReady, mongoRequiredErrorMessage } from "@/lib/mongodb-production";
import { requireAppUser } from "@/lib/require-app-user";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;
  if (!isMongoReady()) {
    return NextResponse.json({ error: mongoRequiredErrorMessage() }, { status: 503 });
  }

  const packs = await listCaptionStudioPacksForUser(auth.user.userId, 40);
  return NextResponse.json({
    packs: packs.map((p) => {
      const summary = captionStudioPackSummary(p.snapshot);
      return {
        id: String(p._id),
        name: p.name,
        updatedAt: p.updatedAt,
        createdAt: p.createdAt,
        captionCount: summary.captionCount,
        clipCount: summary.clipCount,
      };
    }),
  });
}

export async function POST(request: Request) {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;
  if (!isMongoReady()) {
    return NextResponse.json({ error: mongoRequiredErrorMessage() }, { status: 503 });
  }

  let body: { name?: string; snapshot?: unknown } | null = null;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const snapshot = parseCaptionStudioSnapshot(body?.snapshot);
  if (!snapshot) {
    return NextResponse.json({ error: "Invalid caption project snapshot." }, { status: 400 });
  }
  if (snapshot.captionLines.length < 1 && snapshot.timelineClips.length < 1) {
    return NextResponse.json(
      { error: "Save at least one caption line or timeline clip." },
      { status: 400 },
    );
  }

  const pack = await createCaptionStudioPack({
    clerkId: auth.user.userId,
    name: body?.name?.trim() || "Untitled captions",
    snapshot,
  });

  return NextResponse.json({
    id: String(pack._id),
    name: pack.name,
    snapshot: pack.snapshot,
    createdAt: pack.createdAt,
    updatedAt: pack.updatedAt,
  });
}
