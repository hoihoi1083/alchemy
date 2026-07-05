/**
 * Burn timed caption lines onto a vertical reel (no libass required).
 * Usage: npx tsx scripts/burn-reel-text.ts <input.mp4> <output.mp4>
 */
import { spawn } from "child_process";
import { promises as fs } from "fs";
import path from "path";
import sharp from "sharp";

type Caption = { start: number; end: number; text: string };

const CAPTIONS: Caption[] = [
  { start: 0, end: 2.4, text: "閃金太陽石手串 ✨" },
  { start: 2.4, end: 5.2, text: "暖光閃爍 · 提振日常能量" },
  { start: 5.2, end: 7.8, text: "留言「太陽」了解尺寸 ♡" },
];

const W = 496;
const H = 864;

function captionPng(text: string): Promise<Buffer> {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <style>
    .t { font-family: "PingFang TC", "Heiti TC", "Arial Unicode MS", sans-serif; font-size: 28px; font-weight: 700; fill: #fff; }
  </style>
  <text x="50%" y="78%" text-anchor="middle" class="t" stroke="#000" stroke-width="4" paint-order="stroke">${escaped}</text>
</svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

function run(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let err = "";
    child.stderr.on("data", (c: Buffer) => {
      err += c.toString();
    });
    child.on("error", reject);
    child.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(`${cmd} ${code}: ${err.slice(-2000)}`)),
    );
  });
}

async function probeFps(input: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "ffprobe",
      [
        "-v",
        "error",
        "-select_streams",
        "v:0",
        "-show_entries",
        "stream=r_frame_rate",
        "-of",
        "csv=p=0",
        input,
      ],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
    let out = "";
    child.stdout.on("data", (c: Buffer) => {
      out += c.toString();
    });
    child.on("close", (code) => {
      if (code !== 0) return reject(new Error("ffprobe failed"));
      const [n, d] = out.trim().split("/").map(Number);
      resolve(d ? n / d : 24);
    });
  });
}

async function main() {
  const input = process.argv[2];
  const output = process.argv[3];
  if (!input || !output) {
    console.error("Usage: npx tsx scripts/burn-reel-text.ts <input.mp4> <output.mp4>");
    process.exit(1);
  }

  const work = path.join(process.cwd(), ".burn-text-work");
  await fs.rm(work, { recursive: true, force: true });
  await fs.mkdir(work, { recursive: true });

  const overlays: Array<{ file: string; start: number; end: number }> = [];
  for (let i = 0; i < CAPTIONS.length; i++) {
    const c = CAPTIONS[i];
    const file = path.join(work, `cap_${i}.png`);
    await fs.writeFile(file, await captionPng(c.text));
    overlays.push({ file, start: c.start, end: c.end });
  }

  const fps = await probeFps(input);
  let chain = "[0:v]";
  const parts: string[] = [];
  for (let i = 0; i < overlays.length; i++) {
    const o = overlays[i];
    const inLabel = i === 0 ? "0:v" : `v${i}`;
    const outLabel = i === overlays.length - 1 ? "vout" : `v${i + 1}`;
    const inputIdx = i + 1;
    parts.push(
      `[${inLabel}][${inputIdx}:v]overlay=x=0:y=0:enable='between(t,${o.start},${o.end})'[${outLabel}]`,
    );
  }
  const filter = parts.join(";");
  const args = ["-y", "-i", input];
  for (const o of overlays) args.push("-i", o.file);
  args.push(
    "-filter_complex",
    filter,
    "-map",
    `[vout]`,
    "-map",
    "0:a?",
    "-c:v",
    "libx264",
    "-crf",
    "20",
    "-preset",
    "fast",
    "-c:a",
    "copy",
    "-r",
    String(fps),
    output,
  );

  await run("ffmpeg", args);
  await fs.rm(work, { recursive: true, force: true });
  console.log("Done:", output);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
