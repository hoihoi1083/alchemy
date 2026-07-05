import sharp from "sharp";
import { promises as fs } from "fs";
import path from "path";
import { fal } from "@fal-ai/client";
import { escapeXml, fontPath } from "@/lib/compositor/paper-sticker/svg";
import { JOURNEY_SLIDES, type JourneyCaption, type JourneySlide } from "./content";
import {
  buildWatercolorStylizePrompt,
  LAYOUT,
  LAYOUT_CENTERED,
  READY_WATERCOLOR_IDS,
  usesCenteredLayout,
  STYLE_REF_01,
  STYLE_REF_06,
  W,
  H,
} from "./constants";

function extractImageUrl(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  if ("images" in data) {
    return (data as { images?: Array<{ url?: string }> }).images?.find(
      (i) => typeof i?.url === "string",
    )?.url;
  }
  return (data as { image?: { url?: string } }).image?.url;
}

function estimateBoxWidth(text: string, fontSize: number, layout: LayoutSpec): number {
  return Math.min(W - 100, Math.round(text.length * fontSize * 0.92) + layout.boxPadX * 2);
}

type LayoutSpec = typeof LAYOUT;

function captionBoxesSvg(
  captions: JourneyCaption[],
  layout: LayoutSpec,
  align: "left" | "center",
): string {
  const yFor = (slot: JourneyCaption["slot"]) => {
    if (slot === "top") return layout.topCaptionY;
    if (slot === "top2") return layout.top2CaptionY;
    return layout.midCaptionY;
  };

  return captions
    .map((c) => {
      const size = c.size ?? layout.captionFont;
      const y = yFor(c.slot);
      const bw = estimateBoxWidth(c.text, size, layout);
      const bx =
        align === "center" ? Math.round((W - bw) / 2) : layout.captionLeft;
      const by = y - size - layout.boxPadY;
      const bh = size + layout.boxPadY * 2;
      const tx = align === "center" ? W / 2 : bx + layout.boxPadX;
      const anchor = align === "center" ? "middle" : "start";
      return `
  <rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="${layout.boxRadius}" fill="#ffffff" fill-opacity="0.96"/>
  <text x="${tx}" y="${y}" text-anchor="${anchor}" font-family="NotoBody" font-size="${size}" font-weight="700" fill="#111111">${escapeXml(c.text)}</text>`;
    })
    .join("\n");
}

