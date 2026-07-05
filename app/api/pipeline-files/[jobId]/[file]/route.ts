import { promises as fs } from "fs";
import path from "path";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { jobDir, isValidJobId } from "@/lib/pipeline/paths";
import { PIPELINE_FILES } from "@/lib/pipeline/local-input";

const ALLOWED_FILES = PIPELINE_FILES;

function contentType(fileName: string): string {
  if (fileName.endsWith(".mp4")) return "video/mp4";
  if (fileName.endsWith(".png")) return "image/png";
  if (fileName.endsWith(".srt")) return "application/x-subrip";
  if (fileName.endsWith(".wav")) return "audio/wav";
  if (fileName.endsWith(".mp3")) return "audio/mpeg";
  return "application/octet-stream";
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ jobId: string; file: string }> },
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { jobId, file } = await context.params;
  if (!isValidJobId(jobId)) {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }
  if (!ALLOWED_FILES.has(file)) {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }

  const fullPath = path.join(jobDir(jobId), file);

  try {
    const data = await fs.readFile(fullPath);
    return new NextResponse(data, {
      status: 200,
      headers: {
        "Content-Type": contentType(file),
        "Cache-Control": "no-store",
        "Content-Disposition": `inline; filename="${file}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }
}
