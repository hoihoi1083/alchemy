import sharp from "sharp";
import path from "path";
import { escapeXml, fontPath } from "@/lib/compositor/paper-sticker/svg";
import { W, H } from "@/lib/compositor/career-carousel/render-realistic/constants";
import { realisticSceneSvg, type SceneId } from "@/lib/compositor/career-carousel/realistic/scenes";
import {
  BRAND,
  CAREER_TYPES,
  COVER,
  INTRO,
  type CareerTypeSlide,
} from "@/lib/compositor/career-carousel/content";

const TEXT = {
  white: "#ffffff",
  soft: "#faf8f5",
  shadow: "rgba(0,0,0,0.35)",
  scrim: "rgba(0,0,0,0.42)",
};

function bodyFont(): string {
  return fontPath("body");
}

function headlineFont(): string {
  return fontPath("headline");
}

/** Subtle film grain for photo feel */
async function addPhotoFinish(img: Buffer): Promise<Buffer> {
  const meta = await sharp(img).metadata();
  const w = meta.width ?? W;
  const h = meta.height ?? H;
  const raw = Buffer.alloc(w * h);
  for (let i = 0; i < raw.length; i++) {
    raw[i] = 128 + Math.floor((Math.random() - 0.5) * 40);
  }
  const noise = await sharp(raw, { raw: { width: w, height: h, channels: 1 } })
    .blur(0.6)
    .png()
    .toBuffer();
  const faded = await sharp(noise).ensureAlpha(0.04).png().toBuffer();
  return sharp(img)
    .modulate({ brightness: 1.03, saturation: 1.12 })
    .composite([{ input: faded, blend: "soft-light" }])
    .png()
    .toBuffer();
}

async function renderScene(sceneId: SceneId): Promise<Buffer> {
  const svg = realisticSceneSvg(sceneId);
  return sharp(Buffer.from(svg)).resize(W, H).png().toBuffer();
}

function textShadowFilter(id: string): string {
  return `<filter id="${id}" x="-10%" y="-10%" width="120%" height="130%">
    <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="#000" flood-opacity="0.45"/>
  </filter>`;
}

function scrimRect(y: number, height: number, opacity = 0.35): string {
  return `<rect x="0" y="${y}" width="${W}" height="${height}" fill="#000" opacity="${opacity}"/>`;
}

function coverOverlay(): Buffer {
  const font = bodyFont();
  const hFont = headlineFont();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <style>
      @font-face { font-family: 'NotoBody'; src: url('file://${font}'); }
      @font-face { font-family: 'MaShan'; src: url('file://${hFont}'); }
    </style>
    ${textShadowFilter("ts")}
  </defs>
  ${scrimRect(0, 200, 0.25)}
  <text x="72" y="80" font-family="MaShan" font-size="36" fill="${TEXT.white}" filter="url(#ts)" font-style="italic">${escapeXml(BRAND)}</text>
  <text x="${W - 72}" y="100" text-anchor="end" font-family="NotoBody" font-size="64" fill="${TEXT.white}" filter="url(#ts)" font-weight="bold">${escapeXml(COVER.year)}</text>
  ${scrimRect(520, 830, 0.38)}
  <text x="72" y="640" font-family="NotoBody" font-size="58" fill="${TEXT.white}" filter="url(#ts)" font-weight="bold">你的工作行業別</text>
  <text x="72" y="720" font-family="NotoBody" font-size="58" fill="${TEXT.white}" filter="url(#ts)" font-weight="bold">適合哪一種水晶呢？</text>
  <text x="72" y="810" font-family="NotoBody" font-size="32" fill="${TEXT.soft}" filter="url(#ts)">Different careers.</text>
  <text x="72" y="860" font-family="NotoBody" font-size="32" fill="${TEXT.soft}" filter="url(#ts)">Different energy.</text>
  <text x="72" y="980" font-family="NotoBody" font-size="34" fill="${TEXT.white}" filter="url(#ts)">${escapeXml(COVER.footerZh)}</text>
  <text x="72" y="1030" font-family="NotoBody" font-size="26" fill="${TEXT.soft}" filter="url(#ts)">${escapeXml(COVER.footerEn)}</text>
</svg>`;
  return Buffer.from(svg);
}

function introOverlay(): Buffer {
  const font = bodyFont();
  let y = 180;
  const lines = INTRO.lines
    .map((line) => {
      const el = `<text x="72" y="${y}" font-family="NotoBody" font-size="34" fill="${TEXT.white}" filter="url(#ts)">${escapeXml(line)}</text>`;
      y += line.length > 16 ? 48 : 44;
      return el;
    })
    .join("\n");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <style>@font-face { font-family: 'NotoBody'; src: url('file://${font}'); }</style>
    ${textShadowFilter("ts")}
  </defs>
  <text x="72" y="72" font-family="NotoBody" font-size="24" fill="${TEXT.soft}" filter="url(#ts)">${escapeXml(INTRO.kicker)}</text>
  <text x="${W - 72}" y="72" text-anchor="end" font-family="NotoBody" font-size="28" fill="${TEXT.white}" filter="url(#ts)" font-style="italic">${escapeXml(BRAND)}</text>
  ${scrimRect(120, 720, 0.32)}
  ${lines}
  ${scrimRect(H - 280, 260, 0.5)}
  <text x="${W / 2}" y="${H - 195}" text-anchor="middle" font-family="NotoBody" font-size="38" fill="${TEXT.white}" filter="url(#ts)" font-weight="bold">${escapeXml(INTRO.ctaLine1)}</text>
  <text x="${W / 2}" y="${H - 135}" text-anchor="middle" font-family="NotoBody" font-size="28" fill="${TEXT.soft}" filter="url(#ts)">${escapeXml(INTRO.ctaLine2)}</text>
</svg>`;
  return Buffer.from(svg);
}

