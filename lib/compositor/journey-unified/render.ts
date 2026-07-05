import sharp from "sharp";
import { promises as fs } from "fs";
import path from "path";
import { fal } from "@fal-ai/client";
import { escapeXml, fontPath } from "@/lib/compositor/paper-sticker/svg";
import {
  JOURNEY_SLIDES,
  LAYOUT,
  STYLE_REF_01,
  WEBTOON_STYLE_PROMPT,
  W,
  H,
  type JourneyCaption,
  type JourneySlide,
} from "./content";

function extractImageUrl(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  if ("images" in data) {
    const images = (data as { images?: Array<{ url?: string }> }).images;
    return images?.find((i) => typeof i?.url === "string")?.url;
  }
  if ("image" in data) {
    return (data as { image?: { url?: string } }).image?.url;
  }
  return undefined;
}

const FALLBACK_PROMPT = `${WEBTOON_STYLE_PROMPT} Match clean modern webtoon manhwa like slide 01: thin outlines, soft cel shading, pastel tones.`;

export async function stylizeToWebtoon01(
  sourcePath: string,
  styleRefPath: string = STYLE_REF_01,
): Promise<Buffer> {
  const srcBuf = await fs.readFile(sourcePath);
  const srcUrl = await fal.storage.upload(new Blob([srcBuf], { type: "image/png" }));

  const proEndpoint =
    process.env.FAL_IMAGE_PRO_EDIT_ENDPOINT?.trim() ||
    "fal-ai/nano-banana-pro/edit";
  const editEndpoint =
    process.env.FAL_IMAGE_EDIT_ENDPOINT?.trim() || "fal-ai/nano-banana/edit";

  async function run(urls: string[], prompt: string, ep: string) {
    const result = await fal.subscribe(ep, {
      input: { prompt, image_urls: urls, aspect_ratio: "4:5", num_images: 1 },
      logs: true,
    });
    const outUrl = extractImageUrl(result.data);
    if (!outUrl) throw new Error("No image URL from fal");
    const res = await fetch(outUrl);
    if (!res.ok) throw new Error(`Download failed: ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }

  try {
    const styleBuf = await fs.readFile(styleRefPath);
    const styleUrl = await fal.storage.upload(new Blob([styleBuf], { type: "image/png" }));
    return await run([srcUrl, styleUrl], WEBTOON_STYLE_PROMPT, proEndpoint);
  } catch {
    return await run([srcUrl], FALLBACK_PROMPT, editEndpoint);
  }
}

function captionSvg(captions: JourneyCaption[]): Buffer {
  const font = fontPath("body");
  const L = LAYOUT;
  const yFor = (slot: JourneyCaption["slot"]) => {
    if (slot === "top") return L.topY;
    if (slot === "top2") return L.top2Y;
    return L.midY;
  };

  const texts = captions
    .map((c) => {
      const size = c.size ?? L.defaultFont;
      const y = yFor(c.slot);
      return `<text x="${W / 2}" y="${y}" text-anchor="middle" font-family="NotoBody" font-size="${size}" font-weight="700" fill="#111111">${escapeXml(c.text)}</text>`;
    })
    .join("\n");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <style>@font-face { font-family: 'NotoBody'; src: url('file://${font}'); }</style>
  </defs>
  <rect width="${W}" height="${H}" fill="#ffffff"/>
  <rect x="0" y="0" width="${W}" height="105" fill="#ffffff"/>
  <rect x="0" y="618" width="${W}" height="100" fill="#ffffff"/>
  ${texts}
</svg>`;
  return Buffer.from(svg);
}

/** Split stylized 2-panel art onto white canvas with rounded corners (01 layout). */
export async function composeUnifiedLayout(
  artBuffer: Buffer,
  captions: JourneyCaption[],
): Promise<Buffer> {
  const L = LAYOUT;
  const meta = await sharp(artBuffer).metadata();
  const sw = meta.width ?? W;
  const sh = meta.height ?? H;

  // Crop out caption gutters (source often has baked-in text above each panel).
  const p1Top = Math.round(sh * 0.15);
  const p1H = Math.round(sh * 0.36);
  const p2Top = Math.round(sh * 0.56);
  const p2H = Math.round(sh * 0.36);

  const topArt = await sharp(artBuffer)
    .extract({ left: 0, top: p1Top, width: sw, height: Math.min(p1H, sh - p1Top) })
    .resize(L.panelW, L.panelH, { fit: "cover", position: "centre" })
    .png()
    .toBuffer();

  const bottomArt = await sharp(artBuffer)
    .extract({ left: 0, top: p2Top, width: sw, height: Math.min(p2H, sh - p2Top) })
    .resize(L.panelW, L.panelH, { fit: "cover", position: "centre" })
    .png()
    .toBuffer();

  const topRounded = await sharp(topArt)
    .composite([
      {
        input: Buffer.from(
          `<svg width="${L.panelW}" height="${L.panelH}"><rect width="${L.panelW}" height="${L.panelH}" rx="${L.panelRadius}" ry="${L.panelRadius}" fill="white"/></svg>`,
        ),
        blend: "dest-in",
      },
    ])
    .png()
    .toBuffer();

  const bottomRounded = await sharp(bottomArt)
    .composite([
      {
        input: Buffer.from(
          `<svg width="${L.panelW}" height="${L.panelH}"><rect width="${L.panelW}" height="${L.panelH}" rx="${L.panelRadius}" ry="${L.panelRadius}" fill="white"/></svg>`,
        ),
        blend: "dest-in",
      },
    ])
    .png()
    .toBuffer();

  const base = await sharp(captionSvg(captions)).png().toBuffer();

  return sharp(base)
    .composite([
      { input: topRounded, left: L.panelX, top: L.panel1Y },
      { input: bottomRounded, left: L.panelX, top: L.panel2Y },
    ])
    .png()
    .toBuffer();
}

/** Skip fal for slide 01 — use source directly when it already matches style. */
export async function buildSlide(
  slide: JourneySlide,
  opts: { skipStylize?: boolean } = {},
): Promise<Buffer> {
  let art: Buffer;
  if (opts.skipStylize || slide.id === 1) {
    art = await fs.readFile(slide.sourceFile);
  } else {
    art = await stylizeToWebtoon01(slide.sourceFile);
  }
  return composeUnifiedLayout(art, slide.captions);
}

export async function writeUnifiedCarouselToDir(
  outDir: string,
  opts?: { textOnly?: boolean; stylizeAll?: boolean },
): Promise<string[]> {
  await fs.mkdir(outDir, { recursive: true });
  const rawDir = path.join(outDir, "_raw");
  await fs.mkdir(rawDir, { recursive: true });

  const paths: string[] = [];
  for (const slide of JOURNEY_SLIDES) {
    console.log(`  [${slide.id}/7] ${slide.name}…`);
    const rawPath = path.join(rawDir, `${slide.name}.png`);

    let art: Buffer;
    if (opts?.textOnly && (await fs.stat(rawPath).catch(() => null))) {
      art = await fs.readFile(rawPath);
    } else {
      art = await stylizeToWebtoon01(slide.sourceFile);
      await fs.writeFile(rawPath, art);
    }

    const out = await composeUnifiedLayout(art, slide.captions);
    const outPath = path.join(outDir, `${slide.name}.png`);
    await fs.writeFile(outPath, out);
    paths.push(outPath);
  }

  return paths;
}
