import { promises as fs } from "fs";
import { NextResponse } from "next/server";
import { getAssetAccessibleToUser } from "@/lib/db/assets";
import { archiveRemoteImageToPipeline } from "@/lib/pipeline/archive-image";
import { assertJobOwnedBy } from "@/lib/pipeline/job-owner";
import { PIPELINE_FILES } from "@/lib/pipeline/local-input";
import { jobDir, isValidJobId } from "@/lib/pipeline/paths";
import { assertSafeRemoteMediaUrl, isFalCdnUrl, isPipelineFileUrl } from "@/lib/pipeline/safe-url";
import { requireAppUser } from "@/lib/require-app-user";
import {
  isLibraryAssetUrl,
  libraryAssetIdFromUrl,
} from "@/lib/storage/durable-media";
import { persistUserAsset } from "@/lib/storage/persist-asset";
import { getR2ObjectBytes } from "@/lib/storage/r2";
import { getActiveTeamMembership } from "@/lib/team/service";

export const runtime = "nodejs";
export const maxDuration = 60;

function pipelinePathFromUrl(raw: string): { jobId: string; file: string } | null {
  const pathname = (() => {
    if (raw.startsWith("/api/pipeline-files/")) return raw.split("?")[0];
    try {
      return new URL(raw).pathname;
    } catch {
      return null;
    }
  })();
  if (!pathname) return null;
  const match = pathname.match(/^\/api\/pipeline-files\/([^/]+)\/([^/]+)$/);
  if (!match) return null;
  const [, jobId, file] = match;
  if (!jobId || !file || !isValidJobId(jobId) || !PIPELINE_FILES.has(file)) return null;
  return { jobId, file };
}

function contentTypeForFile(file: string): string {
  if (file.endsWith(".png")) return "image/png";
  if (file.endsWith(".mp4")) return "video/mp4";
  if (file.endsWith(".jpg") || file.endsWith(".jpeg")) return "image/jpeg";
  if (file.endsWith(".webp")) return "image/webp";
  return "application/octet-stream";
}

function attachmentDisposition(filename: string): string {
  const trimmed = filename.trim() || "download.png";
  const ascii = trimmed.replace(/[^\w.\-]+/g, "-").replace(/^-+|-+$/g, "") || "download.png";
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(trimmed)}`;
}

async function readPipelineBytes(
  clerkId: string,
  raw: string,
): Promise<{ data: Buffer; contentType: string } | null> {
  const pipeline = pipelinePathFromUrl(raw);
  if (!pipeline) return null;
  if (!(await assertJobOwnedBy(pipeline.jobId, clerkId))) return null;
  try {
    const data = await fs.readFile(`${jobDir(pipeline.jobId)}/${pipeline.file}`);
    return { data, contentType: contentTypeForFile(pipeline.file) };
  } catch {
    return null;
  }
}

async function readLibraryBytes(
  clerkId: string,
  raw: string,
): Promise<{ data: Buffer; contentType: string } | null> {
  const id = libraryAssetIdFromUrl(raw);
  if (!id) return null;
  const membership = await getActiveTeamMembership(clerkId);
  const asset = await getAssetAccessibleToUser(
    clerkId,
    id,
    membership?.teamId ?? null,
  );
  if (!asset) return null;
  try {
    const obj = await getR2ObjectBytes(asset.r2Key);
    if (!obj) return null;
    return { data: Buffer.from(obj.body), contentType: obj.contentType || asset.contentType };
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;

  let body: { image_url?: string; filename?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  let imageUrl = body.image_url?.trim();
  const filename = body.filename?.trim() || "marketing-image.png";
  if (!imageUrl) {
    return NextResponse.json({ error: "image_url is required." }, { status: 400 });
  }

  if (imageUrl.startsWith("/")) {
    imageUrl = new URL(imageUrl, request.url).toString();
  }

  // Prefer durable R2 assets (works across serverless instances).
  let bytes = await readLibraryBytes(auth.user.userId, imageUrl);

  if (!bytes) {
    bytes = await readPipelineBytes(auth.user.userId, imageUrl);
  }

  if (!bytes && isFalCdnUrl(imageUrl)) {
    try {
      // Stream from fal, and mirror to R2 so future downloads don't need the CDN.
      const safe = assertSafeRemoteMediaUrl(imageUrl);
      const upstream = await fetch(safe.toString(), { cache: "no-store" });
      if (!upstream.ok) {
        return NextResponse.json({ error: "Media fetch failed." }, { status: 502 });
      }
      const buffer = Buffer.from(await upstream.arrayBuffer());
      if (buffer.byteLength < 64) {
        return NextResponse.json({ error: "Empty media file." }, { status: 502 });
      }
      const contentType =
        upstream.headers.get("content-type")?.split(";")[0]?.trim() ||
        contentTypeForFile(filename);
      bytes = { data: buffer, contentType };
      void persistUserAsset({
        clerkId: auth.user.userId,
        kind: contentType.includes("mp4") || contentType.includes("webm") ? "video" : "image",
        sourceUrl: imageUrl,
        bytes: buffer,
        contentType,
      });
      // Best-effort local archive for same-instance re-downloads.
      try {
        await archiveRemoteImageToPipeline(
          request,
          imageUrl,
          "generated.png",
          auth.user.userId,
        );
      } catch {
        /* ignore */
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Download failed.";
      return NextResponse.json({ error: message }, { status: 502 });
    }
  }

  if (!bytes && isPipelineFileUrl(imageUrl)) {
    return NextResponse.json(
      { error: "File not found on this server — open it from My library or regenerate." },
      { status: 404 },
    );
  }

  if (!bytes && isLibraryAssetUrl(imageUrl)) {
    return NextResponse.json({ error: "Asset not found." }, { status: 404 });
  }

  if (!bytes) {
    try {
      const safe = assertSafeRemoteMediaUrl(imageUrl);
      const upstream = await fetch(safe.toString(), { cache: "no-store" });
      if (!upstream.ok) {
        return NextResponse.json({ error: "Media fetch failed." }, { status: 502 });
      }
      const buffer = Buffer.from(await upstream.arrayBuffer());
      if (buffer.byteLength < 64) {
        return NextResponse.json({ error: "Empty media file." }, { status: 502 });
      }
      bytes = {
        data: buffer,
        contentType: upstream.headers.get("content-type") ?? contentTypeForFile(filename),
      };
      void persistUserAsset({
        clerkId: auth.user.userId,
        kind: "image",
        sourceUrl: imageUrl,
        bytes: buffer,
        contentType: bytes.contentType,
      });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Download failed.";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  return new NextResponse(new Uint8Array(bytes.data), {
    status: 200,
    headers: {
      "Content-Type": bytes.contentType,
      "Content-Disposition": attachmentDisposition(filename),
      "Cache-Control": "no-store",
    },
  });
}
