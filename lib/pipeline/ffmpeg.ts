import { spawn } from "child_process";
import { promises as fs } from "fs";
import path from "path";
import { assertSafeRemoteMediaUrl } from "@/lib/pipeline/safe-url";

function run(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";

    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${cmd} exited ${code}: ${stderr}`));
      }
    });
  });
}

export async function ensureFfmpeg(): Promise<void> {
  try {
    await run("ffmpeg", ["-version"]);
    await run("ffprobe", ["-version"]);
  } catch {
    throw new Error(
      "ffmpeg/ffprobe not found. Install with `brew install ffmpeg` and retry.",
    );
  }
}

export async function downloadToFile(url: string, outPath: string): Promise<void> {
  const safeUrl = assertSafeRemoteMediaUrl(url);
  const res = await fetch(safeUrl, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to download video: ${res.status} ${res.statusText}`);
  }
  const data = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(outPath, data);
}

export async function extractAudioWav(
  inputVideo: string,
  outputWav: string,
): Promise<void> {
  await run("ffmpeg", [
    "-y",
    "-i",
    inputVideo,
    "-vn",
    "-ac",
    "1",
    "-ar",
    "16000",
    "-c:a",
    "pcm_s16le",
    outputWav,
  ]);
}

export async function mergeAudioIntoVideo(
  inputVideo: string,
  inputAudio: string,
  outputVideo: string,
): Promise<void> {
  await run("ffmpeg", [
    "-y",
    "-i",
    inputVideo,
    "-i",
    inputAudio,
    "-map",
    "0:v:0",
    "-map",
    "1:a:0",
    "-c:v",
    "copy",
    "-c:a",
    "aac",
    "-shortest",
    outputVideo,
  ]);
}

function runCapture(cmd: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(stdout.trim());
      else reject(new Error(`${cmd} exited ${code}: ${stderr}`));
    });
  });
}

export async function getMediaDurationSeconds(filePath: string): Promise<number> {
  const out = await runCapture("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "default=noprint_wrappers=1:nokey=1",
    filePath,
  ]);
  const n = parseFloat(out);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error("Could not read video duration.");
  }
  return n;
}

/** Sample JPEG stills along a reel timeline for vision analysis. */
export async function extractVideoFrames(
  inputVideo: string,
  outputDir: string,
  options?: { maxFrames?: number; minFrames?: number; maxDurationSec?: number },
): Promise<{ paths: string[]; timesSec: number[] }> {
  const maxFrames = options?.maxFrames ?? 6;
  const minFrames = options?.minFrames ?? 3;
  const fullDuration = await getMediaDurationSeconds(inputVideo);
  const duration =
    options?.maxDurationSec != null
      ? Math.min(fullDuration, options.maxDurationSec)
      : fullDuration;
  const frameCount = Math.min(maxFrames, Math.max(minFrames, Math.round(duration / 2)));
  const paths: string[] = [];
  const timesSec: number[] = [];

  for (let i = 0; i < frameCount; i++) {
    const t = (duration * (i + 1)) / (frameCount + 1);
    const out = path.join(outputDir, `frame-${String(i + 1).padStart(2, "0")}.jpg`);
    await run("ffmpeg", [
      "-y",
      "-ss",
      String(t),
      "-i",
      inputVideo,
      "-frames:v",
      "1",
      "-q:v",
      "2",
      out,
    ]);
    paths.push(out);
    timesSec.push(t);
  }

  return { paths, timesSec };
}

export async function getVideoDimensions(
  filePath: string,
): Promise<{ width: number; height: number }> {
  const out = await runCapture("ffprobe", [
    "-v",
    "error",
    "-select_streams",
    "v:0",
    "-show_entries",
    "stream=width,height",
    "-of",
    "csv=p=0:s=x",
    filePath,
  ]);
  const [widthRaw, heightRaw] = out.split("x");
  const width = Number.parseInt(widthRaw, 10);
  const height = Number.parseInt(heightRaw, 10);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error("Could not read video dimensions.");
  }
  return { width, height };
}

