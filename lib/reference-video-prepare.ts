import { mkdtemp, readFile, rm, writeFile } from "fs/promises";
import path from "path";
import { tmpdir } from "os";
import { ensureFfmpeg, getFfmpegPath, getMediaDurationSeconds } from "@/lib/pipeline/ffmpeg";

export const SEEDANCE_MAX_REFERENCE_SEC = 15;
/** MiniMax H3 rejects refs at/over 15.0s — keep a safety margin under fal's check. */
export const MINIMAX_MAX_REFERENCE_SEC = 14.5;
/** Stay under Vercel ~4.5MB multipart body when the browser re-uploads a clip. */
export const VERCEL_SAFE_REFERENCE_BYTES = Math.floor(3.5 * 1024 * 1024);
const DIGEST_SEGMENT_COUNT = 5;

/** Start times (seconds) for a montage that samples hook → middle → payoff across a long reel. */
export function computeDigestSegmentStarts(
  sourceDurSec: number,
  maxSec = SEEDANCE_MAX_REFERENCE_SEC,
  segmentCount = DIGEST_SEGMENT_COUNT,
): number[] {
  if (sourceDurSec <= maxSec + 0.25) return [0];
  const segDur = maxSec / segmentCount;
  return Array.from({ length: segmentCount }, (_, i) => {
    const ratio =
      segmentCount === 1 ? 0.05 : 0.03 + (0.94 * i) / (segmentCount - 1);
    const t = sourceDurSec * ratio;
    return Math.max(0, Math.min(sourceDurSec - segDur - 0.05, t));
  });
}

export type SeedanceReferenceClipResult = {
  buffer: Buffer;
  durationSec: number;
  /** True when a multi-beat digest montage replaced head-only trim. */
  digestMontage: boolean;
  sourceDurationSec: number;
};

/**
 * Build the MP4 Seedance sees as @Video1.
 * Short clips pass through; long reels become a ~15s montage (hook + middle + CTA beats).
 */
export async function buildSeedanceReferenceClip(
  input: Buffer,
  maxSec = SEEDANCE_MAX_REFERENCE_SEC,
): Promise<SeedanceReferenceClipResult> {
  await ensureFfmpeg();
  const workDir = await mkdtemp(path.join(tmpdir(), "ref-clip-"));
  const inputPath = path.join(workDir, "input.mp4");
  const outputPath = path.join(workDir, "output.mp4");

  try {
    await writeFile(inputPath, input);
    const sourceDurationSec = await getMediaDurationSeconds(inputPath);

    // Always re-cut when at/over the limit (pass-through near 15s still fails MiniMax/Seedance).
    if (sourceDurationSec <= maxSec - 0.05) {
      return {
        buffer: input,
        durationSec: sourceDurationSec,
        digestMontage: false,
        sourceDurationSec,
      };
    }

    // Slightly long but under ~20s: simple head trim is enough (and stays under maxSec).
    if (sourceDurationSec <= maxSec + 8) {
      await extractVideoSegment(inputPath, outputPath, 0, maxSec - 0.1);
      const buffer = await readFile(outputPath);
      const durationSec = await getMediaDurationSeconds(outputPath);
      return {
        buffer,
        durationSec: Math.min(durationSec, maxSec),
        digestMontage: false,
        sourceDurationSec,
      };
    }

    const starts = computeDigestSegmentStarts(sourceDurationSec, maxSec);
    const segDur = maxSec / starts.length;
    const segmentPaths: string[] = [];

    for (let i = 0; i < starts.length; i++) {
      const segPath = path.join(workDir, `seg-${i}.mp4`);
      await extractVideoSegment(inputPath, segPath, starts[i], segDur);
      segmentPaths.push(segPath);
    }

    await concatVideoSegments(segmentPaths, outputPath);
    let buffer = await readFile(outputPath);
    let durationSec = await getMediaDurationSeconds(outputPath);

    // fal MiniMax treats 15.0 as over — hard-cap after montage.
    if (durationSec > maxSec - 0.05) {
      const cappedPath = path.join(workDir, "capped.mp4");
      await extractVideoSegment(outputPath, cappedPath, 0, maxSec - 0.15);
      buffer = await readFile(cappedPath);
      durationSec = await getMediaDurationSeconds(cappedPath);
    }

    return {
      buffer,
      durationSec: Math.min(durationSec, maxSec),
      digestMontage: true,
      sourceDurationSec,
    };
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

/**
 * Re-encode a prepared reference clip when it is still too large for Vercel uploads.
 * Scales to max 720p and raises CRF — motion beats are preserved, fine detail may soften.
 */
export async function compressReferenceClipIfNeeded(
  input: Buffer,
  maxBytes = VERCEL_SAFE_REFERENCE_BYTES,
): Promise<{ buffer: Buffer; compressed: boolean }> {
  if (input.byteLength <= maxBytes) {
    return { buffer: input, compressed: false };
  }
  await ensureFfmpeg();
  const workDir = await mkdtemp(path.join(tmpdir(), "ref-compress-"));
  const inputPath = path.join(workDir, "input.mp4");
  const outputPath = path.join(workDir, "output.mp4");
  try {
    await writeFile(inputPath, input);
    const { spawn } = await import("child_process");
    await new Promise<void>((resolve, reject) => {
      const args = [
        "-y",
        "-i",
        inputPath,
        "-vf",
        "scale='min(1280,iw)':-2",
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "28",
        "-c:a",
        "aac",
        "-b:a",
        "96k",
        "-movflags",
        "+faststart",
        outputPath,
      ];
      const child = spawn(getFfmpegPath(), args, { stdio: ["ignore", "pipe", "pipe"] });
      let stderr = "";
      child.stderr.on("data", (c: Buffer) => {
        stderr += c.toString();
      });
      child.on("error", reject);
      child.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`ffmpeg compress failed (${code}): ${stderr.slice(-400)}`));
      });
    });
    const buffer = await readFile(outputPath);
    return { buffer, compressed: true };
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

