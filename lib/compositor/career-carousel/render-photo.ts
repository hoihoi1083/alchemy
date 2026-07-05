import sharp from "sharp";
import path from "path";
import { escapeXml, fontPath } from "@/lib/compositor/paper-sticker/svg";
import { W, H } from "@/lib/compositor/career-carousel/render-realistic/constants";
import {
  CAREER_TYPES,
  COVER,
  INTRO,
  type CareerTypeSlide,
} from "@/lib/compositor/career-carousel/content";
import { PHOTO_ASSETS, PHOTO_ASSETS_README } from "./photo-assets";

const LOGO_PATH = path.join(process.cwd(), "public", "compositor", "bottom.png");
const LOGO_WIDTH_RATIO = 0.092;
const LOGO_MARGIN_X_RATIO = 0.032;
const LOGO_MARGIN_Y_RATIO = 0.032;

const TEXT = {
  white: "#ffffff",
  soft: "rgba(255,255,255,0.92)",
  shadow: "rgba(0,0,0,0.4)",
};

type CropPosition = "center" | "attention" | "top" | "bottom";

function bodyFont(): string {
  return fontPath("body");
}

function textShadowFilter(id: string): string {
  return `<filter id="${id}" x="-12%" y="-12%" width="125%" height="140%">
    <feDropShadow dx="0" dy="2" stdDeviation="5" flood-color="#000" flood-opacity="0.5"/>
  </filter>`;
}

/** Masks existing 風鈴 vertical copy + red seal from marketing shots. */
function brandCleanupLayer(): Buffer {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <linearGradient id="leftFade" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#f5e8dc" stop-opacity="0.55"/>
      <stop offset="55%" stop-color="#f5e8dc" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="cornerFade" x1="1" y1="1" x2="0" y2="0">
      <stop offset="0%" stop-color="#efe6dc" stop-opacity="0.7"/>
      <stop offset="70%" stop-color="#efe6dc" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="340" height="${H}" fill="url(#leftFade)"/>
  <rect x="${W - 220}" y="${H - 200}" width="220" height="200" fill="url(#cornerFade)"/>
</svg>`;
  return Buffer.from(svg);
}

function brandCleanupLayerDark(): Buffer {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <linearGradient id="leftFade" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#000" stop-opacity="0.45"/>
      <stop offset="60%" stop-color="#000" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="cornerFade" x1="1" y1="1" x2="0" y2="0">
      <stop offset="0%" stop-color="#000" stop-opacity="0.55"/>
      <stop offset="70%" stop-color="#000" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="300" height="${H}" fill="url(#leftFade)"/>
  <rect x="${W - 200}" y="${H - 180}" width="200" height="180" fill="url(#cornerFade)"/>
</svg>`;
  return Buffer.from(svg);
}

/** Fade built-in 風鈴 seal before pasting bottom.png. */
function bottomCornerMaskLayer(dark = false): Buffer {
  const color = dark ? "#000" : "#f5efe8";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <radialGradient id="corner" cx="100%" cy="100%" r="55%">
      <stop offset="0%" stop-color="${color}" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect x="${W - 200}" y="${H - 180}" width="200" height="180" fill="url(#corner)"/>
</svg>`;
  return Buffer.from(svg);
}

let cachedLogo: Buffer | null = null;

async function cornerLogoLayer(dark = false): Promise<sharp.OverlayOptions[]> {
  if (!cachedLogo) {
    const lw = Math.max(28, Math.round(W * LOGO_WIDTH_RATIO));
    const { data, info } = await sharp(LOGO_PATH)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] < 28 && data[i + 1] < 28 && data[i + 2] < 28) data[i + 3] = 0;
    }
    cachedLogo = await sharp(data, {
      raw: { width: info.width, height: info.height, channels: 4 },
    })
      .resize(lw)
      .png()
      .toBuffer();
  }
  const meta = await sharp(cachedLogo).metadata();
  const lw = meta.width ?? 0;
  const lh = meta.height ?? 0;
  const marginX = Math.max(8, Math.round(W * LOGO_MARGIN_X_RATIO));
  const marginY = Math.max(8, Math.round(H * LOGO_MARGIN_Y_RATIO));
  return [
    { input: bottomCornerMaskLayer(dark), blend: "over" },
    {
      input: cachedLogo,
      left: W - lw - marginX,
      top: H - lh - marginY,
    },
  ];
}

function topScrim(height: number, opacity: number): string {
  return `<rect x="0" y="0" width="${W}" height="${height}" fill="#000" opacity="${opacity}"/>`;
}

function bottomScrim(height: number, opacity: number): string {
  return `<rect x="0" y="${H - height}" width="${W}" height="${height}" fill="#000" opacity="${opacity}"/>`;
}

function coverOverlay(): Buffer {
  const font = bodyFont();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <style>@font-face { font-family: 'NotoBody'; src: url('file://${font}'); }</style>
    ${textShadowFilter("ts")}
  </defs>
  ${topScrim(220, 0.22)}
  <text x="${W - 64}" y="100" text-anchor="end" font-family="NotoBody" font-size="62" fill="${TEXT.white}" filter="url(#ts)" font-weight="bold">${escapeXml(COVER.year)}</text>
  ${topScrim(900, 0.15)}
  <text x="64" y="620" font-family="NotoBody" font-size="56" fill="${TEXT.white}" filter="url(#ts)" font-weight="bold">你的工作行業別</text>
  <text x="64" y="700" font-family="NotoBody" font-size="56" fill="${TEXT.white}" filter="url(#ts)" font-weight="bold">適合哪一種水晶呢？</text>
  <text x="64" y="790" font-family="NotoBody" font-size="30" fill="${TEXT.soft}" filter="url(#ts)">Different careers.</text>
  <text x="64" y="838" font-family="NotoBody" font-size="30" fill="${TEXT.soft}" filter="url(#ts)">Different energy.</text>
  ${bottomScrim(200, 0.28)}
  <text x="${W / 2}" y="${H - 120}" text-anchor="middle" font-family="NotoBody" font-size="32" fill="${TEXT.white}" filter="url(#ts)">${escapeXml(COVER.footerZh)}</text>
  <text x="${W / 2}" y="${H - 72}" text-anchor="middle" font-family="NotoBody" font-size="24" fill="${TEXT.soft}" filter="url(#ts)">${escapeXml(COVER.footerEn)}</text>
</svg>`;
  return Buffer.from(svg);
}

