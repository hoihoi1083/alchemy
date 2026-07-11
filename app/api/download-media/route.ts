import { promises as fs } from "fs";
import { NextResponse } from "next/server";
import { PIPELINE_FILES } from "@/lib/pipeline/local-input";
import { jobDir, isValidJobId } from "@/lib/pipeline/paths";
import { assertSafeRemoteMediaUrl } from "@/lib/pipeline/safe-url";
import { requireAppUser } from "@/lib/require-app-user";

export const runtime = "nodejs";

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

function attachmentName(file: string, fallback: string): string {
  const safe = file.replace(/[^\w.\-]+/g, "-");
  return safe || fallback;
}

export async function GET(request: Request) {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;

  const raw = new URL(request.url).searchParams.get("url")?.trim();
  const requestedName = new URL(request.url).searchParams.get("filename")?.trim();
  if (!raw) {
    return NextResponse.json({ error: "url is required." }, { status: 400 });
  }

  const pipeline = pipelinePathFromUrl(raw);
  if (pipeline) {
    const fullPath = `${jobDir(pipeline.jobId)}/${pipeline.file}`;
    try {
      const data = await fs.readFile(fullPath);
      const name = requestedName || attachmentName(pipeline.file, "download.png");
      return new NextResponse(data, {
        status: 200,
        headers: {
          "Content-Type": contentTypeForFile(pipeline.file),
          "Content-Disposition": `attachment; filename="${name}"`,
          "Cache-Control": "no-store",
        },
      });
    } catch {
      return NextResponse.json({ error: "File not found." }, { status: 404 });
    }
  }

  try {
    const safe = assertSafeRemoteMediaUrl(raw);
    const upstream = await fetch(safe.toString(), { cache: "no-store" });
    if (!upstream.ok) {
      return NextResponse.json({ error: "Media fetch failed." }, { status: 502 });
    }
    const buffer = await upstream.arrayBuffer();
    if (buffer.byteLength < 64) {
      return NextResponse.json({ error: "Empty media file." }, { status: 502 });
    }
    const name =
      requestedName || attachmentName(safe.pathname.split("/").pop() ?? "download.png", "download.png");
    const contentType = upstream.headers.get("content-type") ?? contentTypeForFile(name);
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${name}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Download failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
