import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import os from "os";
import { requireAppUser } from "@/lib/require-app-user";
import { ensureFfmpeg, extractAudioWav } from "@/lib/pipeline/ffmpeg";
import { materializeMediaInput } from "@/lib/pipeline/local-input";
import { detectBeatTimes } from "@/lib/beat-detect";

export const runtime = "nodejs";
export const maxDuration = 60;

async function readWavPcm(wavPath: string): Promise<{ samples: Float32Array; sampleRate: number }> {
  const buf = await fs.readFile(wavPath);
  if (buf.length < 44) throw new Error("Invalid WAV");
  const sampleRate = buf.readUInt32LE(24);
  const bits = buf.readUInt16LE(34);
  const dataOffset = 44;
  const dataLen = buf.length - dataOffset;
  const samples = new Float32Array(Math.floor(dataLen / (bits / 8)));
  if (bits === 16) {
    for (let i = 0; i < samples.length; i++) {
      samples[i] = buf.readInt16LE(dataOffset + i * 2) / 32768;
    }
  }
  return { samples, sampleRate };
}

export async function POST(req: Request) {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;

  const body = (await req.json()) as { video_url?: string; bgm_url?: string };
  const videoUrl = body.video_url?.trim();
  const bgmUrl = body.bgm_url?.trim();
  const sourceUrl = bgmUrl || videoUrl;

  if (!sourceUrl) {
    return NextResponse.json({ error: "Provide video_url or bgm_url." }, { status: 400 });
  }

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "alchemy-beats-"));
  try {
    await ensureFfmpeg();
    const mediaPath = path.join(tmpDir, "media.mp4");
    const wavPath = path.join(tmpDir, "audio.wav");
    // Supports pipeline-files, library assets, and allowlisted remote HTTPS.
    await materializeMediaInput(sourceUrl, mediaPath);
    await extractAudioWav(mediaPath, wavPath);
    const { samples, sampleRate } = await readWavPcm(wavPath);
    const durationSec = samples.length / sampleRate;
    const beats = detectBeatTimes(samples, sampleRate, durationSec);
    const bpmEstimate =
      beats.length > 1 && durationSec > 0
        ? Math.round((beats.length / durationSec) * 60)
        : 120;
    return NextResponse.json({ beats, durationSec, bpmEstimate });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Beat analysis failed" },
      { status: 502 },
    );
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}
