import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { insertAsset } from "@/lib/db/assets";
import type { AssetKind } from "@/lib/db/types";
import { isMongoReady, mongoRequiredErrorMessage } from "@/lib/mongodb-production";
import { requireAppUser } from "@/lib/require-app-user";
import { libraryAssetUrl } from "@/lib/storage/library-asset-url";
import { isR2Configured, putR2Object } from "@/lib/storage/r2";

export const runtime = "nodejs";
/** Local / larger hobby payloads — direct R2 PUT is still preferred on Vercel. */
export const maxDuration = 120;

const KINDS = new Set<AssetKind>(["image", "video", "audio", "voiceover"]);
const MAX_BYTES = 80 * 1024 * 1024;

/**
 * Same-origin multipart upload → R2.
 * Fallback when browser → R2 presigned PUT fails (missing bucket CORS).
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

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      {
        error:
          "Upload body too large for this server path (~4.5MB on Vercel). Enable R2 bucket CORS for direct uploads, or pick the file from My library.",
        code: "REQUEST_TOO_LARGE",
      },
      { status: 413 },
    );
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size <= 0) {
    return NextResponse.json({ error: "file is required." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      {
        error: `File too large (${Math.round(file.size / 1024 / 1024)}MB). Server upload max is ${MAX_BYTES / 1024 / 1024}MB — enable R2 CORS for larger direct uploads, or use Choose from library.`,
        code: "FILE_TOO_LARGE",
      },
      { status: 413 },
    );
  }

  const kind = ((form.get("kind") as string | null)?.trim() || "video") as AssetKind;
  if (!KINDS.has(kind)) {
    return NextResponse.json({ error: "Invalid kind." }, { status: 400 });
  }

  const contentType =
    file.type ||
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
    const bytes = Buffer.from(await file.arrayBuffer());
    await putR2Object(key, bytes, contentType);
    const asset = await insertAsset({
      clerkId: auth.user.userId,
      kind,
      sourceUrl,
      r2Key: key,
      contentType,
      name: file.name || `upload-${kind}`,
      sizeBytes: bytes.length,
    });
    const assetId = String(asset._id);
    return NextResponse.json({
      assetId,
      downloadUrl: libraryAssetUrl(assetId),
      contentType,
      via: "server",
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Upload failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
