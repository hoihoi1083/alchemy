import sharp from "sharp";
import { promises as fs } from "fs";
import path from "path";
import { fal } from "@fal-ai/client";
import { escapeXml, fontPath } from "@/lib/compositor/paper-sticker/svg";
import {
  COMIC_SLIDES,
  COMIC_STYLE_PROMPT,
  W,
  H,
  type ComicCaption,
  type ComicSlide,
} from "./content";

function captionOverlay(captions: ComicCaption[]): Buffer {
  const font = fontPath("body");
  const bars = captions
    .map((c) => {
      const h = c.size && c.size < 38 ? 72 : 64;
      return `<rect x="24" y="${c.y - 52}" width="${W - 48}" height="${h}" fill="#ffffff"/>`;
    })
    .join("\n");

  const texts = captions
    .map((c) => {
      const size = c.size ?? 38;
      return `<text x="${W / 2}" y="${c.y}" text-anchor="middle" font-family="NotoBody" font-size="${size}" font-weight="bold" fill="#1a1a1a">${escapeXml(c.text)}</text>`;
    })
    .join("\n");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <style>@font-face { font-family: 'NotoBody'; src: url('file://${font}'); }</style>
  </defs>
  ${bars}
  ${texts}
</svg>`;
  return Buffer.from(svg);
}

function extractImageUrl(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  if ("images" in data) {
    const images = (data as { images?: Array<{ url?: string }> }).images;
    const first = images?.find((i) => typeof i?.url === "string");
    return first?.url;
  }
  if ("image" in data) {
    const image = (data as { image?: { url?: string } }).image;
    return image?.url;
  }
  return undefined;
}

export async function stylizeToComic(
  sourcePath: string,
  endpoint = "fal-ai/nano-banana/edit",
): Promise<Buffer> {
  const buf = await fs.readFile(sourcePath);
  const blob = new Blob([buf], { type: "image/png" });
  const url = await fal.storage.upload(blob);

  const result = await fal.subscribe(endpoint, {
    input: {
      prompt: COMIC_STYLE_PROMPT,
      image_urls: [url],
      aspect_ratio: "4:5",
      num_images: 1,
    },
    logs: true,
  });

  const outUrl = extractImageUrl(result.data);
  if (!outUrl) throw new Error("No image URL from fal");

  const res = await fetch(outUrl);
  if (!res.ok) throw new Error(`Failed to download: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

const SRC_H = 1024;

function scaleCaptions(captions: ComicCaption[]): ComicCaption[] {
  const scale = H / SRC_H;
  return captions.map((c) => ({
    ...c,
    y: Math.round(c.y * scale),
    size: c.size ? Math.round(c.size * scale) : undefined,
  }));
}

export async function finalizeSlide(
  imageBuffer: Buffer,
  captions: ComicCaption[],
): Promise<Buffer> {
  const base = await sharp(imageBuffer)
    .resize(W, H, { fit: "cover", position: "centre" })
    .png()
    .toBuffer();

  const overlay = captionOverlay(scaleCaptions(captions));
  return sharp(base).composite([{ input: overlay, top: 0, left: 0 }]).png().toBuffer();
}

export async function generateComicSlide(
  slide: ComicSlide,
  endpoint?: string,
): Promise<Buffer> {
  const raw = await stylizeToComic(slide.sourceFile, endpoint);
  return finalizeSlide(raw, slide.captions);
}

export async function writeComicCarouselToDir(
  outDir: string,
  opts?: { endpoint?: string; slides?: ComicSlide[]; textOnly?: boolean },
): Promise<string[]> {
  await fs.mkdir(outDir, { recursive: true });
  const rawDir = path.join(outDir, "_raw");
  await fs.mkdir(rawDir, { recursive: true });
  const slides = opts?.slides ?? COMIC_SLIDES;
  const paths: string[] = [];

  for (const slide of slides) {
    console.log(`  [${slide.id}/7] ${slide.name}…`);
    const rawPath = path.join(rawDir, `${slide.name}.png`);
    let raw: Buffer;
    if (opts?.textOnly && (await fs.stat(rawPath).catch(() => null))) {
      raw = await fs.readFile(rawPath);
    } else {
      raw = await stylizeToComic(slide.sourceFile, opts?.endpoint);
      await fs.writeFile(rawPath, raw);
    }
    const buffer = await finalizeSlide(raw, slide.captions);
    const out = path.join(outDir, `${slide.name}.png`);
    await fs.writeFile(out, buffer);
    paths.push(out);
  }

  const readme = slides
    .map(
      (s) =>
        `${s.name}.png\n  ${s.captions.map((c) => c.text).join(" / ")}\n  source: ${path.basename(s.sourceFile)}`,
    )
    .join("\n\n");
  await fs.writeFile(path.join(outDir, "SLIDES.txt"), readme, "utf8");

  return paths;
}
