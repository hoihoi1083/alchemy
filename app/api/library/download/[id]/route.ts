import { NextResponse } from "next/server";
import { deleteAssetForUser, getAssetAccessibleToUser } from "@/lib/db/assets";
import { isMongoReady, mongoRequiredErrorMessage } from "@/lib/mongodb-production";
import { requireAppUser } from "@/lib/require-app-user";
import { deleteR2Object, getR2ObjectBytes, signR2GetUrl } from "@/lib/storage/r2";
import { getActiveTeamMembership } from "@/lib/team/service";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

function extForAsset(contentType: string, kind: string): string {
  if (contentType.includes("mp4")) return "mp4";
  if (contentType.includes("png")) return "png";
  if (contentType.includes("jpeg") || contentType.includes("jpg")) return "jpg";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("mp3") || contentType.includes("mpeg")) return "mp3";
  if (contentType.includes("wav")) return "wav";
  if (kind === "video" || kind === "voiceover") return "mp4";
  if (kind === "audio") return "mp3";
  return "png";
}

function contentTypeForAsset(contentType: string, kind: string): string {
  const ct = (contentType || "").trim();
  if (ct && ct !== "application/octet-stream") return ct;
  if (kind === "video" || kind === "voiceover") return "video/mp4";
  if (kind === "audio") return "audio/mpeg";
  return "image/png";
}

export async function GET(request: Request, context: RouteContext) {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;
  if (!isMongoReady()) {
    return NextResponse.json({ error: mongoRequiredErrorMessage() }, { status: 503 });
  }

  const { id } = await context.params;
  const membership = await getActiveTeamMembership(auth.user.userId);
  const asset = await getAssetAccessibleToUser(
    auth.user.userId,
    id,
    membership?.teamId ?? null,
  );
  if (!asset) {
    return NextResponse.json({ error: "Asset not found." }, { status: 404 });
  }

  const url = new URL(request.url);
  const inline = url.searchParams.get("inline") === "1";
  const stream = url.searchParams.get("stream") === "1" || inline;

  const contentType = contentTypeForAsset(asset.contentType, asset.kind);
  const ext = extForAsset(contentType, asset.kind);
  const baseName = (asset.name || asset.kind || "asset")
    .replace(/[^\w.-]+/g, "_")
    .slice(0, 48);
  const filename = `${baseName}.${ext}`;

  // Stream bytes through our API for <img>/<video>/audio preview.
  // A 302 to R2 often breaks in <img> (auth cookie / cross-origin). Streaming is reliable.
  if (stream) {
    try {
      const obj = await getR2ObjectBytes(asset.r2Key);
      if (!obj) {
        return NextResponse.json({ error: "File missing in storage." }, { status: 404 });
      }
      const type = obj.contentType && obj.contentType !== "application/octet-stream"
        ? obj.contentType
        : contentType;
      if (type.toLowerCase().includes("text/html") || (obj.body[0] === 0x3c && obj.body[1] === 0x21)) {
        return NextResponse.json(
          { error: "Stored file is corrupted (HTML). Regenerate or run repair script." },
          { status: 422 },
        );
      }
      return new NextResponse(Buffer.from(obj.body), {
        status: 200,
        headers: {
          "Content-Type": type,
          ...(inline
            ? { "Content-Disposition": `inline; filename="${filename}"` }
            : {
                "Content-Disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
              }),
          "Cache-Control": "private, max-age=300",
        },
      });
    } catch {
      return NextResponse.json(
        { error: "Could not read file from storage. Try again shortly." },
        { status: 502 },
      );
    }
  }

  // Non-inline download can still use a short-lived signed redirect (faster for large videos).
  try {
    const signed = await signR2GetUrl(asset.r2Key, 3600, {
      downloadFilename: filename,
      contentType,
    });
    return NextResponse.redirect(signed, 302);
  } catch {
    // Fallback: stream attachment if signing fails.
    try {
      const obj = await getR2ObjectBytes(asset.r2Key);
      if (!obj) {
        return NextResponse.json({ error: "File missing in storage." }, { status: 404 });
      }
      return new NextResponse(Buffer.from(obj.body), {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Content-Disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
          "Cache-Control": "no-store",
        },
      });
    } catch {
      return NextResponse.json(
        { error: "Could not generate a download link. Try again shortly." },
        { status: 502 },
      );
    }
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;
  if (!isMongoReady()) {
    return NextResponse.json({ error: mongoRequiredErrorMessage() }, { status: 503 });
  }

  const { id } = await context.params;
  const removed = await deleteAssetForUser(auth.user.userId, id);
  if (!removed) {
    return NextResponse.json({ error: "Asset not found." }, { status: 404 });
  }
  try {
    await deleteR2Object(removed.r2Key);
  } catch {
    /* object may already be gone — record is deleted regardless */
  }
  return NextResponse.json({ ok: true });
}