function typeOverlay(slide: CareerTypeSlide, darkBg: boolean): Buffer {
  const font = bodyFont();
  const textMain = TEXT.white;
  const textMuted = "rgba(255,255,255,0.88)";
  const scrimOp = darkBg ? 0.38 : 0.32;

  const crystalRows = slide.crystals
    .map((c, i) => {
      const y = 380 + i * 68;
      return `
    <text x="${W / 2}" y="${y}" text-anchor="middle" font-family="NotoBody" font-size="30" fill="${textMain}" filter="url(#ts)">${escapeXml(c.name)} | ${escapeXml(c.benefit)}</text>`;
    })
    .join("\n");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <style>@font-face { font-family: 'NotoBody'; src: url('file://${font}'); }</style>
    ${textShadowFilter("ts")}
  </defs>
  <text x="72" y="56" font-family="NotoBody" font-size="22" fill="${textMain}" filter="url(#ts)">水晶職業分類推薦</text>
  <text x="${W - 72}" y="56" text-anchor="end" font-family="NotoBody" font-size="26" fill="${textMain}" filter="url(#ts)" font-style="italic">${escapeXml(BRAND)}</text>
  ${scrimRect(80, 620, scrimOp)}
  <text x="${W / 2}" y="160" text-anchor="middle" font-family="NotoBody" font-size="44" fill="${textMain}" filter="url(#ts)" font-weight="bold">${slide.id}-${escapeXml(slide.title)} ${slide.emoji}</text>
  <text x="${W / 2}" y="220" text-anchor="middle" font-family="NotoBody" font-size="26" fill="${textMuted}" filter="url(#ts)">行業別：${escapeXml(slide.industries)}</text>
  ${crystalRows}
  ${scrimRect(H - 160, 140, scrimOp + 0.1)}
  <text x="${W / 2}" y="${H - 85}" text-anchor="middle" font-family="NotoBody" font-size="28" fill="${textMain}" filter="url(#ts)">適合：${escapeXml(slide.suitable)} ✨</text>
</svg>`;
  return Buffer.from(svg);
}

async function composeScene(sceneId: SceneId, overlay: Buffer): Promise<Buffer> {
  const base = await renderScene(sceneId);
  const merged = await sharp(base).composite([{ input: overlay, top: 0, left: 0 }]).png().toBuffer();
  return addPhotoFinish(merged);
}

export async function renderRealisticCover(): Promise<Buffer> {
  return composeScene("cover-lounge", coverOverlay());
}

export async function renderRealisticIntro(): Promise<Buffer> {
  return composeScene("intro-wall-shadow", introOverlay());
}

const TYPE_SCENES: SceneId[] = [
  "flatlay-creative",
  "flatlay-gold",
  "flatlay-executive",
  "flatlay-calm-blue",
  "flatlay-minimal-desk",
];

const TYPE_DARK: boolean[] = [false, false, true, false, false];

export async function renderRealisticType(slide: CareerTypeSlide): Promise<Buffer> {
  const scene = TYPE_SCENES[slide.id - 1];
  const dark = TYPE_DARK[slide.id - 1];
  return composeScene(scene, typeOverlay(slide, dark));
}

export async function renderAllRealisticSlides(): Promise<{ name: string; buffer: Buffer }[]> {
  const out: { name: string; buffer: Buffer }[] = [];
  out.push({ name: "01-cover.png", buffer: await renderRealisticCover() });
  out.push({ name: "02-intro.png", buffer: await renderRealisticIntro() });
  for (const slide of CAREER_TYPES) {
    out.push({
      name: `0${slide.id + 2}-${slide.title}.png`,
      buffer: await renderRealisticType(slide),
    });
  }
  return out;
}

export async function writeRealisticCarouselToDir(outDir: string): Promise<string[]> {
  const { promises: fs } = await import("fs");
  await fs.mkdir(outDir, { recursive: true });
  const slides = await renderAllRealisticSlides();
  const paths: string[] = [];
  for (const s of slides) {
    const full = path.join(outDir, s.name);
    await fs.writeFile(full, s.buffer);
    paths.push(full);
  }
  return paths;
}
