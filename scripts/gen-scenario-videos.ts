/**
 * Short loops for landing scenario cards.
 *
 * Seedance (needs FAL_KEY + balance):
 *   npx tsx scripts/gen-scenario-videos.ts
 *   npx tsx scripts/gen-scenario-videos.ts ecommerce beauty
 *
 * Offline Ken Burns fallback (no fal):
 *   npx tsx scripts/gen-scenario-videos.ts --kenburns
 *
 * Writes: public/videos/landing/scenario-{id}.mp4 (~2.5s)
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fal } from "@fal-ai/client";
import { execFileSync } from "node:child_process";

function loadEnvLocal() {
  const p = path.join(process.cwd(), ".env.local");
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    let val = m[2]!.trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[m[1]!]) process.env[m[1]!] = val;
  }
}

loadEnvLocal();
const FAL_KEY = process.env.FAL_KEY;
if (!FAL_KEY) {
  console.error("Missing FAL_KEY");
  process.exit(1);
}
fal.config({ credentials: FAL_KEY });

const IMG_DIR = path.join(process.cwd(), "public/images/landing");
const VID_DIR = path.join(process.cwd(), "public/videos/landing");
const TMP = path.join(process.cwd(), ".tmp/scenario-vids");
mkdirSync(VID_DIR, { recursive: true });
mkdirSync(TMP, { recursive: true });

/** Seedance min duration is 4s; we trim to a snappy loop. */
const GEN_DURATION = "4";
const TRIM_SEC = 2.5;

const SCENARIOS = [
  {
    id: "ecommerce",
    still: "scenario-ecommerce.png",
    prompt:
      "Lifestyle product flat-lay. Soft daylight shifts across orange bottles and fruit. Gentle camera drift. Premium e-commerce ad feel. No new text, logos, or watermarks.",
  },
  {
    id: "beauty",
    still: "scenario-beauty.png",
    prompt:
      "Beauty serum bottles. Soft lavender light pulse, dried flowers sway slightly. Gentle push-in. Clean skincare commercial. No new text or logos.",
  },
  {
    id: "food",
    still: "scenario-food.png",
    prompt:
      "Iced coffee glass. Soft steam or light shimmer, milk swirl subtle motion, warm sunlight shift. Appetizing food commercial. No new text or logos.",
  },
  {
    id: "education",
    still: "scenario-education.png",
    prompt:
      "Desk coaching setup. Soft screen glow pulse on laptop, ambient room light shift. Calm education / coaching mood. No new text or logos.",
  },
  {
    id: "realestate",
    still: "scenario-realestate.png",
    prompt:
      "Luxury living room interior. Soft daylight drifts across furniture and city view. Gentle camera push-in. Real estate listing feel. No new text or logos.",
  },
  {
    id: "saas",
    still: "scenario-saas.png",
    prompt:
      "Laptop analytics dashboard. Soft chart glow pulse, cool blue ambient light. Subtle camera drift. Clean SaaS / finance mood. No new text or logos.",
  },
] as const;

function extractVideoUrl(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const d = data as Record<string, unknown>;
  if (typeof d.video === "object" && d.video && "url" in (d.video as object)) {
    const url = (d.video as { url?: unknown }).url;
    if (typeof url === "string") return url;
  }
  if (typeof d.video_url === "string") return d.video_url;
  return undefined;
}

