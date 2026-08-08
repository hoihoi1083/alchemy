/**
 * Story-fan posters + Seedance loops matched to left-card copy.
 *
 *   npx tsx scripts/gen-story-fan-videos.ts
 *   npx tsx scripts/gen-story-fan-videos.ts transform reference storyboard
 *
 * Writes:
 *   public/images/landing/story-fan-{id}.jpg
 *   public/videos/landing/story-fan-{id}.mp4
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync, unlinkSync } from "node:fs";
import path from "node:path";
import { fal } from "@fal-ai/client";
import { execFileSync } from "node:child_process";
import sharp from "sharp";

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
const TMP_DIR = path.join(process.cwd(), ".tmp/story-fan");
mkdirSync(IMG_DIR, { recursive: true });
mkdirSync(VID_DIR, { recursive: true });
mkdirSync(TMP_DIR, { recursive: true });

/** Prefer short clean English labels only — avoid tiny UI copy that becomes gibberish. */
const TEXT_RULE =
  "Only allow the exact short English labels named in the prompt. No other text, no Chinese, no logos, no watermarks, no random letters. Product packaging labels must be blank white or blank kraft — no fake brand names.";

type CardId = "transform" | "reference" | "storyboard";

type SimpleCard = {
  id: CardId;
  mode: "simple";
  stillPrompt: string;
  motionPrompt: string;
};

type StoryboardCard = {
  id: "storyboard";
  mode: "storyboard";
  scenes: Array<{ label: string; stillPrompt: string; motionPrompt: string }>;
};

const CARDS: Array<SimpleCard | StoryboardCard> = [
  {
    id: "transform",
    mode: "simple",
    // Matches: plain product shot → studio-ready creative
    stillPrompt: `Vertical 9:16 premium marketing visual for a product transform feature.
Split screen: TOP half is a plain amber glass dropper serum bottle on a stark white seamless backdrop, with a small clean purple pill badge reading exactly "BEFORE".
BOTTOM half is the same bottle in a warm lifestyle studio scene on stone with soft daylight and dried flowers, with a small clean purple pill badge reading exactly "AFTER".
High-end commercial photography, soft violet accents, polished SaaS aesthetic. ${TEXT_RULE}`,
    motionPrompt: `Cinematic product transform. Soft light travels from the BEFORE panel into the AFTER lifestyle scene. Gentle camera push-in on the bottle. Dried flowers sway slightly. Keep badges readable and fixed as BEFORE and AFTER. ${TEXT_RULE}`,
  },
  {
    id: "reference",
    mode: "simple",
    // Distinct product (matte lipstick) so style DNA ≠ same serum bottle as card 1.
    // Shows: paste a social look → apply palette/lighting/tone to YOUR product.
    stillPrompt: `Vertical 9:16 premium marketing visual for a reference-style feature.
TOP: a framed Instagram-style mood photo — neon pink cafe flat-lay with latte art, chrome tray, soft disco reflections, trendy social aesthetic. No lipstick in this frame. Small clean white badge reading exactly "REFERENCE".
MIDDLE: a soft purple curved arrow pointing down.
BOTTOM: a matte dusty-rose lipstick tube (bullet closed, blank white sticker on the tube) restyled into that same neon cafe palette and lighting on a chrome tray, with a small clean white badge reading exactly "YOUR LOOK".
Commercial photography, clear before-style vs after-product contrast. ${TEXT_RULE}`,
    motionPrompt: `Style DNA transfer. Soft neon glow and color wash flow from the REFERENCE mood down the arrow into YOUR LOOK lipstick scene. Gentle parallax, light pulse on chrome. Keep both badges sharp and unchanged as REFERENCE and YOUR LOOK. No other text. ${TEXT_RULE}`,
  },
  {
    id: "storyboard",
    mode: "storyboard",
    // Distinct product (sneakers) vs serum (1) + lipstick (2).
    // Meaning: 3 planned stills → stitch into one story reel.
    scenes: [
      {
        label: "1",
        stillPrompt: `Vertical 9:16 commercial footwear still, scene 1 of a 3-shot storyboard.
Hero product shot: a clean white chunky lifestyle sneaker (no logos, no brand marks, blank white tongue tag) standing alone on a soft light-gray seamless studio floor.
Soft daylight, minimal shadows, premium catalog look. No text, watermarks, or logos.`,
        motionPrompt: `Gentle camera push-in on the white sneaker. Soft studio light shift. Premium product commercial. No text, no logos.`,
      },
      {
        label: "2",
        stillPrompt: `Vertical 9:16 commercial footwear still, scene 2 of a 3-shot storyboard.
SAME white chunky lifestyle sneaker (no logos) — close detail of hands tying the white laces, soft lavender studio backdrop.
Clean beauty of materials: mesh, foam midsole, rubber sole. No text, watermarks, or brand names.`,
        motionPrompt: `Subtle hand motion finishing the lace tie. Soft studio lighting. Premium sneaker commercial. No text, no logos.`,
      },
      {
        label: "3",
        stillPrompt: `Vertical 9:16 commercial footwear still, scene 3 of a 3-shot storyboard.
SAME white chunky lifestyle sneaker on-foot — person walking on a bright city sidewalk, soft bokeh street lights, aspirational lifestyle ad.
Sneaker must match scenes 1 and 2. No logos, no readable text on clothing or signs. No watermarks.`,
        motionPrompt: `Natural walking motion, soft street bokeh shimmer. Keep the SAME white sneaker clear in frame. Lifestyle commercial. No text, no logos.`,
      },
    ],
  },
];

