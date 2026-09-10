/**
 * Generate three distinct library BGM demos via fal (Sonilo / MiniMax) and
 * write them to public/bgm/{calm,upbeat,warm}.mp3
 *
 * Usage: npx tsx scripts/generate-library-bgm.ts
 * Requires FAL_KEY in env or .env.local
 */
import { promises as fs } from "fs";
import path from "path";
import { fal } from "@fal-ai/client";

const ROOT = path.join(__dirname, "..");
const OUT_DIR = path.join(ROOT, "public", "bgm");

const TRACKS: { id: "calm" | "upbeat" | "warm"; file: string; prompt: string }[] = [
  {
    id: "calm",
    file: "calm.mp3",
    prompt:
      "Soft instrumental ambient pad for a short product ad, gentle warm synths, no drums, no vocals, peaceful modern lifestyle, 30 seconds, clean mix",
  },
  {
    id: "upbeat",
    file: "upbeat.mp3",
    prompt:
      "Upbeat instrumental promo music with clear light beat, catchy modern electronic pop for social ads, energetic but not harsh, no vocals, 30 seconds, clean mix",
  },
  {
    id: "warm",
    file: "warm.mp3",
    prompt:
      "Warm acoustic-style instrumental for lifestyle ads, soft guitar or piano melody, cozy friendly mood, light rhythm, no vocals, 30 seconds, clean mix",
  },
];

function loadEnvLocal() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const dotenv = require("dotenv");
    dotenv.config({ path: path.join(ROOT, ".env.local") });
  } catch {
    /* optional */
  }
}

function extractAudioUrl(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const d = data as Record<string, unknown>;
  if (d.audio && typeof d.audio === "object" && d.audio !== null) {
    const url = (d.audio as { url?: unknown }).url;
    if (typeof url === "string") return url;
  }
  if (Array.isArray(d.audios) && d.audios[0] && typeof d.audios[0] === "object") {
    const url = (d.audios[0] as { url?: unknown }).url;
    if (typeof url === "string") return url;
  }
  return undefined;
}

async function generateOne(prompt: string): Promise<string> {
  try {
    const result = await fal.subscribe("sonilo/v1.1/text-to-music", {
      input: { prompt, duration: 30, num_samples: 1 },
      logs: false,
    });
    const url = extractAudioUrl(result.data);
    if (url) return url;
  } catch (e) {
    console.warn("sonilo failed, trying minimax:", e instanceof Error ? e.message : e);
  }

  const result = await fal.subscribe("fal-ai/minimax-music/v2.6", {
    input: {
      prompt: `${prompt}, instrumental only`.slice(0, 2000),
      is_instrumental: true,
    },
    logs: false,
  });
  const url = extractAudioUrl(result.data);
  if (!url) throw new Error("No audio URL returned.");
  return url;
}

async function downloadToMp3(url: string, dest: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed ${res.status} for ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  // Normalize to mp3 via ffmpeg when available (fal may return wav/mp3).
  const tmp = `${dest}.download`;
  await fs.writeFile(tmp, buf);
  const { spawn } = await import("child_process");
  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      "ffmpeg",
      ["-y", "-i", tmp, "-ac", "2", "-ar", "44100", "-b:a", "192k", dest],
      { stdio: "inherit" },
    );
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited ${code}`));
    });
  });
  await fs.unlink(tmp).catch(() => undefined);
}

async function main() {
  loadEnvLocal();
  const key = process.env.FAL_KEY?.trim();
  if (!key) {
    console.error("FAL_KEY is required.");
    process.exit(1);
  }
  fal.config({ credentials: key });
  await fs.mkdir(OUT_DIR, { recursive: true });

  for (const track of TRACKS) {
    console.log(`→ generating ${track.id}…`);
    const url = await generateOne(track.prompt);
    const dest = path.join(OUT_DIR, track.file);
    console.log(`  downloading → ${track.file}`);
    await downloadToMp3(url, dest);
    console.log(`  saved ${dest}`);
  }

  console.log("Done. Library demos are now AI-generated instrumentals.");
  console.log("Bump ?v= in bgmPublicUrl if browsers cache old files.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
