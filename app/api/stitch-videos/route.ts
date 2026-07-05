import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { ensureFfmpeg, concatVideos } from "@/lib/pipeline/ffmpeg";
import { materializeMediaInput, pipelineFileUrl } from "@/lib/pipeline/local-input";
import { jobDir } from "@/lib/pipeline/paths";
import { requireAppUser } from "@/lib/require-app-user";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;

  let body: { video_urls?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const videoUrls = (body.video_urls ?? []).filter((u) => typeof u === "string" && u.trim());
  if (videoUrls.length < 2) {
    return NextResponse.json(
      { error: "At least two video_urls are required for stitching." },
      { status: 400 },
    );
  }

  const jobId = crypto.randomUUID();
  const dir = jobDir(jobId);
  await fs.mkdir(dir, { recursive: true });

  const clipPaths: string[] = [];
  try {
    await ensureFfmpeg();
    for (let i = 0; i < videoUrls.length; i++) {
      const clipPath = path.join(dir, `clip-${i}.mp4`);
      await materializeMediaInput(videoUrls[i], clipPath);
      clipPaths.push(clipPath);
    }
    const outputPath = path.join(dir, "final.mp4");
    await concatVideos(clipPaths, outputPath);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Video stitch failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  return NextResponse.json({
    videoUrl: pipelineFileUrl(request, jobId, "final.mp4"),
    jobId,
    clipCount: videoUrls.length,
  });
}
