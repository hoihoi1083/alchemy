import { spawn } from "child_process";
import { promises as fs } from "fs";
import path from "path";
import { ensureFfmpeg } from "@/lib/pipeline/ffmpeg";

function run(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} exited ${code}: ${stderr}`));
    });
  });
}

export async function trimVideoFile(
  inputPath: string,
  outputPath: string,
  startSec: number,
  endSec: number,
): Promise<void> {
  await ensureFfmpeg();
  const start = Math.max(0, startSec);
  const duration = Math.max(0.1, endSec - start);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await run("ffmpeg", [
    "-y",
    "-ss",
    String(start),
    "-i",
    inputPath,
    "-t",
    String(duration),
    "-c:v",
    "libx264",
    "-preset",
    "fast",
    "-crf",
    "20",
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    "-movflags",
    "+faststart",
    outputPath,
  ]);
}
