import { spawn } from "child_process";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { parseSrtToTranscript } from "@/lib/pipeline/parseSrt";
import { TranscriptResult } from "@/lib/pipeline/types";

function run(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (buf: Buffer) => {
      stderr += buf.toString("utf8");
    });
    child.on("error", (error) => reject(error));
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} exited ${code}: ${stderr}`));
    });
  });
}

function defaultWhisperModelPath(): string {
  return path.join(os.homedir(), "Downloads", "ggml-base.bin");
}

async function ensureWhisperCliAvailable(): Promise<void> {
  try {
    await run("whisper-cli", ["--help"]);
  } catch {
    throw new Error(
      "whisper-cli not found. Install with `brew install whisper-cpp`.",
    );
  }
}

async function ensureWhisperModel(modelPath: string): Promise<void> {
  try {
    await fs.access(modelPath);
  } catch {
    throw new Error(
      `Whisper model missing at ${modelPath}. Download one model (e.g. ggml-base.bin) and set WHISPER_MODEL_PATH in .env.local.`,
    );
  }
}

export async function transcribeWithLocalWhisper(args: {
  wavPath: string;
  outputBase: string;
}): Promise<{ transcript: TranscriptResult; srtText: string; srtPath: string }> {
  const modelPath =
    process.env.WHISPER_MODEL_PATH?.trim() || defaultWhisperModelPath();
  await ensureWhisperCliAvailable();
  await ensureWhisperModel(modelPath);

  const { wavPath, outputBase } = args;
  await run("whisper-cli", [
    "-m",
    modelPath,
    "-f",
    wavPath,
    "-l",
    "auto",
    "-osrt",
    "-of",
    outputBase,
    "-np",
  ]);

  const srtPath = `${outputBase}.srt`;
  const srtText = await fs.readFile(srtPath, "utf8");
  const transcript = parseSrtToTranscript(srtText);
  if (!transcript.segments.length) {
    throw new Error("Local whisper produced empty subtitles.");
  }

  return { transcript, srtText, srtPath };
}