function paperBackgroundSvg(): Buffer {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <filter id="grain">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" stitchTiles="stitch"/>
      <feColorMatrix type="saturate" values="0"/>
      <feComponentTransfer><feFuncA type="linear" slope="0.045"/></feComponentTransfer>
    </filter>
  </defs>
  <rect width="${W}" height="${H}" fill="${LAYOUT.paperColor}"/>
  <rect width="${W}" height="${H}" filter="url(#grain)" opacity="0.55"/>
</svg>`;
  return Buffer.from(svg);
}

function bodyFont(): string {
  return fontPath("body");
}

async function uploadPng(filePath: string): Promise<string> {
  return fal.storage.upload(
    new Blob([await fs.readFile(filePath)], { type: "image/png" }),
  );
}

export function styleRefForSlide(slideId: number): string {
  return slideId >= 5 ? STYLE_REF_06 : STYLE_REF_01;
}

export async function stylizeToWatercolorPaper(
  sourcePath: string,
  styleRefPath: string = STYLE_REF_01,
): Promise<Buffer> {
  const srcUrl = await uploadPng(sourcePath);
  const styleUrl = await uploadPng(styleRefPath);
  const prompt = buildWatercolorStylizePrompt();
  /** Style ref must be IMAGE 1 for nano-banana-pro/edit. */
  const urls = [styleUrl, srcUrl];

  const proEndpoint =
    process.env.FAL_IMAGE_PRO_EDIT_ENDPOINT?.trim() ||
    "fal-ai/nano-banana-pro/edit";

  const result = await fal.subscribe(proEndpoint, {
    input: {
      prompt,
      image_urls: urls,
      aspect_ratio: "4:5",
      resolution: "2K",
      num_images: 1,
      limit_generations: true,
    },
    logs: true,
  });
  const outUrl = extractImageUrl(result.data);
  if (!outUrl) throw new Error("No image URL from fal");
  const res = await fetch(outUrl);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

/** Cream paper + rounded panels + caption boxes. */
export async function composeWatercolorLayout(
  artBuffer: Buffer,
  captions: JourneyCaption[],
  opts?: { centered?: boolean; stripBakedText?: boolean },
): Promise<Buffer> {
  const centered = opts?.centered ?? false;
  const L = centered ? LAYOUT_CENTERED : LAYOUT;
  const align = centered ? "center" : "left";
  const meta = await sharp(artBuffer).metadata();
  const sw = meta.width ?? W;
  const sh = meta.height ?? H;

  const strip = opts?.stripBakedText ?? false;
  const p1Top = Math.round(sh * (strip ? 0.1 : 0.12));
  const p1H = Math.round(sh * (strip ? 0.32 : 0.38));
  /** Skip gutter + large baked mid-caption before bottom panel. */
  const p2Top = Math.round(sh * (strip ? 0.68 : 0.52));
  const p2H = Math.round(sh * (strip ? 0.32 : 0.38));

  const roundPanel = async (buf: Buffer) =>
    sharp(buf)
      .composite([
        {
          input: Buffer.from(
            `<svg width="${L.panelW}" height="${L.panelH}"><rect width="${L.panelW}" height="${L.panelH}" rx="${L.panelRadius}" fill="white"/></svg>`,
          ),
          blend: "dest-in",
        },
      ])
      .png()
      .toBuffer();

  const topArt = await roundPanel(
    await sharp(artBuffer)
      .extract({ left: 0, top: p1Top, width: sw, height: Math.min(p1H, sh - p1Top) })
      .resize(L.panelW, L.panelH, { fit: "cover", position: "centre" })
      .png()
      .toBuffer(),
  );

  const bottomArt = await roundPanel(
    await sharp(artBuffer)
      .extract({ left: 0, top: p2Top, width: sw, height: Math.min(p2H, sh - p2Top) })
      .resize(L.panelW, L.panelH, { fit: "cover", position: "centre" })
      .png()
      .toBuffer(),
  );

  return sharp(paperBackgroundSvg())
    .composite([
      {
        input: Buffer.from(
          `<svg width="${W}" height="${H}"><defs><style>@font-face{font-family:'NotoBody';src:url('file://${bodyFont()}')}</style></defs>${captionBoxesSvg(captions, L, align)}</svg>`,
        ),
        top: 0,
        left: 0,
      },
      { input: topArt, left: L.panelX, top: L.panel1Y },
      { input: bottomArt, left: L.panelX, top: L.panel2Y },
    ])
    .png()
    .toBuffer();
}

export async function writeWatercolorCarouselToDir(
  outDir: string,
  opts?: { textOnly?: boolean; slideIds?: number[] },
): Promise<string[]> {
  await fs.mkdir(outDir, { recursive: true });
  const rawDir = path.join(outDir, "_raw");
  await fs.mkdir(rawDir, { recursive: true });

  const slides = opts?.slideIds?.length
    ? JOURNEY_SLIDES.filter((s) => opts.slideIds!.includes(s.id))
    : JOURNEY_SLIDES;

  const paths: string[] = [];
  for (const slide of slides) {
    console.log(`  [${slide.id}/7] ${slide.name}…`);
    const rawPath = path.join(rawDir, `${slide.name}.png`);

    if (READY_WATERCOLOR_IDS.has(slide.id)) {
      const art = await fs.readFile(slide.sourceFile);
      const out = await composeWatercolorLayout(art, slide.captions, {
        centered: true,
        stripBakedText: true,
      });
      await fs.writeFile(path.join(outDir, `${slide.name}.png`), out);
      paths.push(path.join(outDir, `${slide.name}.png`));
      continue;
    }

    let art: Buffer;
    if (opts?.textOnly && (await fs.stat(rawPath).catch(() => null))) {
      art = await fs.readFile(rawPath);
    } else {
      art = await stylizeToWatercolorPaper(
        slide.sourceFile,
        styleRefForSlide(slide.id),
      );
      await fs.writeFile(rawPath, art);
    }

    const out = await composeWatercolorLayout(art, slide.captions, {
      centered: usesCenteredLayout(slide.id),
    });
    const outPath = path.join(outDir, `${slide.name}.png`);
    await fs.writeFile(outPath, out);
    paths.push(outPath);
  }

  return paths;
}