export async function videoHasAudioStream(filePath: string): Promise<boolean> {
  const out = await runCapture("ffprobe", [
    "-v",
    "error",
    "-select_streams",
    "a",
    "-show_entries",
    "stream=index",
    "-of",
    "csv=p=0",
    filePath,
  ]);
  return out.length > 0;
}

/** Convert any audio file to mono WAV for mixing. */
export async function convertAudioToWav(inputAudio: string, outputWav: string): Promise<void> {
  await run("ffmpeg", [
    "-y",
    "-i",
    inputAudio,
    "-ac",
    "1",
    "-ar",
    "44100",
    "-c:a",
    "pcm_s16le",
    outputWav,
  ]);
}

/** Speed up or pad narration so it fits the video duration. */
export async function fitAudioToDuration(
  inputAudio: string,
  outputWav: string,
  targetSec: number,
): Promise<void> {
  const dur = await getMediaDurationSeconds(inputAudio);
  const target = Math.max(0.5, targetSec);

  if (Math.abs(dur - target) < 0.12) {
    await convertAudioToWav(inputAudio, outputWav);
    return;
  }

  if (dur > target) {
    let speed = dur / target;
    const filters: string[] = [];
    while (speed > 2.0) {
      filters.push("atempo=2.0");
      speed /= 2.0;
    }
    while (speed < 0.5) {
      filters.push("atempo=0.5");
      speed /= 0.5;
    }
    filters.push(`atempo=${speed.toFixed(4)}`);
    await run("ffmpeg", [
      "-y",
      "-i",
      inputAudio,
      "-filter:a",
      filters.join(","),
      "-t",
      target.toFixed(3),
      "-ac",
      "1",
      "-ar",
      "44100",
      "-c:a",
      "pcm_s16le",
      outputWav,
    ]);
    return;
  }

  await run("ffmpeg", [
    "-y",
    "-i",
    inputAudio,
    "-af",
    `apad=pad_dur=${target.toFixed(3)}`,
    "-t",
    target.toFixed(3),
    "-ac",
    "1",
    "-ar",
    "44100",
    "-c:a",
    "pcm_s16le",
    outputWav,
  ]);
}

export async function assertVideoHasAudio(filePath: string, label: string): Promise<void> {
  if (!(await videoHasAudioStream(filePath))) {
    throw new Error(`${label} has no audio track after processing.`);
  }
}

/** Loop background music to video length; mix with existing audio if present. */
export async function addBackgroundMusic(
  inputVideo: string,
  musicPath: string,
  outputVideo: string,
  volume = 0.28,
  /** When true, drop any Seedance/reference speech before adding BGM only. */
  replaceExistingAudio = false,
): Promise<void> {
  const duration = await getMediaDurationSeconds(inputVideo);
  const hasAudio =
    !replaceExistingAudio && (await videoHasAudioStream(inputVideo));
  const dur = duration.toFixed(3);

  if (hasAudio) {
    await run("ffmpeg", [
      "-y",
      "-i",
      inputVideo,
      "-stream_loop",
      "-1",
      "-i",
      musicPath,
      "-filter_complex",
      `[1:a]volume=${volume},atrim=0:${dur},asetpts=PTS-STARTPTS[bgm];[0:a]volume=0.9[vid];[vid][bgm]amix=inputs=2:duration=first:dropout_transition=2[aout]`,
      "-map",
      "0:v:0",
      "-map",
      "[aout]",
      "-c:v",
      "copy",
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      "-t",
      dur,
      outputVideo,
    ]);
    return;
  }

  await run("ffmpeg", [
    "-y",
    "-i",
    inputVideo,
    "-stream_loop",
    "-1",
    "-i",
    musicPath,
    "-filter_complex",
    `[1:a]volume=${volume},atrim=0:${dur},asetpts=PTS-STARTPTS[aout]`,
    "-map",
    "0:v:0",
    "-map",
    "[aout]",
    "-c:v",
    "copy",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-t",
    dur,
    outputVideo,
  ]);
}