function introOverlay(): Buffer {
  const font = bodyFont();
  let y = 320;
  const lines = INTRO.lines
    .map((line) => {
      const el = `<text x="${W / 2}" y="${y}" text-anchor="middle" font-family="NotoBody" font-size="32" fill="${TEXT.white}" filter="url(#ts)">${escapeXml(line)}</text>`;
      y += line.length > 14 ? 46 : 42;
      return el;
    })
    .join("\n");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <style>@font-face { font-family: 'NotoBody'; src: url('file://${font}'); }</style>
    ${textShadowFilter("ts")}
  </defs>
  ${topScrim(120, 0.35)}
  <text x="64" y="64" font-family="NotoBody" font-size="22" fill="${TEXT.soft}" filter="url(#ts)">${escapeXml(INTRO.kicker)}</text>
  <rect x="0" y="240" width="${W}" height="640" fill="#000" opacity="0.2"/>
  ${lines}
  ${bottomScrim(260, 0.45)}
  <text x="${W / 2}" y="${H - 175}" text-anchor="middle" font-family="NotoBody" font-size="38" fill="${TEXT.white}" filter="url(#ts)" font-weight="bold">${escapeXml(INTRO.ctaLine1)}</text>
  <text x="${W / 2}" y="${H - 118}" text-anchor="middle" font-family="NotoBody" font-size="26" fill="${TEXT.soft}" filter="url(#ts)">${escapeXml(INTRO.ctaLine2)}</text>
</svg>`;
  return Buffer.from(svg);
}

function typeOverlay(slide: CareerTypeSlide, darkBg: boolean): Buffer {
  const font = bodyFont();
  const textMain = TEXT.white;
  const textMuted = TEXT.soft;
  const topOp = darkBg ? 0.42 : 0.36;
  const botOp = darkBg ? 0.48 : 0.4;

  const crystalRows = slide.crystals
    .map((c, i) => {
      const y = 248 + i * 56;
      return `<text x="${W / 2}" y="${y}" text-anchor="middle" font-family="NotoBody" font-size="28" fill="${textMain}" filter="url(#ts)">${escapeXml(c.name)} | ${escapeXml(c.benefit)}</text>`;
    })
    .join("\n");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <style>@font-face { font-family: 'NotoBody'; src: url('file://${font}'); }</style>
    ${textShadowFilter("ts")}
  </defs>
  ${topScrim(500, topOp - 0.06)}
  <text x="56" y="52" font-family="NotoBody" font-size="20" fill="${textMuted}" filter="url(#ts)">水晶職業分類推薦</text>
  <text x="${W / 2}" y="118" text-anchor="middle" font-family="NotoBody" font-size="42" fill="${textMain}" filter="url(#ts)" font-weight="bold">${slide.id}-${escapeXml(slide.title)} ${slide.emoji}</text>
  <text x="${W / 2}" y="168" text-anchor="middle" font-family="NotoBody" font-size="24" fill="${textMuted}" filter="url(#ts)">行業別：${escapeXml(slide.industries)}</text>
  ${crystalRows}
  ${bottomScrim(150, botOp)}
  <text x="${W / 2}" y="${H - 72}" text-anchor="middle" font-family="NotoBody" font-size="26" fill="${textMain}" filter="url(#ts)">適合：${escapeXml(slide.suitable)} ✨</text>
</svg>`;
  return Buffer.from(svg);
}

