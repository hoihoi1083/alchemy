import sharp from "sharp";
import { promises as fs } from "fs";
import path from "path";
import { fal } from "@fal-ai/client";
import { escapeXml, fontPath } from "@/lib/compositor/paper-sticker/svg";
import {
  COMIC_SLIDES,
  W,
  H,
  type ComicCaption,
  type ComicSlide,
} from "@/lib/compositor/comic-journey/content";
import { STYLE_REF_PATH, WATERCOLOR_STYLE_PROMPT } from "./constants";

function extractImageUrl(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  if ("images" in data) {
    const images = (data as { images?: Array<{ url?: string }> }).images;
    return images?.find((i) => typeof i?.url === "string")?.url;
  }
  if ("image" in data) {
    const image = (data as { image?: { url?: string } }).image;
    return image?.url;
  }
  return undefined;
}

/** Captions like reference set: top-left, soft wash behind text (not full-width bars). */
function watercolorCaptionOverlay(captions: ComicCaption[]): Buffer {
  const font = fontPath("body");
  const scaled = scaleCaptions(captions);

  const parts = scaled.map((c) => {
    const size = c.size ?? 38;
    const padX = 14;
    const padY = 10;
    const estW = Math.min(W - 80, c.text.length * (size * 0.92) + padX * 2);
    const rx = 48;
    const ry = c.y - size - padY;
    return `
  <rect x="${rx}" y="${ry}" width="${estW}" height="${size + padY * 2}" rx="6" fill="rgba(255,255,255,0.82)"/>
  <text x="${rx + padX}" y="${c.y}" font-family="NotoBody" font-size="${size}" font-weight="600" fill="#1a1a1a">${escapeXml(c.text)}</text>`;
  });

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <style>@font-face { font-family: 'NotoBody'; src: url('file://${font}'); }</style>
  </defs>
  ${parts.join("\n")}
</svg>`;
  return Buffer.from(svg);
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

const FALLBACK_PROMPT = `${WATERCOLOR_STYLE_PROMPT} Match soft emotional watercolor manhua: wet-on-wet bleeds, paper texture, thin delicate lines, warm golden or cool blue mood.`;

export async function stylizeToWatercolor(
  sourcePath: string,
  styleRefPath: string = STYLE_REF_PATH,
  endpoint?: string,
): Promise<Buffer> {
  const srcBuf = await fs.readFile(sourcePath);
  const srcUrl = await fal.storage.upload(new Blob([srcBuf], { type: "image/png" }));

  const proEndpoint =
    endpoint ||
    process.env.FAL_IMAGE_PRO_EDIT_ENDPOINT?.trim() ||
    "fal-ai/nano-banana-pro/edit";
  const editEndpoint =
    process.env.FAL_IMAGE_EDIT_ENDPOINT?.trim() || "fal-ai/nano-banana/edit";

  async function run(urls: string[], prompt: string, ep: string) {
    const result = await fal.subscribe(ep, {
      input: {
        prompt,
        image_urls: urls,
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

  try {
    const styleBuf = await fs.readFile(styleRefPath);
    const styleUrl = await fal.storage.upload(new Blob([styleBuf], { type: "image/png" }));
    return await run([srcUrl, styleUrl], WATERCOLOR_STYLE_PROMPT, proEndpoint);
  } catch (e) {
    console.warn("  (pro dual-image failed, using single-image edit…)", (e as Error).message);
    return await run([srcUrl], FALLBACK_PROMPT, editEndpoint);
  }
}

export async function finalizeWatercolorSlide(
  imageBuffer: Buffer,
  captions: ComicCaption[],
): Promise<Buffer> {
  const base = await sharp(imageBuffer)
    .resize(W, H, { fit: "cover", position: "centre" })
    .png()
    .toBuffer();

  const overlay = watercolorCaptionOverlay(captions);
  return sharp(base).composite([{ input: overlay, top: 0, left: 0 }]).png().toBuffer();
}

export async function writeWatercolorCarouselToDir(
  outDir: string,
  opts?: {
    endpoint?: string;
    slides?: ComicSlide[];
    textOnly?: boolean;
    styleRefPath?: string;
  },
): Promise<string[]> {
  await fs.mkdir(outDir, { recursive: true });
  const rawDir = path.join(outDir, "_raw");
  await fs.mkdir(rawDir, { recursive: true });
  const slides = opts?.slides ?? COMIC_SLIDES;
  const styleRef = opts?.styleRefPath ?? STYLE_REF_PATH;
  const paths: string[] = [];

  for (const slide of slides) {
    console.log(`  [${slide.id}/7] ${slide.name}…`);
    const rawPath = path.join(rawDir, `${slide.name}.png`);
    let raw: Buffer;
    if (opts?.textOnly && (await fs.stat(rawPath).catch(() => null))) {
      raw = await fs.readFile(rawPath);
    } else {
      raw = await stylizeToWatercolor(slide.sourceFile, styleRef, opts?.endpoint);
      await fs.writeFile(rawPath, raw);
    }
    const buffer = await finalizeWatercolorSlide(raw, slide.captions);
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
