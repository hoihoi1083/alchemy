import { NextResponse } from "next/server";
import { assertProCanvasAllowedForUser } from "@/lib/billing/assert-pro-canvas";
import type { AssetKind } from "@/lib/db/types";
import { isMongoReady, mongoRequiredErrorMessage } from "@/lib/mongodb-production";
import { requireAppUser } from "@/lib/require-app-user";
import {
  isHttpOrLibraryMediaUrl,
  isLibraryAssetUrl,
  persistAndDurablize,
} from "@/lib/storage/durable-media";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;
  const gated = await assertProCanvasAllowedForUser(auth.user.userId);
  if (gated) return gated;
  if (!isMongoReady()) {
    return NextResponse.json({ error: mongoRequiredErrorMessage() }, { status: 503 });
  }

  let body: { url?: string; kind?: string; name?: string } | null = null;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const url = body?.url?.trim() ?? "";
  const kind = (body?.kind?.trim() || "image") as AssetKind;
  if (!isHttpOrLibraryMediaUrl(url)) {
    return NextResponse.json({ error: "A valid output URL is required." }, { status: 400 });
  }
  if (kind !== "image" && kind !== "video") {
    return NextResponse.json({ error: "kind must be image or video." }, { status: 400 });
  }

  if (isLibraryAssetUrl(url)) {
    return NextResponse.json({ libraryUrl: url, alreadySaved: true });
  }

  try {
    const libraryUrl = await persistAndDurablize({
      clerkId: auth.user.userId,
      kind,
      sourceUrl: url,
      fallbackUrl: url,
      name: body?.name?.trim() || `ultra-canvas-${kind}`,
    });
    return NextResponse.json({ libraryUrl });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Export failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