async function loadPhoto(
  filePath: string,
  opts: { position?: CropPosition; shiftX?: number } = {},
): Promise<Buffer> {
  const position = opts.position ?? "center";
  const shiftX = opts.shiftX ?? 0;

  if (shiftX !== 0) {
    const meta = await sharp(filePath).rotate().metadata();
    const sw = meta.width ?? W;
    const sh = meta.height ?? H;
    const scale = Math.max(W / sw, H / sh);
    const nw = Math.ceil(sw * scale);
    const nh = Math.ceil(sh * scale);
    const maxLeft = Math.max(0, nw - W);
    const maxTop = Math.max(0, nh - H);
    const left = Math.round(
      Math.min(maxLeft, Math.max(0, maxLeft / 2 + shiftX)),
    );
    const top = Math.round(maxTop / 2);

    return sharp(filePath)
      .rotate()
      .resize(nw, nh, { fit: "fill" })
      .extract({ left, top, width: W, height: H })
      .modulate({ brightness: 1.04, saturation: 1.1 })
      .png()
      .toBuffer();
  }

  const gravity =
    position === "attention"
      ? "attention"
      : position === "top"
        ? "north"
        : position === "bottom"
          ? "south"
          : "centre";

  return sharp(filePath)
    .rotate()
    .resize(W, H, { fit: "cover", position: gravity })
    .modulate({ brightness: 1.04, saturation: 1.1 })
    .png()
    .toBuffer();
}

async function composePhoto(
  filePath: string,
  overlay: Buffer,
  opts: {
    position?: CropPosition;
    shiftX?: number;
    dark?: boolean;
    addLogo?: boolean;
  } = {},
): Promise<Buffer> {
  const base = await loadPhoto(filePath, {
    position: opts.position,
    shiftX: opts.shiftX,
  });
  const cleanup = opts.dark ? brandCleanupLayerDark() : brandCleanupLayer();
  const layers: sharp.OverlayOptions[] = [
    { input: cleanup, blend: "over" },
    { input: overlay, blend: "over" },
  ];
  if (opts.addLogo) {
    layers.push(...(await cornerLogoLayer(!!opts.dark)));
  }
  return sharp(base).composite(layers).png().toBuffer();
}

export async function renderPhotoCover(): Promise<Buffer> {
  return composePhoto(PHOTO_ASSETS.cover, coverOverlay(), {
    position: "attention",
    addLogo: true,
  });
}

export async function renderPhotoIntro(): Promise<Buffer> {
  return composePhoto(PHOTO_ASSETS.intro, introOverlay(), {
    position: "center",
    addLogo: true,
  });
}

export async function renderPhotoType(slide: CareerTypeSlide): Promise<Buffer> {
  const asset = PHOTO_ASSETS.types.find((t) => t.id === slide.id);
  if (!asset) throw new Error(`No photo asset for slide ${slide.id}`);
  const dark = "dark" in asset && !!asset.dark;
  const shiftX = "shiftX" in asset ? asset.shiftX : undefined;
  return composePhoto(asset.file, typeOverlay(slide, dark), {
    position: asset.position,
    shiftX,
    dark,
    addLogo: slide.id !== 1,
  });
}

export async function renderAllPhotoSlides(): Promise<{ name: string; buffer: Buffer }[]> {
  const out: { name: string; buffer: Buffer }[] = [];
  out.push({ name: "01-cover.png", buffer: await renderPhotoCover() });
  out.push({ name: "02-intro.png", buffer: await renderPhotoIntro() });
  for (const slide of CAREER_TYPES) {
    out.push({
      name: `0${slide.id + 2}-${slide.title}.png`,
      buffer: await renderPhotoType(slide),
    });
  }
  return out;
}

export async function writePhotoCarouselToDir(outDir: string): Promise<string[]> {
  const { promises: fs } = await import("fs");
  await fs.mkdir(outDir, { recursive: true });
  const slides = await renderAllPhotoSlides();
  const paths: string[] = [];
  for (const s of slides) {
    const full = path.join(outDir, s.name);
    await fs.writeFile(full, s.buffer);
    paths.push(full);
  }
  await fs.writeFile(path.join(outDir, "ASSETS.txt"), PHOTO_ASSETS_README, "utf8");
  return paths;
}
