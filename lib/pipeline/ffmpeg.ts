import { spawn } from "child_process";
import { promises as fs } from "fs";
import path from "path";
import { getFfmpegPath, getFfprobePath } from "@/lib/pipeline/ffmpeg-bins";
import { assertSafeRemoteMediaUrl } from "@/lib/pipeline/safe-url";

export { getFfmpegPath, getFfprobePath } from "@/lib/pipeline/ffmpeg-bins";

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

function runFfmpeg(args: string[]): Promise<void> {
  return run(getFfmpegPath(), args);
}

function runFfprobe(args: string[]): Promise<void> {
  return run(getFfprobePath(), args);
}

export async function ensureFfmpeg(): Promise<void> {
  try {
    await runFfmpeg(["-version"]);
    await runFfprobe(["-version"]);
  } catch {
    throw new Error(
      "ffmpeg/ffprobe not available on this server. Check that ffmpeg-static and ffprobe-static are installed.",
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
  await runFfmpeg([
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
  await runFfmpeg([
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
  const out = await runCapture(getFfprobePath(), [
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
    await runFfmpeg([
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
  const out = await runCapture(getFfprobePath(), [
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
  const out = await runCapture(getFfprobePath(), [
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
  await runFfmpeg([
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

/**
 * Place narration at natural speed: silence before `startOffsetSec`, then speech,
 * then pad/trim to `videoDurationSec`. Never time-stretches (no atempo).
 * If `maxSpeakSec` is set, trim speech so it cannot run past that length (avoids
 * overlapping the next caption clip).
 */
export async function placeNarrationNaturalSpeed(
  inputAudio: string,
  outputWav: string,
  videoDurationSec: number,
  startOffsetSec = 0,
  maxSpeakSec?: number,
): Promise<void> {
  const videoDur = Math.max(0.5, videoDurationSec);
  const delaySec = Math.max(0, Math.min(startOffsetSec, videoDur - 0.05));
  const delayMs = Math.round(delaySec * 1000);
  const speakCap =
    typeof maxSpeakSec === "number" && maxSpeakSec > 0.15
      ? Math.max(0.15, maxSpeakSec)
      : null;
  const fade = speakCap ? Math.min(0.08, speakCap * 0.15) : 0;
  const filters = [
    // Normalize decode quirks from 32 kHz TTS mp3 before delay/pad.
    "aformat=sample_rates=44100:channel_layouts=mono",
    speakCap
      ? `atrim=0:${speakCap.toFixed(3)},asetpts=PTS-STARTPTS,afade=t=out:st=${(speakCap - fade).toFixed(3)}:d=${fade.toFixed(3)}`
      : null,
    delayMs > 0 ? `adelay=${delayMs}|${delayMs}` : null,
    `apad=whole_dur=${videoDur.toFixed(3)}`,
    `atrim=0:${videoDur.toFixed(3)}`,
    "asetpts=PTS-STARTPTS",
  ]
    .filter(Boolean)
    .join(",");

  await runFfmpeg([
    "-y",
    "-i",
    inputAudio,
    "-af",
    filters,
    "-ac",
    "1",
    "-ar",
    "44100",
    "-c:a",
    "pcm_s16le",
    outputWav,
  ]);
}

/**
 * Mix several natural-speed clips onto one timeline (each starts at startSec).
 * Clips are trimmed so they do not overlap the next caption start (prevents
 * doubled/garbled voice when TTS is longer than the caption window).
 */
export async function mixTimedNarrationClips(
  clips: { path: string; startSec: number; endSec?: number }[],
  outputWav: string,
  videoDurationSec: number,
): Promise<void> {
  if (!clips.length) throw new Error("At least one narration clip is required.");
  const videoDur = Math.max(0.5, videoDurationSec);
  const ordered = [...clips].sort((a, b) => a.startSec - b.startSec);

  if (ordered.length === 1) {
    const maxSpeak =
      typeof ordered[0].endSec === "number"
        ? Math.max(0.2, ordered[0].endSec - ordered[0].startSec)
        : undefined;
    await placeNarrationNaturalSpeed(
      ordered[0].path,
      outputWav,
      videoDur,
      ordered[0].startSec,
      maxSpeak,
    );
    return;
  }

  const dir = path.dirname(outputWav);
  const base = path.basename(outputWav, path.extname(outputWav));
  const placed: string[] = [];
  for (let i = 0; i < ordered.length; i++) {
    const clip = ordered[i];
    const nextStart = ordered[i + 1]?.startSec ?? videoDur;
    const windowEnd =
      typeof clip.endSec === "number" && clip.endSec > clip.startSec
        ? clip.endSec
        : nextStart;
    // Leave a tiny gap before the next line so voices never stack.
    const maxSpeak = Math.max(
      0.2,
      Math.min(windowEnd, nextStart - 0.05) - clip.startSec,
    );
    const partPath = path.join(dir, `${base}-part${i}.wav`);
    await placeNarrationNaturalSpeed(
      clip.path,
      partPath,
      videoDur,
      clip.startSec,
      maxSpeak,
    );
    placed.push(partPath);
  }

  const inputs: string[] = [];
  for (const p of placed) {
    inputs.push("-i", p);
  }
  const labels = placed.map((_, i) => `[${i}:a]`).join("");
  // normalize=1 keeps summed peaks from distorting when any residual overlap remains.
  const filter = `${labels}amix=inputs=${placed.length}:duration=first:dropout_transition=0:normalize=1,asetpts=PTS-STARTPTS[aout]`;

  await runFfmpeg([
    "-y",
    ...inputs,
    "-filter_complex",
    filter,
    "-map",
    "[aout]",
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
    await runFfmpeg([
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

  await runFfmpeg([
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
    await runFfmpeg([
      "-y",
      "-i",
      inputVideo,
      "-stream_loop",
      "-1",
      "-i",
      musicPath,
      "-filter_complex",
      `[1:a]volume=${volume},loudnorm=I=-18:TP=-1.5:LRA=11,atrim=0:${dur},asetpts=PTS-STARTPTS[bgm];[0:a]volume=0.9[vid];[vid][bgm]amix=inputs=2:duration=first:dropout_transition=2[aout]`,
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

  await runFfmpeg([
    "-y",
    "-i",
    inputVideo,
    "-stream_loop",
    "-1",
    "-i",
    musicPath,
    "-filter_complex",
    `[1:a]volume=${volume},loudnorm=I=-16:TP=-1.5:LRA=11,atrim=0:${dur},asetpts=PTS-STARTPTS[aout]`,
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
    await runFfmpeg([
      "-y",
      "-i",
      inputVideo,
      "-i",
      narrationWav,
      "-filter_complex",
      `[0:a]volume=${bgmVolume}[bgm];[1:a]volume=1.4,apad=whole_dur=${dur},atrim=0:${dur},asetpts=PTS-STARTPTS[narr];[bgm][narr]amix=inputs=2:duration=first:dropout_transition=2:normalize=0,alimiter=limit=0.92:level=false[aout]`,
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

  await runFfmpeg([
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
  await runFfmpeg([
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
  await runFfmpeg([
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

  await runFfmpeg([
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
  await runFfmpeg([
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
