import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/require-app-user";
import { bgmFilePath, DEFAULT_BGM_TRACK, type BgmTrackId } from "@/lib/bgm/tracks";
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

export async function POST(request: Request) {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;

  let body: { video_url?: string; track?: string; music_url?: string } | null = null;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const videoUrl = body?.video_url?.trim();
  if (!videoUrl) {
    return NextResponse.json({ error: "video_url is required." }, { status: 400 });
  }

  const customMusicUrl = body?.music_url?.trim();
  const track = (body?.track?.trim() || DEFAULT_BGM_TRACK) as BgmTrackId;

  const jobId = crypto.randomUUID();
  const dir = jobDir(jobId);
  await fs.mkdir(dir, { recursive: true });

  const inputPath = path.join(dir, "input.mp4");
  const outputPath = path.join(dir, "with-bgm.mp4");
  let musicPath: string;

  if (customMusicUrl) {
    musicPath = path.join(dir, "custom-bgm.mp3");
  } else {
    if (!TRACK_IDS.has(track)) {
      return NextResponse.json({ error: "Invalid track." }, { status: 400 });
    }
    musicPath = bgmFilePath(track);
    try {
      await fs.access(musicPath);
    } catch {
      return NextResponse.json(
        {
          error:
            "Background music files missing. Run: npm run setup:bgm (see public/bgm/README.md).",
          code: "BGM_FILES_MISSING",
        },
        { status: 503 },
      );
    }
  }

  try {
    await ensureFfmpeg();
    await materializeMediaInput(videoUrl, inputPath);
    if (customMusicUrl) {
      await materializeMediaInput(customMusicUrl, musicPath);
    }
    await addBackgroundMusic(inputPath, musicPath, outputPath);
    await assertVideoHasAudio(outputPath, "BGM mix");
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to add background music.";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  return NextResponse.json({
    videoUrl: pipelineFileUrl(request, jobId, "with-bgm.mp4"),
    jobId,
    track: customMusicUrl ? "ai" : track,
    source: customMusicUrl ? "ai" : "library",
  });
}