/** Mix TTS narration over existing video audio (BGM), ducking background. */
export async function mixNarrationOverVideo(
  inputVideo: string,
  narrationWav: string,
  outputVideo: string,
  bgmVolume = 0.22,
): Promise<void> {
  const duration = await getMediaDurationSeconds(inputVideo);
  const hasAudio = await videoHasAudioStream(inputVideo);
  const dur = duration.toFixed(3);

  if (hasAudio) {
    await run("ffmpeg", [
      "-y",
      "-i",
      inputVideo,
      "-i",
      narrationWav,
      "-filter_complex",
      `[0:a]volume=${bgmVolume}[bgm];[1:a]apad=whole_dur=${dur},atrim=0:${dur},asetpts=PTS-STARTPTS[narr];[bgm][narr]amix=inputs=2:duration=first:dropout_transition=2[aout]`,
      "-map",
      "0:v:0",
      "-map",
      "[aout]",
      "-c:v",
      "copy",
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      "-t",
      dur,
      outputVideo,
    ]);
    return;
  }

  await run("ffmpeg", [
    "-y",
    "-i",
    inputVideo,
    "-i",
    narrationWav,
    "-filter_complex",
    `[1:a]atrim=0:${dur},asetpts=PTS-STARTPTS[aout]`,
    "-map",
    "0:v:0",
    "-map",
    "[aout]",
    "-c:v",
    "copy",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-t",
    dur,
    outputVideo,
  ]);
}

function escapeSubtitlePathForFilter(inputPath: string): string {
  const normalized = path.resolve(inputPath);
  return normalized.replace(/\\/g, "\\\\").replace(/:/g, "\\:").replace(/'/g, "\\'");
}

/** libass style for burned 繁體/简体 captions (macOS PingFang; fallback fonts in force_style). */
function subtitleBurnFilter(inputSrt: string): string {
  const escaped = escapeSubtitlePathForFilter(inputSrt);
  const style = [
    "FontName=PingFang TC",
    "Fontsize=22",
    "PrimaryColour=&H00FFFFFF",
    "OutlineColour=&H00000000",
    "Outline=2",
    "Shadow=1",
    "Alignment=2",
    "MarginV=72",
  ].join(",");
  return `subtitles='${escaped}':force_style='${style}'`;
}

export async function burnSubtitles(
  inputVideo: string,
  inputSrt: string,
  outputVideo: string,
): Promise<void> {
  await run("ffmpeg", [
    "-y",
    "-i",
    inputVideo,
    "-vf",
    subtitleBurnFilter(inputSrt),
    "-c:a",
    "copy",
    outputVideo,
  ]);
}

export async function attachSoftSubtitleTrack(
  inputVideo: string,
  inputSrt: string,
  outputVideo: string,
): Promise<void> {
  await run("ffmpeg", [
    "-y",
    "-i",
    inputVideo,
    "-i",
    inputSrt,
    "-map",
    "0",
    "-map",
    "1:0",
    "-c",
    "copy",
    "-c:s",
    "mov_text",
    "-metadata:s:s:0",
    "language=zho",
    outputVideo,
  ]);
}

/** Encode PNG frame sequence (frame_0000.png …) to H.264 MP4. */
/** Concatenate MP4 clips in order (re-encode for codec consistency). */
export async function concatVideos(inputPaths: string[], outputVideo: string): Promise<void> {
  if (inputPaths.length === 0) {
    throw new Error("No input videos to concatenate.");
  }
  if (inputPaths.length === 1) {
    await fs.copyFile(inputPaths[0], outputVideo);
    return;
  }

  const listPath = path.join(path.dirname(outputVideo), "concat-list.txt");
  const listBody = inputPaths
    .map((p) => `file '${path.resolve(p).replace(/'/g, "'\\''")}'`)
    .join("\n");
  await fs.writeFile(listPath, listBody);

  await run("ffmpeg", [
    "-y",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    listPath,
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-movflags",
    "+faststart",
    outputVideo,
  ]);
}

export async function encodeImageSequence(
  framesDir: string,
  outputVideo: string,
  fps: number,
  durationSec: number,
): Promise<void> {
  const pattern = path.join(framesDir, "frame_%04d.png");
  await run("ffmpeg", [
    "-y",
    "-framerate",
    String(fps),
    "-i",
    pattern,
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    "-t",
    String(durationSec),
    outputVideo,
  ]);
}
