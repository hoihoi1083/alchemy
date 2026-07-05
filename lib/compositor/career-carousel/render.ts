import sharp from "sharp";
import path from "path";
import { escapeXml, fontPath } from "@/lib/compositor/paper-sticker/svg";
import {
  BRAND,
  CAREER_TYPES,
  COVER,
  INTRO,
  type CareerTypeSlide,
} from "@/lib/compositor/career-carousel/content";

/** IG carousel 4:5 */
export const W = 1080;
export const H = 1350;

const PALETTE = {
  bg: "#0f1419",
  panel: "#1c2430",
  accent: "#c9a962",
  accentSoft: "#e8d5a3",
  text: "#f5f3ef",
  muted: "#9aa8b8",
  line: "#3d4f63",
};

function bodyFont(): string {
  return fontPath("body");
}

function slideBackground(accentAngle = 0): Buffer {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${PALETTE.bg}"/>
      <stop offset="100%" stop-color="#162032"/>
    </linearGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${PALETTE.accent}" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="${PALETTE.accent}" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect x="-120" y="${200 + accentAngle * 40}" width="520" height="900" fill="url(#accent)" transform="rotate(-12 240 650)"/>
  <circle cx="920" cy="180" r="140" fill="${PALETTE.accent}" opacity="0.08"/>
  <circle cx="80" cy="${H - 120}" r="90" fill="${PALETTE.accent}" opacity="0.06"/>
  <line x1="72" y1="128" x2="${W - 72}" y2="128" stroke="${PALETTE.line}" stroke-width="1"/>
</svg>`;
  return Buffer.from(svg);
}

function headerSvg(kicker: string, brand = BRAND): Buffer {
  const font = bodyFont();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="120">
  <defs>
    <style>@font-face { font-family: 'NotoBody'; src: url('file://${font}'); }</style>
  </defs>
  <text x="72" y="52" font-family="NotoBody" font-size="26" fill="${PALETTE.muted}">${escapeXml(kicker)}</text>
  <text x="${W - 72}" y="52" text-anchor="end" font-family="NotoBody" font-size="28" fill="${PALETTE.accentSoft}" font-style="italic">${escapeXml(brand)}</text>
</svg>`;
  return Buffer.from(svg);
}

function coverTextSvg(): Buffer {
  const font = bodyFont();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <style>@font-face { font-family: 'NotoBody'; src: url('file://${font}'); }</style>
  </defs>
  <text x="${W - 72}" y="100" text-anchor="end" font-family="NotoBody" font-size="56" fill="${PALETTE.accent}" font-weight="bold">${escapeXml(COVER.year)}</text>
  <rect x="72" y="200" width="8" height="320" fill="${PALETTE.accent}"/>
  <text x="100" y="280" font-family="NotoBody" font-size="62" fill="${PALETTE.text}" font-weight="bold">你的工作行業別</text>
  <text x="100" y="360" font-family="NotoBody" font-size="62" fill="${PALETTE.text}" font-weight="bold">適合哪一種水晶呢？</text>
  <text x="100" y="480" font-family="NotoBody" font-size="34" fill="${PALETTE.accentSoft}">Different careers.</text>
  <text x="100" y="530" font-family="NotoBody" font-size="34" fill="${PALETTE.accentSoft}">Different energy.</text>
  <rect x="72" y="${H - 280}" width="${W - 144}" height="160" rx="16" fill="${PALETTE.panel}" stroke="${PALETTE.accent}" stroke-width="2"/>
  <text x="96" y="${H - 210}" font-family="NotoBody" font-size="36" fill="${PALETTE.text}">${escapeXml(COVER.footerZh)}</text>
  <text x="96" y="${H - 155}" font-family="NotoBody" font-size="28" fill="${PALETTE.muted}">${escapeXml(COVER.footerEn)}</text>
</svg>`;
  return Buffer.from(svg);
}

function introTextSvg(): Buffer {
  const font = bodyFont();
  let y = 200;
  const lineEls = INTRO.lines
    .map((line) => {
      const el = `<text x="72" y="${y}" font-family="NotoBody" font-size="36" fill="${PALETTE.text}">${escapeXml(line)}</text>`;
      y += line.length > 14 ? 52 : 48;
      return el;
    })
    .join("\n");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <style>@font-face { font-family: 'NotoBody'; src: url('file://${font}'); }</style>
  </defs>
  ${lineEls}
  <rect x="72" y="${H - 320}" width="${W - 144}" height="200" rx="20" fill="${PALETTE.accent}" opacity="0.95"/>
  <text x="96" y="${H - 250}" font-family="NotoBody" font-size="40" fill="${PALETTE.bg}" font-weight="bold">${escapeXml(INTRO.ctaLine1)}</text>
  <text x="96" y="${H - 190}" font-family="NotoBody" font-size="32" fill="${PALETTE.bg}">${escapeXml(INTRO.ctaLine2)}</text>
</svg>`;
  return Buffer.from(svg);
}

function typeSlideSvg(slide: CareerTypeSlide): Buffer {
  const font = bodyFont();
  const crystalRows = slide.crystals
    .map((c, i) => {
      const y = 520 + i * 72;
      return `
    <circle cx="88" cy="${y - 8}" r="6" fill="${PALETTE.accent}"/>
    <text x="108" y="${y}" font-family="NotoBody" font-size="32" fill="${PALETTE.accentSoft}" font-weight="bold">${escapeXml(c.name)}</text>
    <text x="108" y="${y + 36}" font-family="NotoBody" font-size="26" fill="${PALETTE.muted}">${escapeXml(c.benefit)}</text>`;
    })
    .join("\n");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <style>@font-face { font-family: 'NotoBody'; src: url('file://${font}'); }</style>
  </defs>
  <rect x="72" y="160" width="120" height="120" rx="60" fill="${PALETTE.accent}"/>
  <text x="132" y="235" text-anchor="middle" font-family="NotoBody" font-size="52" fill="${PALETTE.bg}" font-weight="bold">${slide.id}</text>
  <text x="220" y="220" font-family="NotoBody" font-size="48" fill="${PALETTE.text}" font-weight="bold">${slide.id}-${escapeXml(slide.title)} ${slide.emoji}</text>
  <text x="72" y="320" font-family="NotoBody" font-size="28" fill="${PALETTE.muted}">行業別：</text>
  <text x="72" y="365" font-family="NotoBody" font-size="30" fill="${PALETTE.text}">${escapeXml(slide.industries)}</text>
  <line x1="72" y1="400" x2="${W - 72}" y2="400" stroke="${PALETTE.line}" stroke-width="1"/>
  ${crystalRows}
  <rect x="72" y="${H - 200}" width="${W - 144}" height="120" rx="12" fill="${PALETTE.panel}" stroke="${PALETTE.line}" stroke-width="1"/>
  <text x="96" y="${H - 145}" font-family="NotoBody" font-size="28" fill="${PALETTE.muted}">適合：</text>
  <text x="180" y="${H - 145}" font-family="NotoBody" font-size="30" fill="${PALETTE.text}">${escapeXml(slide.suitable)} ✨</text>
</svg>`;
  return Buffer.from(svg);
}

async function compose(layers: Buffer[]): Promise<Buffer> {
  let img = sharp(layers[0]).png();
  const composites = layers.slice(1).map((input) => ({ input, top: 0, left: 0 }));
  return sharp(await img.toBuffer())
    .composite(composites)
    .png()
    .toBuffer();
}

export async function renderCoverSlide(): Promise<Buffer> {
  return compose([slideBackground(0), headerSvg("Career Crystal Guide"), coverTextSvg()]);
}

export async function renderIntroSlide(): Promise<Buffer> {
  return compose([slideBackground(1), headerSvg(INTRO.kicker), introTextSvg()]);
}

export async function renderTypeSlide(slide: CareerTypeSlide): Promise<Buffer> {
  return compose([
    slideBackground(slide.id),
    headerSvg("水晶職業分類推薦"),
    typeSlideSvg(slide),
  ]);
}

export async function renderAllCareerCarouselSlides(): Promise<
  { name: string; buffer: Buffer }[]
> {
  const out: { name: string; buffer: Buffer }[] = [];
  out.push({ name: "01-cover.png", buffer: await renderCoverSlide() });
  out.push({ name: "02-intro.png", buffer: await renderIntroSlide() });
  for (const slide of CAREER_TYPES) {
    out.push({
      name: `0${slide.id + 2}-${slide.title}.png`,
      buffer: await renderTypeSlide(slide),
    });
  }
  return out;
}

export async function writeCareerCarouselToDir(outDir: string): Promise<string[]> {
  const { promises: fs } = await import("fs");
  await fs.mkdir(outDir, { recursive: true });
  const slides = await renderAllCareerCarouselSlides();
  const paths: string[] = [];
  for (const s of slides) {
    const full = path.join(outDir, s.name);
    await fs.writeFile(full, s.buffer);
    paths.push(full);
  }
  return paths;
}