/** Trim + optional compress — safe for wizard download and analyze fallbacks. */
export async function buildWizardResearchReferenceClip(
  input: Buffer,
  maxSec = MINIMAX_MAX_REFERENCE_SEC,
): Promise<SeedanceReferenceClipResult & { buffer: Buffer }> {
  const clip = await buildSeedanceReferenceClip(input, maxSec);
  const compressed = await compressReferenceClipIfNeeded(clip.buffer);
  return { ...clip, buffer: compressed.buffer };
}

/** @deprecated Use buildSeedanceReferenceClip — kept for callers expecting trim-only API. */
export async function trimVideoBufferForSeedance(
  input: Buffer,
  maxSec = SEEDANCE_MAX_REFERENCE_SEC,
): Promise<{ buffer: Buffer; durationSec: number; trimmed: boolean }> {
  const clip = await buildSeedanceReferenceClip(input, maxSec);
  return {
    buffer: clip.buffer,
    durationSec: clip.durationSec,
    trimmed: clip.digestMontage || clip.sourceDurationSec > maxSec + 0.25,
  };
}

async function extractVideoSegment(
  input: string,
  output: string,
  startSec: number,
  durationSec: number,
): Promise<void> {
  const { spawn } = await import("child_process");
  await new Promise<void>((resolve, reject) => {
    const args = [
      "-y",
      "-ss",
      String(startSec),
      "-i",
      input,
      "-t",
      String(durationSec),
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "23",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      "-movflags",
      "+faststart",
      output,
    ];
    const child = spawn(getFfmpegPath(), args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (c: Buffer) => {
      stderr += c.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg segment failed (${code}): ${stderr.slice(-400)}`));
    });
  });
}

async function concatVideoSegments(segmentPaths: string[], output: string): Promise<void> {
  const { spawn } = await import("child_process");
  const listPath = path.join(path.dirname(output), "concat.txt");
  const list = segmentPaths
    .map((p) => `file '${p.replace(/'/g, "'\\''")}'`)
    .join("\n");
  await writeFile(listPath, list);

  await new Promise<void>((resolve, reject) => {
    const args = [
      "-y",
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      listPath,
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "23",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      "-movflags",
      "+faststart",
      output,
    ];
    const child = spawn(getFfmpegPath(), args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (c: Buffer) => {
      stderr += c.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg concat failed (${code}): ${stderr.slice(-400)}`));
    });
  });
}
