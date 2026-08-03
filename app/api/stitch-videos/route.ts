import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import {
  concatVideos,
  ensureFfmpeg,
  getMediaDurationSeconds,
} from "@/lib/pipeline/ffmpeg";
import { createOwnedJobDir } from "@/lib/pipeline/job-owner";
import { materializeMediaInput, pipelineFileUrl } from "@/lib/pipeline/local-input";
import { requireAppUser } from "@/lib/require-app-user";
import { persistAndDurablize } from "@/lib/storage/durable-media";
import { buildManifestFromClipDurations } from "@/lib/video-timing-manifest";

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

  const { jobId, dir } = await createOwnedJobDir(auth.user.userId);

  const clipPaths: string[] = [];
  let outputPath = "";
  let clipDurations: number[] = [];
  try {
    await ensureFfmpeg();
    for (let i = 0; i < videoUrls.length; i++) {
      const clipPath = path.join(dir, `clip-${i}.mp4`);
      await materializeMediaInput(videoUrls[i], clipPath, { clerkId: auth.user.userId });
      clipPaths.push(clipPath);
    }
    clipDurations = await Promise.all(
      clipPaths.map(async (p) => {
        try {
          return Math.max(0.1, await getMediaDurationSeconds(p));
        } catch {
          return 0;
        }
      }),
    );
    outputPath = path.join(dir, "final.mp4");
    await concatVideos(clipPaths, outputPath);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Video stitch failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const pipelineUrl = pipelineFileUrl(request, jobId, "final.mp4");
  const bytes = await fs.readFile(outputPath);
  const probed = clipDurations.every((d) => d > 0) ? clipDurations : null;
  const videoUrl = await persistAndDurablize({
    clerkId: auth.user.userId,
    kind: "video",
    sourceUrl: `stitch://${jobId}/final.mp4`,
    fallbackUrl: pipelineUrl,
    bytes,
    contentType: "video/mp4",
    name: "stitched-video",
    timingManifest: probed
      ? buildManifestFromClipDurations(probed, {
          source: "stitch",
          engine: "mixed",
          timingSource: "probed",
        })
      : undefined,
  });

  return NextResponse.json({
    videoUrl,
    jobId,
    clipCount: videoUrls.length,
    ...(probed ? { clipDurations: probed } : {}),
  });
}
