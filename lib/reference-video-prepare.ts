import { mkdtemp, readFile, rm, writeFile } from "fs/promises";
import path from "path";
import { tmpdir } from "os";
import { ensureFfmpeg, getMediaDurationSeconds } from "@/lib/pipeline/ffmpeg";

export const SEEDANCE_MAX_REFERENCE_SEC = 15;
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

    if (sourceDurationSec <= maxSec + 0.25) {
      return {
        buffer: input,
        durationSec: sourceDurationSec,
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
    const buffer = await readFile(outputPath);
    const durationSec = await getMediaDurationSeconds(outputPath);

    return {
      buffer,
      durationSec,
      digestMontage: true,
      sourceDurationSec,
    };
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
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
    const child = spawn("ffmpeg", args, { stdio: ["ignore", "pipe", "pipe"] });
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
    const child = spawn("ffmpeg", args, { stdio: ["ignore", "pipe", "pipe"] });
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
