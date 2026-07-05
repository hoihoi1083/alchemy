import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/require-app-user";
import { ensureFfmpeg, getMediaDurationSeconds } from "@/lib/pipeline/ffmpeg";
import { parseVisualCaptionClips } from "@/lib/pipeline/visual-caption-clips";
import { burnVisualCaptionsOverlay } from "@/lib/pipeline/visual-caption-burn";
import { jobDir } from "@/lib/pipeline/paths";
import { materializeMediaInput, pipelineFileUrl } from "@/lib/pipeline/local-input";
import type { VisualCaptionClip } from "@/lib/visual-caption-types";

export const runtime = "nodejs";
export const maxDuration = 120;

async function burnVisualJob(
  request: Request,
  input: { videoUrl?: string; videoFile?: File; clips: VisualCaptionClip[] },
) {
  const jobId = crypto.randomUUID();
  const dir = jobDir(jobId);
  await fs.mkdir(dir, { recursive: true });

  const inputPath = path.join(dir, "input.mp4");
  const outputPath = path.join(dir, "visual-subtitled.mp4");

  await ensureFfmpeg();

  if (input.videoFile && input.videoFile.size > 0) {
    const buffer = Buffer.from(await input.videoFile.arrayBuffer());
    await fs.writeFile(inputPath, buffer);
  } else if (input.videoUrl?.trim()) {
    await materializeMediaInput(input.videoUrl.trim(), inputPath);
  } else {
    throw new Error("Provide video_file or video_url.");
  }

  const durationSec = await getMediaDurationSeconds(inputPath);
  const clips = parseVisualCaptionClips(input.clips, durationSec);
  if (clips.length === 0) {
    throw new Error("clips is required.");
  }

  await burnVisualCaptionsOverlay(inputPath, clips, outputPath, dir);

  return {
    videoUrl: pipelineFileUrl(request, jobId, "visual-subtitled.mp4"),
    jobId,
    burnMethod: "visual-overlay" as const,
  };
}

export async function POST(request: Request) {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;

  const contentType = request.headers.get("content-type") ?? "";

  try {
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const videoFile = formData.get("video_file");
      const videoUrl = (formData.get("video_url") as string | null)?.trim();
      const clips = parseVisualCaptionClips(formData.get("clips"));
      if (clips.length === 0) {
        return NextResponse.json({ error: "clips is required." }, { status: 400 });
      }
      const file = videoFile instanceof File && videoFile.size > 0 ? videoFile : undefined;
      if (!file && !videoUrl) {
        return NextResponse.json(
          { error: "video_file or video_url is required." },
          { status: 400 },
        );
      }
      const result = await burnVisualJob(request, { videoFile: file, videoUrl, clips });
      return NextResponse.json(result);
    }

    let body: { video_url?: string; clips?: VisualCaptionClip[] };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const videoUrl = body.video_url?.trim();
    if (!videoUrl) {
      return NextResponse.json({ error: "video_url is required." }, { status: 400 });
    }

    const clips = parseVisualCaptionClips(body.clips);
    if (clips.length === 0) {
      return NextResponse.json({ error: "clips is required." }, { status: 400 });
    }

    const result = await burnVisualJob(request, { videoUrl, clips });
    return NextResponse.json(result);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Visual caption burn failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
