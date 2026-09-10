import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { chargeTokens, refundTokens } from "@/lib/billing/charge";
import { TOKEN_COST } from "@/lib/billing/token-costs";
import { requireAppUser } from "@/lib/require-app-user";
import { bgmFilePath, bgmMixVolume, DEFAULT_BGM_TRACK, type BgmTrackId } from "@/lib/bgm/tracks";
import {
  addBackgroundMusic,
  assertVideoHasAudio,
  ensureFfmpeg,
} from "@/lib/pipeline/ffmpeg";
import { createOwnedJobDir } from "@/lib/pipeline/job-owner";
import { materializeMediaInput, pipelineFileUrl } from "@/lib/pipeline/local-input";
import { persistAndDurablize } from "@/lib/storage/durable-media";

export const runtime = "nodejs";
export const maxDuration = 120;

const TRACK_IDS = new Set<BgmTrackId>(["calm", "upbeat", "warm"]);

async function mixBgmJob(
  request: Request,
  input: {
    clerkId: string;
    videoUrl?: string;
    videoFile?: File;
    track: BgmTrackId;
    musicUrl?: string;
    replaceSourceAudio: boolean;
    /** BGM lane start offset in seconds (silence before music). */
    startSec?: number;
    /** How long BGM plays after start (seconds). */
    durationSec?: number;
    /** Absolute ffmpeg volume multiplier (typical 0.2–1.5). */
    volume?: number;
    persistUserId?: string;
  },
) {
  const { jobId, dir } = await createOwnedJobDir(input.clerkId);

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
    await materializeMediaInput(input.videoUrl.trim(), inputPath, { clerkId: input.clerkId });
  } else {
    throw new Error("video_url or video_file is required.");
  }

  if (input.musicUrl) {
    await materializeMediaInput(input.musicUrl, musicPath, { clerkId: input.clerkId });
  }

  await addBackgroundMusic(
    inputPath,
    musicPath,
    outputPath,
    typeof input.volume === "number" && Number.isFinite(input.volume)
      ? Math.min(2, Math.max(0.05, input.volume))
      : input.musicUrl
        ? 0.55
        : bgmMixVolume(input.track),
    input.replaceSourceAudio,
    Math.max(0, Number(input.startSec) || 0),
    typeof input.durationSec === "number" && Number.isFinite(input.durationSec)
      ? Math.max(0.2, input.durationSec)
      : undefined,
  );
  await assertVideoHasAudio(outputPath, "BGM mix");

  const pipelineUrl = pipelineFileUrl(request, jobId, "with-bgm.mp4");
  const bytes = await fs.readFile(outputPath);
  const videoUrl = await persistAndDurablize({
    clerkId: input.clerkId,
    kind: "video",
    sourceUrl: `bgm://${jobId}/with-bgm.mp4`,
    fallbackUrl: pipelineUrl,
    bytes,
    contentType: "video/mp4",
    name: "Video with music",
  });

  return {
    videoUrl,
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
  const tokenCost = TOKEN_COST.bgm;

  try {
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const videoFile = formData.get("video_file");
      const videoUrl = (formData.get("video_url") as string | null)?.trim();
      const track = ((formData.get("track") as string | null)?.trim() ||
        DEFAULT_BGM_TRACK) as BgmTrackId;
      const musicUrl = (formData.get("music_url") as string | null)?.trim();
      const replaceSourceAudio = formData.get("replace_source_audio") === "true";
      const startSec = Math.max(
        0,
        Number(formData.get("start_sec") ?? formData.get("bgm_start_sec")) || 0,
      );
      const durationRaw = Number(
        formData.get("duration_sec") ?? formData.get("bgm_duration_sec"),
      );
      const durationSec =
        Number.isFinite(durationRaw) && durationRaw > 0 ? durationRaw : undefined;
      const volumeRaw = Number(formData.get("volume") ?? formData.get("bgm_volume"));
      const volume =
        Number.isFinite(volumeRaw) && volumeRaw > 0 ? volumeRaw : undefined;
      const file = videoFile instanceof File && videoFile.size > 0 ? videoFile : undefined;
      if (!file && !videoUrl) {
        return NextResponse.json(
          { error: "video_file or video_url is required." },
          { status: 400 },
        );
      }

      const charged = await chargeTokens(auth.user.userId, tokenCost, { kind: "bgm" });
      if ("error" in charged) return charged.error;

      try {
        const result = await mixBgmJob(request, {
          clerkId: auth.user.userId,
          videoFile: file,
          videoUrl,
          track,
          musicUrl,
          replaceSourceAudio,
          startSec,
          durationSec,
          volume,
          persistUserId: auth.user.userId,
        });
        return NextResponse.json({
          ...result,
          tokensCharged: tokenCost,
          creditBalance: charged.balanceAfter,
        });
      } catch (e: unknown) {
        await refundTokens(auth.user.userId, tokenCost, {
          kind: "bgm",
          reason: "generation_failed",
        });
        const message = e instanceof Error ? e.message : "Failed to add background music.";
        const code =
          e && typeof e === "object" && "code" in e
            ? String((e as { code: string }).code)
            : undefined;
        const status = code === "BGM_FILES_MISSING" ? 503 : 502;
        return NextResponse.json({ error: message, ...(code ? { code } : {}) }, { status });
      }
    }

    let body: {
      video_url?: string;
      track?: string;
      music_url?: string;
      replace_source_audio?: boolean;
      start_sec?: number;
      bgm_start_sec?: number;
      duration_sec?: number;
      bgm_duration_sec?: number;
      volume?: number;
      bgm_volume?: number;
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

    const charged = await chargeTokens(auth.user.userId, tokenCost, { kind: "bgm" });
    if ("error" in charged) return charged.error;

    try {
      const result = await mixBgmJob(request, {
        clerkId: auth.user.userId,
        videoUrl,
        track: (body?.track?.trim() || DEFAULT_BGM_TRACK) as BgmTrackId,
        musicUrl: body?.music_url?.trim(),
        replaceSourceAudio: body?.replace_source_audio === true,
        startSec: Math.max(
          0,
          Number(body?.start_sec ?? body?.bgm_start_sec) || 0,
        ),
        durationSec: (() => {
          const v = Number(body?.duration_sec ?? body?.bgm_duration_sec);
          return Number.isFinite(v) && v > 0 ? v : undefined;
        })(),
        volume: (() => {
          const v = Number(body?.volume ?? body?.bgm_volume);
          return Number.isFinite(v) && v > 0 ? v : undefined;
        })(),
        persistUserId: auth.user.userId,
      });
      return NextResponse.json({
        ...result,
        tokensCharged: tokenCost,
        creditBalance: charged.balanceAfter,
      });
    } catch (e: unknown) {
      await refundTokens(auth.user.userId, tokenCost, {
        kind: "bgm",
        reason: "generation_failed",
      });
      const message = e instanceof Error ? e.message : "Failed to add background music.";
      const code =
        e && typeof e === "object" && "code" in e
          ? String((e as { code: string }).code)
          : undefined;
      const status = code === "BGM_FILES_MISSING" ? 503 : 502;
      return NextResponse.json({ error: message, ...(code ? { code } : {}) }, { status });
    }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to add background music.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