const DURATION = "5"; // simple cards — synced with LandingStoryWheel
/** Seedance min is 4s; we trim each beat then stitch so the reel stays short. */
const SCENE_DURATION = "4";
/** Motion beat length inside the final “combined video” section. */
const SCENE_TRIM_SEC = 1.35;
/** How long we hold the 3-still storyboard board before combining. */
const BOARD_HOLD_SEC = 1.8;
/** Brief full-bleed flash of each still before motion (shows “3 images”). */
const STILL_FLASH_SEC = 0.4;

function extractImageUrl(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const images = (data as { images?: Array<{ url?: string }> }).images;
  if (images?.[0]?.url) return images[0].url;
  const image = (data as { image?: { url?: string } }).image;
  if (image?.url) return image.url;
  return undefined;
}

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

function toJpeg(srcBuf: Buffer, dest: string) {
  const tmp = dest.replace(/\.jpg$/i, ".tmp.png");
  writeFileSync(tmp, srcBuf);
  execFileSync("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "88", tmp, "--out", dest]);
  try {
    unlinkSync(tmp);
  } catch {
    /* ignore */
  }
}

async function nanoStill(prompt: string, attempt = 1): Promise<Buffer> {
  try {
    const result = await fal.subscribe("fal-ai/nano-banana-2", {
      input: {
        prompt,
        aspect_ratio: "9:16",
        num_images: 1,
      },
      logs: false,
    });
    const url = extractImageUrl(result.data);
    if (!url) throw new Error("No still URL");
    return download(url);
  } catch (e: unknown) {
    const err = e as { status?: number; body?: unknown; message?: string };
    console.error(`still error`, err.status, JSON.stringify(err.body)?.slice(0, 300) || err.message);
    if (attempt < 3) {
      await new Promise((r) => setTimeout(r, 2500));
      return nanoStill(prompt, attempt + 1);
    }
    throw e;
  }
}

async function seedanceI2V(
  stillPath: string,
  prompt: string,
  duration: string,
  attempt = 1,
): Promise<Buffer> {
  try {
    const imageUrl = await fal.storage.upload(
      new Blob([readFileSync(stillPath)], { type: "image/jpeg" }),
    );
    const result = await fal.subscribe("bytedance/seedance-2.0/fast/image-to-video", {
      input: {
        prompt,
        image_url: imageUrl,
        resolution: "720p",
        duration,
        aspect_ratio: "9:16",
        generate_audio: false,
      },
      logs: true,
    });
    const videoUrl = extractVideoUrl(result.data);
    if (!videoUrl) throw new Error("No video URL");
    return download(videoUrl);
  } catch (e: unknown) {
    const err = e as { status?: number; body?: unknown; message?: string };
    console.error(`video error`, err.status, JSON.stringify(err.body)?.slice(0, 400) || err.message);
    if (attempt < 3) {
      await new Promise((r) => setTimeout(r, 4000));
      return seedanceI2V(stillPath, prompt, duration, attempt + 1);
    }
    throw e;
  }
}

/** Build a 9:16 storyboard poster: three stacked scene frames with purple 1/2/3 badges. */
async function composeStoryboardPoster(sceneJpgs: string[], dest: string) {
  const W = 720;
  const H = 1280;
  const pad = 28;
  const gap = 16;
  const badge = 36;
  const frameH = Math.floor((H - pad * 2 - gap * 2) / 3);
  const frameW = W - pad * 2;

  const layers: sharp.OverlayOptions[] = [];
  for (let i = 0; i < 3; i++) {
    const y = pad + i * (frameH + gap);
    const frame = await sharp(sceneJpgs[i]!)
      .resize(frameW, frameH, { fit: "cover", position: "centre" })
      .jpeg()
      .toBuffer();

    const rounded = await sharp(frame)
      .composite([
        {
          input: Buffer.from(
            `<svg width="${frameW}" height="${frameH}"><rect width="100%" height="100%" rx="18" ry="18" fill="white"/></svg>`,
          ),
          blend: "dest-in",
        },
      ])
      .png()
      .toBuffer();

    layers.push({ input: rounded, left: pad, top: y });

    const num = String(i + 1);
    const badgeSvg = Buffer.from(`
      <svg width="${badge}" height="${badge}" xmlns="http://www.w3.org/2000/svg">
        <circle cx="${badge / 2}" cy="${badge / 2}" r="${badge / 2}" fill="#7c3aed"/>
        <text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle"
          font-family="Helvetica, Arial, sans-serif" font-size="18" font-weight="700" fill="white">${num}</text>
      </svg>`);
    layers.push({ input: badgeSvg, left: pad + 12, top: y + 12 });
  }

  await sharp({
    create: {
      width: W,
      height: H,
      channels: 3,
      background: { r: 250, g: 248, b: 255 },
    },
  })
    .composite(layers)
    .jpeg({ quality: 88 })
    .toFile(dest);

  console.log(`[storyboard] poster ${dest}`);
}

async function genSimple(card: SimpleCard) {
  console.log(`[${card.id}] still…`);
  const buf = await nanoStill(card.stillPrompt);
  const dest = path.join(IMG_DIR, `story-fan-${card.id}.jpg`);
  toJpeg(buf, dest);
  console.log(`[${card.id}] poster ${dest}`);

  console.log(`[${card.id}] Seedance I2V ${DURATION}s…`);
  const videoBuf = await seedanceI2V(dest, card.motionPrompt, DURATION);
  const vdest = path.join(VID_DIR, `story-fan-${card.id}.mp4`);
  writeFileSync(vdest, videoBuf);
  console.log(`[${card.id}] video ${vdest} (${(videoBuf.length / 1024 / 1024).toFixed(2)} MB)`);
}

async function genStoryboard(card: StoryboardCard) {
  const sceneStillPaths: string[] = [];
  const sceneClipPaths: string[] = [];

  for (const scene of card.scenes) {
    console.log(`[storyboard] scene ${scene.label} still…`);
    const buf = await nanoStill(scene.stillPrompt);
    const stillPath = path.join(TMP_DIR, `scene-${scene.label}.jpg`);
    toJpeg(buf, stillPath);
    sceneStillPaths.push(stillPath);

    console.log(`[storyboard] scene ${scene.label} Seedance I2V ${SCENE_DURATION}s…`);
    const clipBuf = await seedanceI2V(stillPath, scene.motionPrompt, SCENE_DURATION);
    const clipPath = path.join(TMP_DIR, `scene-${scene.label}.mp4`);
    writeFileSync(clipPath, clipBuf);
    sceneClipPaths.push(clipPath);
    console.log(`[storyboard] scene ${scene.label} clip ${(clipBuf.length / 1024 / 1024).toFixed(2)} MB`);
  }

  const poster = path.join(IMG_DIR, "story-fan-storyboard.jpg");
  await composeStoryboardPoster(sceneStillPaths, poster);

  const vdest = path.join(VID_DIR, "story-fan-storyboard.mp4");
  assembleStoryboardProcessVideo(poster, sceneStillPaths, sceneClipPaths, vdest);
  console.log(`[storyboard] process video ${vdest}`);
}

/**
 * Process video: show 3 stills on a storyboard → flash each still → play combined motion.
 * This is what “storyboard mode” means on the landing card.
 */
function assembleStoryboardProcessVideo(
  posterPath: string,
  sceneStillPaths: string[],
  sceneClipPaths: string[],
  dest: string,
) {
  const boardMp4 = path.join(TMP_DIR, "board-hold.mp4");
  const frames = Math.max(1, Math.round(BOARD_HOLD_SEC * 24));
  // Gentle push-in on the 3-panel board so it reads as “planned stills”.
  execFileSync(
    "ffmpeg",
    [
      "-y",
      "-loop",
      "1",
      "-i",
      posterPath,
      "-vf",
      `scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280,zoompan=z='min(1.06,1+0.03*on/${frames})':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=720x1280:fps=24`,
      "-t",
      String(BOARD_HOLD_SEC),
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-an",
      boardMp4,
    ],
    { stdio: "inherit" },
  );

  const parts: string[] = [boardMp4];

  for (let i = 0; i < 3; i++) {
    const flash = path.join(TMP_DIR, `still-flash-${i + 1}.mp4`);
    execFileSync(
      "ffmpeg",
      [
        "-y",
        "-loop",
        "1",
        "-i",
        sceneStillPaths[i]!,
        "-vf",
        "scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280,fps=24",
        "-t",
        String(STILL_FLASH_SEC),
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-an",
        flash,
      ],
      { stdio: "inherit" },
    );
    parts.push(flash);
  }

  for (let i = 0; i < sceneClipPaths.length; i++) {
    const trimmed = path.join(TMP_DIR, `scene-${i + 1}-trim.mp4`);
    execFileSync(
      "ffmpeg",
      [
        "-y",
        "-i",
        sceneClipPaths[i]!,
        "-t",
        String(SCENE_TRIM_SEC),
        "-vf",
        "scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280,fps=24",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-an",
        trimmed,
      ],
      { stdio: "inherit" },
    );
    parts.push(trimmed);
  }

  const listFile = path.join(TMP_DIR, "process-concat.txt");
  writeFileSync(listFile, parts.map((p) => `file '${p}'`).join("\n") + "\n");

  execFileSync(
    "ffmpeg",
    [
      "-y",
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      listFile,
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-an",
      "-movflags",
      "+faststart",
      dest,
    ],
    { stdio: "inherit" },
  );
}

async function main() {
  const only = process.argv.slice(2);
  const queue = only.length
    ? CARDS.filter((c) => only.includes(c.id))
    : [...CARDS];
  for (const card of queue) {
    if (card.mode === "storyboard") await genStoryboard(card);
    else await genSimple(card);
  }
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