async function download(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function genOne(id: string, stillName: string, prompt: string, attempt = 1) {
  const stillPath = path.join(IMG_DIR, stillName);
  if (!existsSync(stillPath)) throw new Error(`Missing still ${stillPath}`);

  console.log(`[${id}] Seedance I2V ${GEN_DURATION}s (attempt ${attempt})…`);
  try {
    const imageUrl = await fal.storage.upload(
      new Blob([readFileSync(stillPath)], {
        type: stillName.endsWith(".png") ? "image/png" : "image/jpeg",
      }),
    );
    const result = await fal.subscribe("bytedance/seedance-2.0/fast/image-to-video", {
      input: {
        prompt,
        image_url: imageUrl,
        resolution: "720p",
        duration: GEN_DURATION,
        aspect_ratio: "16:9",
        generate_audio: false,
      },
      logs: true,
    });
    const videoUrl = extractVideoUrl(result.data);
    if (!videoUrl) throw new Error("No video URL");
    const raw = path.join(TMP, `${id}-raw.mp4`);
    writeFileSync(raw, await download(videoUrl));

    const dest = path.join(VID_DIR, `scenario-${id}.mp4`);
    execFileSync(
      "ffmpeg",
      [
        "-y",
        "-i",
        raw,
        "-t",
        String(TRIM_SEC),
        "-vf",
        "scale=960:600:force_original_aspect_ratio=increase,crop=960:600,fps=24",
        "-c:v",
        "libx264",
        "-crf",
        "28",
        "-preset",
        "fast",
        "-pix_fmt",
        "yuv420p",
        "-an",
        "-movflags",
        "+faststart",
        dest,
      ],
      { stdio: "inherit" },
    );
    console.log(`[${id}] → ${dest}`);
  } catch (e: unknown) {
    const err = e as { status?: number; body?: unknown; message?: string };
    console.error(`[${id}] error`, err.status, JSON.stringify(err.body)?.slice(0, 400) || err.message);
    if (attempt < 3) {
      await new Promise((r) => setTimeout(r, 4000));
      return genOne(id, stillName, prompt, attempt + 1);
    }
    throw e;
  }
}

async function kenBurns(id: string, stillName: string) {
  const stillPath = path.join(IMG_DIR, stillName);
  const dest = path.join(VID_DIR, `scenario-${id}.mp4`);
  // Distinct camera move per scenario so the grid doesn’t feel identical.
  const vfById: Record<string, string> = {
    ecommerce:
      "scale=1600:1000:force_original_aspect_ratio=increase,crop=1600:1000,zoompan=z='1.12':x='(iw-iw/zoom)*(0.15+0.55*on/60)':y='(ih-ih/zoom)*0.45':d=60:s=960x600:fps=24",
    beauty:
      "scale=1600:1000:force_original_aspect_ratio=increase,crop=1600:1000,zoompan=z='min(1.18,1+0.18*on/60)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=60:s=960x600:fps=24",
    food:
      "scale=1600:1000:force_original_aspect_ratio=increase,crop=1600:1000,zoompan=z='1.15':x='(iw-iw/zoom)*0.5':y='(ih-ih/zoom)*(0.75-0.55*on/60)':d=60:s=960x600:fps=24",
    education:
      "scale=1600:1000:force_original_aspect_ratio=increase,crop=1600:1000,zoompan=z='1.14':x='(iw-iw/zoom)*(0.1+0.7*on/60)':y='(ih-ih/zoom)*0.4':d=60:s=960x600:fps=24",
    realestate:
      "scale=1600:1000:force_original_aspect_ratio=increase,crop=1600:1000,zoompan=z='max(1.05,1.2-0.15*on/60)':x='iw/2-(iw/zoom/2)':y='(ih-ih/zoom)*0.35':d=60:s=960x600:fps=24",
    saas:
      "scale=1600:1000:force_original_aspect_ratio=increase,crop=1600:1000,zoompan=z='1.16':x='(iw-iw/zoom)*(0.2+0.6*on/60)':y='(ih-ih/zoom)*(0.2+0.5*on/60)':d=60:s=960x600:fps=24",
  };
  const vf =
    vfById[id] ??
    "scale=1600:1000:force_original_aspect_ratio=increase,crop=1600:1000,zoompan=z='min(1.1,1+0.1*on/60)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=60:s=960x600:fps=24";
  console.log(`[${id}] Ken Burns ${TRIM_SEC}s…`);
  execFileSync(
    "ffmpeg",
    [
      "-y",
      "-loop",
      "1",
      "-i",
      stillPath,
      "-vf",
      vf,
      "-t",
      String(TRIM_SEC),
      "-c:v",
      "libx264",
      "-crf",
      "28",
      "-preset",
      "fast",
      "-pix_fmt",
      "yuv420p",
      "-an",
      "-movflags",
      "+faststart",
      dest,
    ],
    { stdio: "inherit" },
  );
  console.log(`[${id}] → ${dest}`);
}

async function main() {
  const args = process.argv.slice(2);
  const ken = args.includes("--kenburns");
  const only = args.filter((a) => a !== "--kenburns");
  const queue = only.length
    ? SCENARIOS.filter((s) => only.includes(s.id))
    : [...SCENARIOS];
  for (const s of queue) {
    if (ken) await kenBurns(s.id, s.still);
    else await genOne(s.id, s.still, s.prompt);
  }
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
