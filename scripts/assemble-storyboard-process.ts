/**
 * Rebuild storyboard process video from existing sneaker scene assets
 * (no fal calls): board of 3 stills → flash each still → combined motion.
 *
 *   npx tsx scripts/assemble-storyboard-process.ts
 */
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import sharp from "sharp";

const IMG_DIR = path.join(process.cwd(), "public/images/landing");
const VID_DIR = path.join(process.cwd(), "public/videos/landing");
const TMP = path.join(process.cwd(), ".tmp/story-fan");
mkdirSync(TMP, { recursive: true });

const BOARD_HOLD_SEC = 1.8;
const STILL_FLASH_SEC = 0.4;
const SCENE_TRIM_SEC = 1.35;

async function composePoster(sceneJpgs: string[], dest: string) {
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
}

function ff(args: string[]) {
  execFileSync("ffmpeg", ["-y", ...args], { stdio: "inherit" });
}

async function main() {
  const scenes = [1, 2, 3].map((n) => ({
    still: path.join(TMP, `scene-${n}.jpg`),
    clip: path.join(TMP, `scene-${n}.mp4`),
  }));
  for (const s of scenes) {
    if (!existsSync(s.still) || !existsSync(s.clip)) {
      throw new Error(`Missing ${s.still} or ${s.clip} — run gen-story-fan-videos.ts storyboard first`);
    }
  }

  const poster = path.join(IMG_DIR, "story-fan-storyboard.jpg");
  await composePoster(
    scenes.map((s) => s.still),
    poster,
  );
  console.log("poster", poster);

  const boardMp4 = path.join(TMP, "board-hold.mp4");
  const frames = Math.round(BOARD_HOLD_SEC * 24);
  ff([
    "-loop",
    "1",
    "-i",
    poster,
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
  ]);

  const parts: string[] = [boardMp4];

  for (let i = 0; i < 3; i++) {
    const flash = path.join(TMP, `still-flash-${i + 1}.mp4`);
    ff([
      "-loop",
      "1",
      "-i",
      scenes[i]!.still,
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
    ]);
    parts.push(flash);
  }

  for (let i = 0; i < 3; i++) {
    const trimmed = path.join(TMP, `scene-${i + 1}-trim.mp4`);
    ff([
      "-i",
      scenes[i]!.clip,
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
    ]);
    parts.push(trimmed);
  }

  const list = path.join(TMP, "process-concat.txt");
  writeFileSync(list, parts.map((p) => `file '${p}'`).join("\n") + "\n");
  const dest = path.join(VID_DIR, "story-fan-storyboard.mp4");
  ff([
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    list,
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-an",
    "-movflags",
    "+faststart",
    dest,
  ]);

  const dur = execFileSync(
    "ffprobe",
    ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", dest],
    { encoding: "utf8" },
  ).trim();
  console.log("process video", dest, `${dur}s`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
