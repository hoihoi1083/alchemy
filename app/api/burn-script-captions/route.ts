import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/require-app-user";
import {
  attachSoftSubtitleTrack,
  burnSubtitles,
  ensureFfmpeg,
  getMediaDurationSeconds,
} from "@/lib/pipeline/ffmpeg";
import { burnCaptionsOverlay } from "@/lib/pipeline/caption-overlay-burn";
import {
  burnCaptionsDrawtext,
  preferDrawtextCaptionBurn,
} from "@/lib/pipeline/caption-burn";
import { parseCaptionLinesInput } from "@/lib/pipeline/caption-lines";
import { parseCaptionBurnStyleJson } from "@/lib/caption-burn-styles";
import { jobDir } from "@/lib/pipeline/paths";
import { buildSrt } from "@/lib/pipeline/srt";
import { materializeMediaInput, pipelineFileUrl } from "@/lib/pipeline/local-input";
import { persistAndDurablize } from "@/lib/storage/durable-media";
import type { CaptionLine } from "@/lib/ad-pack-types";

export const runtime = "nodejs";
export const maxDuration = 120;

function parseCaptionLines(raw: unknown, durationSec = 60) {
  return parseCaptionLinesInput(raw, durationSec);
}

async function burnCaptionsJob(
  request: Request,
  input: {
    clerkId: string;
    videoUrl?: string;
    videoFile?: File;
    captionLines: CaptionLine[];
    captionStyle?: unknown;
  },
) {
  const jobId = crypto.randomUUID();
  const dir = jobDir(jobId);
  await fs.mkdir(dir, { recursive: true });

  const inputPath = path.join(dir, "input.mp4");
  const srtPath = path.join(dir, "captions.srt");
  const outputPath = path.join(dir, "subtitled.mp4");

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
  const captionLines = parseCaptionLinesInput(input.captionLines, durationSec);
  if (captionLines.length === 0) {
    throw new Error("caption_lines is required.");
  }

  const segments = captionLines.map((line) => ({
    start: line.startSec,
    end: line.endSec,
    text: line.text.trim(),
  }));

  await fs.writeFile(srtPath, buildSrt(segments), "utf8");

  const captionStyle = parseCaptionBurnStyleJson(input.captionStyle);

  let burnMethod: "overlay" | "drawtext" | "subtitles" | "soft" = preferDrawtextCaptionBurn()
    ? "drawtext"
    : "overlay";
  let softSubtitles = false;

  const tryOverlay = async () => {
    await burnCaptionsOverlay(inputPath, captionLines, outputPath, dir, captionStyle);
    burnMethod = "overlay";
  };
  const tryDrawtext = async () => {
    await burnCaptionsDrawtext(inputPath, captionLines, outputPath);
    burnMethod = "drawtext";
  };
  const trySubtitles = async () => {
    await burnSubtitles(inputPath, srtPath, outputPath);
    burnMethod = "subtitles";
  };
  const trySoft = async () => {
    await attachSoftSubtitleTrack(inputPath, srtPath, outputPath);
    burnMethod = "soft";
    softSubtitles = true;
  };

  // Vercel/Linux: drawtext first (bundled TTF). Overlay often "succeeds" with Latin tofu.
  // macOS: overlay first (styles), then drawtext. Soft CC is last resort only.
  const primary = preferDrawtextCaptionBurn()
    ? [tryDrawtext, tryOverlay]
    : [tryOverlay, tryDrawtext];
  const errors: string[] = [];

  let burned = false;
  for (const attempt of primary) {
    try {
      await attempt();
      burned = true;
      break;
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }
  if (!burned) {
    try {
      await trySubtitles();
      burned = true;
    } catch (subtitleError) {
      errors.push(
        subtitleError instanceof Error ? subtitleError.message : String(subtitleError),
      );
      await trySoft();
      console.warn("[burn-script-captions] burn fallback:", errors.join(" | "));
    }
  }

  if (softSubtitles) {
    console.warn(
      "[burn-script-captions] soft subtitles only — HTML5 player will not show captions",
      errors,
    );
  }

  const pipelineUrl = pipelineFileUrl(request, jobId, "subtitled.mp4");
  const bytes = await fs.readFile(outputPath);
  const videoUrl = await persistAndDurablize({
    clerkId: input.clerkId,
    kind: "video",
    sourceUrl: `burn-captions://${jobId}/subtitled.mp4`,
    fallbackUrl: pipelineUrl,
    bytes,
    contentType: "video/mp4",
    name: "burned-captions",
  });

  return {
    videoUrl,
    jobId,
    srtUrl: pipelineFileUrl(request, jobId, "captions.srt"),
    softSubtitles,
    burnMethod,
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
      const lines = parseCaptionLines(formData.get("caption_lines"));
      if (lines.length === 0) {
        return NextResponse.json({ error: "caption_lines is required." }, { status: 400 });
      }
      const file = videoFile instanceof File && videoFile.size > 0 ? videoFile : undefined;
      if (!file && !videoUrl) {
        return NextResponse.json(
          { error: "video_file or video_url is required." },
          { status: 400 },
        );
      }
      const styleRaw = formData.get("caption_style");
      let captionStyle: unknown;
      if (typeof styleRaw === "string" && styleRaw.trim()) {
        try {
          captionStyle = JSON.parse(styleRaw);
        } catch {
          captionStyle = styleRaw.trim();
        }
      }
      const result = await burnCaptionsJob(request, {
        clerkId: auth.user.userId,
        videoFile: file,
        videoUrl,
        captionLines: lines,
        captionStyle,
      });
      return NextResponse.json(result);
    }

    let body: { video_url?: string; caption_lines?: CaptionLine[]; caption_style?: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const videoUrl = body.video_url?.trim();
    if (!videoUrl) {
      return NextResponse.json({ error: "video_url is required." }, { status: 400 });
    }

    const lines = parseCaptionLines(body.caption_lines);
    if (lines.length === 0) {
      return NextResponse.json({ error: "caption_lines is required." }, { status: 400 });
    }

    const result = await burnCaptionsJob(request, {
      clerkId: auth.user.userId,
      videoUrl,
      captionLines: lines,
      captionStyle: body.caption_style,
    });
    return NextResponse.json(result);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Caption burn failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
