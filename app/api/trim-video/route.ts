import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/require-app-user";
import { ensureFfmpeg, getMediaDurationSeconds } from "@/lib/pipeline/ffmpeg";
import { trimVideoFile } from "@/lib/pipeline/video-trim";
import { createOwnedJobDir } from "@/lib/pipeline/job-owner";
import { materializeMediaInput, pipelineFileUrl } from "@/lib/pipeline/local-input";
import { persistAndDurablize } from "@/lib/storage/durable-media";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;

  const formData = await req.formData();
  const videoUrl = (formData.get("video_url") as string | null)?.trim();
  const videoFile = formData.get("video_file");
  const startSec = Number(formData.get("trim_in_sec") ?? 0);
  const endSecRaw = formData.get("trim_out_sec");
  const { jobId, dir } = await createOwnedJobDir(auth.user.userId);

  const inputPath = path.join(dir, "input.mp4");
  const outputPath = path.join(dir, "trimmed.mp4");

  try {
    await ensureFfmpeg();
    if (videoFile instanceof File && videoFile.size > 0) {
      await fs.writeFile(inputPath, Buffer.from(await videoFile.arrayBuffer()));
    } else if (videoUrl) {
      await materializeMediaInput(videoUrl, inputPath, { clerkId: auth.user.userId });
    } else {
      return NextResponse.json({ error: "Provide video_file or video_url." }, { status: 400 });
    }

    const fullDuration = await getMediaDurationSeconds(inputPath);
    const endSec = endSecRaw != null && endSecRaw !== "" ? Number(endSecRaw) : fullDuration;
    if (!Number.isFinite(startSec) || !Number.isFinite(endSec) || endSec <= startSec) {
      return NextResponse.json({ error: "Invalid trim range." }, { status: 400 });
    }

    await trimVideoFile(inputPath, outputPath, startSec, Math.min(endSec, fullDuration));
    const trimmedDuration = await getMediaDurationSeconds(outputPath);
    const pipelineUrl = pipelineFileUrl(req, jobId, "trimmed.mp4");
    const bytes = await fs.readFile(outputPath);
    const videoOutUrl = await persistAndDurablize({
      clerkId: auth.user.userId,
      kind: "video",
      sourceUrl: `trim://${jobId}/trimmed.mp4`,
      fallbackUrl: pipelineUrl,
      bytes,
      contentType: "video/mp4",
      name: "trimmed-video",
    });

    return NextResponse.json({
      videoUrl: videoOutUrl,
      durationSec: trimmedDuration,
      trimInSec: startSec,
      trimOutSec: Math.min(endSec, fullDuration),
    });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Video trim failed" },
      { status: 502 },
    );
  }
}
