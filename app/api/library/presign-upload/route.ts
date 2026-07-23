import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { insertAsset } from "@/lib/db/assets";
import type { AssetKind } from "@/lib/db/types";
import { isMongoReady, mongoRequiredErrorMessage } from "@/lib/mongodb-production";
import { requireAppUser } from "@/lib/require-app-user";
import { libraryAssetUrl } from "@/lib/storage/library-asset-url";
import { isR2Configured, signR2PutUrl } from "@/lib/storage/r2";

export const runtime = "nodejs";
export const maxDuration = 30;

const KINDS = new Set<AssetKind>(["image", "video", "audio", "voiceover"]);

/**
 * Presign a direct browser → R2 PUT so large caption-studio videos never hit
 * Vercel's ~4.5MB request body limit ("Request Entity Too Large").
 */
export async function POST(request: Request) {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;
  if (!isMongoReady()) {
    return NextResponse.json({ error: mongoRequiredErrorMessage() }, { status: 503 });
  }
  if (!isR2Configured()) {
    return NextResponse.json({ error: "Storage is not configured." }, { status: 503 });
  }

  let body: {
    kind?: string;
    contentType?: string;
    name?: string;
    sizeBytes?: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const kind = (body.kind?.trim() || "video") as AssetKind;
  if (!KINDS.has(kind)) {
    return NextResponse.json({ error: "Invalid kind." }, { status: 400 });
  }
  const contentType =
    body.contentType?.trim() ||
    (kind === "video" || kind === "voiceover"
      ? "video/mp4"
      : kind === "audio"
        ? "audio/mpeg"
        : "image/png");
  const ext =
    contentType.includes("webm")
      ? "webm"
      : contentType.includes("png")
        ? "png"
        : contentType.includes("jpeg") || contentType.includes("jpg")
          ? "jpg"
          : contentType.includes("mp3")
            ? "mp3"
            : contentType.includes("wav")
              ? "wav"
              : kind === "audio"
                ? "mp3"
                : kind === "image"
                  ? "png"
                  : "mp4";

  const key = `users/${auth.user.userId}/${kind}/${randomUUID()}.${ext}`;
  const sourceUrl = `upload://${key}`;

  try {
    const asset = await insertAsset({
      clerkId: auth.user.userId,
      kind,
      sourceUrl,
      r2Key: key,
      contentType,
      name: body.name?.trim() || `upload-${kind}`,
      sizeBytes: typeof body.sizeBytes === "number" ? body.sizeBytes : null,
    });
    const uploadUrl = await signR2PutUrl(key, contentType, 900);
    const assetId = String(asset._id);
    return NextResponse.json({
      assetId,
      uploadUrl,
      downloadUrl: libraryAssetUrl(assetId),
      contentType,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Presign failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
