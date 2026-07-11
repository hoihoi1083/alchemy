import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/require-app-user";
import { bgmFilePath, bgmMixVolume, DEFAULT_BGM_TRACK, type BgmTrackId } from "@/lib/bgm/tracks";
import {
  addBackgroundMusic,
  assertVideoHasAudio,
  ensureFfmpeg,
} from "@/lib/pipeline/ffmpeg";
import { jobDir } from "@/lib/pipeline/paths";
import { materializeMediaInput, pipelineFileUrl } from "@/lib/pipeline/local-input";

export const runtime = "nodejs";
export const maxDuration = 120;

const TRACK_IDS = new Set<BgmTrackId>(["calm", "upbeat", "warm"]);

async function mixBgmJob(
  request: Request,
  input: {
    videoUrl?: string;
    videoFile?: File;
    track: BgmTrackId;
    musicUrl?: string;
    replaceSourceAudio: boolean;
  },
) {
  const jobId = crypto.randomUUID();
  const dir = jobDir(jobId);
  await fs.mkdir(dir, { recursive: true });

  const inputPath = path.join(dir, "input.mp4");
  const outputPath = path.join(dir, "with-bgm.mp4");
  let musicPath: string;

  if (input.musicUrl) {
    musicPath = path.join(dir, "custom-bgm.mp3");
  } else {
    if (!TRACK_IDS.has(input.track)) {
      throw new Error("Invalid track.");
    }
    musicPath = bgmFilePath(input.track);
    try {
      await fs.access(musicPath);
    } catch {
      const err = new Error(
        "Background music files missing. Run: npm run setup:bgm (see public/bgm/README.md).",
      );
      (err as Error & { code?: string }).code = "BGM_FILES_MISSING";
      throw err;
    }
  }

  await ensureFfmpeg();
  if (input.videoFile && input.videoFile.size > 0) {
    const buffer = Buffer.from(await input.videoFile.arrayBuffer());
    await fs.writeFile(inputPath, buffer);
  } else if (input.videoUrl?.trim()) {
    await materializeMediaInput(input.videoUrl.trim(), inputPath);
  } else {
    throw new Error("video_url or video_file is required.");
  }

  if (input.musicUrl) {
    await materializeMediaInput(input.musicUrl, musicPath);
  }

  await addBackgroundMusic(
    inputPath,
    musicPath,
    outputPath,
    input.musicUrl ? 0.55 : bgmMixVolume(input.track),
    input.replaceSourceAudio,
  );
  await assertVideoHasAudio(outputPath, "BGM mix");

  return {
    videoUrl: pipelineFileUrl(request, jobId, "with-bgm.mp4"),
    jobId,
    track: input.musicUrl ? "ai" : input.track,
    source: input.musicUrl ? "ai" : "library",
    hasAudio: true,
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
      const track = ((formData.get("track") as string | null)?.trim() ||
        DEFAULT_BGM_TRACK) as BgmTrackId;
      const musicUrl = (formData.get("music_url") as string | null)?.trim();
      const replaceSourceAudio = formData.get("replace_source_audio") === "true";
      const file = videoFile instanceof File && videoFile.size > 0 ? videoFile : undefined;
      if (!file && !videoUrl) {
        return NextResponse.json(
          { error: "video_file or video_url is required." },
          { status: 400 },
        );
      }
      const result = await mixBgmJob(request, {
        videoFile: file,
        videoUrl,
        track,
        musicUrl,
        replaceSourceAudio,
      });
      return NextResponse.json(result);
    }

    let body: {
      video_url?: string;
      track?: string;
      music_url?: string;
      replace_source_audio?: boolean;
    } | null = null;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const videoUrl = body?.video_url?.trim();
    if (!videoUrl) {
      return NextResponse.json({ error: "video_url is required." }, { status: 400 });
    }

    const result = await mixBgmJob(request, {
      videoUrl,
      track: (body?.track?.trim() || DEFAULT_BGM_TRACK) as BgmTrackId,
      musicUrl: body?.music_url?.trim(),
      replaceSourceAudio: body?.replace_source_audio === true,
    });
    return NextResponse.json(result);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to add background music.";
    const code = e && typeof e === "object" && "code" in e ? String((e as { code: string }).code) : undefined;
    const status = code === "BGM_FILES_MISSING" ? 503 : 502;
    return NextResponse.json({ error: message, ...(code ? { code } : {}) }, { status });
  }
}
