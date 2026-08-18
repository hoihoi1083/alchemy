/**
 * Append a clean still + independent 9:16 playback after a studio walkthrough.
 */
import { spawnSync } from "node:child_process";
import { existsSync, unlinkSync } from "node:fs";
import path from "node:path";

export const DEMO_W = 1280;
export const DEMO_H = 800;
export const DEMO_BG = "0x0c0a12";

export function probeDuration(file: string): number {
  const r = spawnSync(
    "ffprobe",
    ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file],
    { encoding: "utf8" },
  );
  return Number.parseFloat(r.stdout.trim()) || 0;
}

function ff(args: string[]) {
  const r = spawnSync("ffmpeg", args, { stdio: "inherit" });
  if (r.status !== 0) throw new Error(`ffmpeg failed (${r.status}): ${args.slice(0, 8).join(" ")}`);
}

const LETTERBOX = `scale=${DEMO_W}:${DEMO_H}:force_original_aspect_ratio=decrease,pad=${DEMO_W}:${DEMO_H}:(ow-iw)/2:(oh-ih)/2:color=${DEMO_BG},fps=30,format=yuv420p,setsar=1`;

export function extractOutputStill(outputMp4: string, destJpg: string, atSec = 0.35) {
  ff([
    "-y",
    "-ss",
    String(atSec),
    "-i",
    outputMp4,
    "-frames:v",
    "1",
    "-update",
    "1",
    "-q:v",
    "3",
    destJpg,
  ]);
}

/**
 * Cut the walkthrough at `trimWalkTo`, hold the output still, then play the
 * generated clip letterboxed (not the in-app player).
 */
export function appendHeroOutput(opts: {
  walkMp4: string;
  outputMp4: string;
  destMp4: string;
  destPoster?: string;
  trimWalkTo: number;
  stillHoldSec?: number;
}): { stillAt: number; playAt: number; duration: number } {
  const stillHold = opts.stillHoldSec ?? 1.7;
  const walkDur = probeDuration(opts.walkMp4);
  const trimTo = Math.max(1, Math.min(opts.trimWalkTo, walkDur - 0.05));
  const dir = path.dirname(opts.destMp4);
  const stillJpg = path.join(dir, `_hero-still-${Date.now()}.jpg`);
  const tmpOut = `${opts.destMp4}.hero-tmp.mp4`;

  extractOutputStill(opts.outputMp4, stillJpg);

  ff([
    "-y",
    "-i",
    opts.walkMp4,
    "-loop",
    "1",
    "-t",
    stillHold.toFixed(2),
    "-i",
    stillJpg,
    "-i",
    opts.outputMp4,
    "-f",
    "lavfi",
    "-t",
    stillHold.toFixed(2),
    "-i",
    "anullsrc=r=48000:cl=stereo",
    "-filter_complex",
    [
      `[0:v]trim=0:${trimTo.toFixed(2)},setpts=PTS-STARTPTS,fps=30,format=yuv420p,setsar=1,scale=${DEMO_W}:${DEMO_H}:force_original_aspect_ratio=decrease,pad=${DEMO_W}:${DEMO_H}:(ow-iw)/2:(oh-ih)/2:color=${DEMO_BG}[v0]`,
      `[1:v]${LETTERBOX}[v1]`,
      `[2:v]${LETTERBOX}[v2]`,
      `[v0][v1][v2]concat=n=3:v=1:a=0[v]`,
      `[0:a]atrim=0:${trimTo.toFixed(2)},asetpts=PTS-STARTPTS,aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo[a0]`,
      `[3:a]aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo,asetpts=PTS-STARTPTS[a1]`,
      `[2:a]aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo,asetpts=PTS-STARTPTS[a2]`,
      `[a0][a1][a2]concat=n=3:v=0:a=1[a]`,
    ].join(";"),
    "-map",
    "[v]",
    "-map",
    "[a]",
    "-c:v",
    "libx264",
    "-crf",
    "22",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    "-movflags",
    "+faststart",
    tmpOut,
  ]);

  ff(["-y", "-i", tmpOut, "-c", "copy", opts.destMp4]);
  unlinkSync(tmpOut);

  if (opts.destPoster) {
    ff([
      "-y",
      "-i",
      stillJpg,
      "-vf",
      LETTERBOX,
      "-frames:v",
      "1",
      "-update",
      "1",
      "-q:v",
      "4",
      opts.destPoster,
    ]);
  }
  if (existsSync(stillJpg)) unlinkSync(stillJpg);

  const duration = probeDuration(opts.destMp4);
  const stillAt = Number(trimTo.toFixed(2));
  const playAt = Number((trimTo + stillHold).toFixed(2));
  return { stillAt, playAt, duration: Number(duration.toFixed(2)) };
}
