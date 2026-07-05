import sharp from "sharp";
import { promises as fs } from "fs";
import path from "path";
import { escapeXml, fontPath } from "@/lib/compositor/paper-sticker/svg";
import {
  COVER,
  CRYSTAL_ART,
  CRYSTAL_PHOTOS,
  ENGAGE,
  GROUP_LAYOUT as G,
  HOWTO,
  LIFE_PATH_PEOPLE,
  W,
  H,
  type LifePathPerson,
} from "./content";

const P = {
  cream: "#F5F0E8",
  creamDark: "#EBE4DA",
  brown: "#4A3E3E",
  brownLight: "#6B5B55",
  rose: "#C9A09A",
  roseDark: "#B88989",
  white: "#FFFFFF",
};

const BAD_FILE = /cover|model|report|promo|gift|consult|universe|indoor|outdoor|slate|silk|wood|vintage|book/i;
const GOOD_FILE = /detail|01_|02_|03_|strawberry|obsidian|amethyst|sunstone|amber|yellow|amanda|sea_green|black|nine_purple/i;

function bodyFont(): string {
  return fontPath("body");
}

function creamBackground(): Buffer {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="3"/>
    <feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope="0.03"/></feComponentTransfer></filter>
  </defs>
  <rect width="${W}" height="${H}" fill="${P.cream}"/>
  <rect width="${W}" height="${H}" filter="url(#n)"/>
</svg>`;
  return Buffer.from(svg);
}

async function resolveCrystalFile(key: string): Promise<string | null> {
  const preferred = CRYSTAL_PHOTOS[key];
  if (!preferred) return null;
  const tryFile = async (f: string) => {
    try {
      await fs.access(f);
      return BAD_FILE.test(path.basename(f)) ? null : f;
    } catch {
      return null;
    }
  };
  const ok = await tryFile(preferred);
  if (ok) return ok;
  const dir = path.dirname(preferred);
  const files = (await fs.readdir(dir).catch(() => [] as string[])).filter(
    (f) => f.endsWith(".png"),
  );
  const ranked = files
    .filter((f) => !BAD_FILE.test(f))
    .sort((a, b) => {
      const score = (f: string) =>
        (GOOD_FILE.test(f) ? 10 : 0) + (f.startsWith("01_") ? 5 : 0);
      return score(b) - score(a);
    });
  for (const f of ranked) {
    const hit = await tryFile(path.join(dir, f));
    if (hit) return hit;
  }
  return null;
}

function crystalArtSvg(key: string, size: number): Buffer {
  const art = CRYSTAL_ART[key] || { fill: "#C8C0B8", accent: "#E8E4DC" };
  const s = size;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}">
  <rect width="${s}" height="${s}" rx="12" fill="#FAFAF8"/>
  <path d="M${s * 0.5} ${s * 0.18} L${s * 0.72} ${s * 0.42} L${s * 0.62} ${s * 0.78} L${s * 0.38} ${s * 0.78} L${s * 0.28} ${s * 0.42}Z" fill="${art.fill}" stroke="${art.accent}" stroke-width="2"/>
  <ellipse cx="${s * 0.44}" cy="${s * 0.38}" rx="${s * 0.12}" ry="${s * 0.08}" fill="${art.accent}" opacity="0.7"/>
</svg>`;
  return Buffer.from(svg);
}

async function photoIsProductShot(file: string): Promise<boolean> {
  try {
    const m = await sharp(file).metadata();
    if (!m.width || !m.height) return false;
    const ratio = m.width / m.height;
    return ratio >= 0.85 && ratio <= 1.2;
  } catch {
    return false;
  }
}

async function productGemCrop(file: string, size: number): Promise<Buffer> {
  return sharp(file)
    .resize(size, size, { fit: "cover", position: "centre" })
    .png()
    .toBuffer();
}

async function crystalTile(key: string, box: number): Promise<Buffer> {
  const inner = box - 12;
  const file = await resolveCrystalFile(key);
  let gem: Buffer;
  const usePhoto = file && (await photoIsProductShot(file));
  if (usePhoto && file) {
    try {
      gem = await productGemCrop(file, inner);
    } catch {
      gem = crystalArtSvg(key, inner);
    }
  } else {
    gem = crystalArtSvg(key, inner);
  }
  const frame = Buffer.from(
    `<svg width="${box}" height="${box}"><rect width="${box}" height="${box}" rx="14" fill="#FAFAF8" stroke="${P.creamDark}" stroke-width="1.5"/></svg>`,
  );
  return sharp(frame)
    .composite([{ input: gem, left: 6, top: 6 }])
    .png()
    .toBuffer();
}

function star(cx: number, cy: number): string {
  return `<text x="${cx}" y="${cy}" font-size="10" fill="${P.rose}">✦</text>`;
}

async function renderCover(): Promise<Buffer> {
  const font = bodyFont();
  const text = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs><style>@font-face{font-family:'N';src:url('file://${font}')}</style></defs>
  <rect x="100" y="180" width="880" height="920" rx="24" fill="${P.white}" opacity="0.72"/>
  <text x="${W / 2}" y="300" text-anchor="middle" font-family="N" font-size="52" fill="${P.brown}" font-weight="700">${escapeXml(COVER.line1)}</text>
  <text x="${W / 2}" y="370" text-anchor="middle" font-family="N" font-size="52" fill="${P.brown}" font-weight="700">${escapeXml(COVER.line2)}</text>
  <text x="${W / 2}" y="450" text-anchor="middle" font-family="N" font-size="58" fill="${P.roseDark}" font-weight="700">${escapeXml(COVER.line3)}</text>
  <rect x="${W / 2 - 240}" y="500" width="480" height="72" rx="36" fill="${P.rose}"/>
  <text x="${W / 2}" y="548" text-anchor="middle" font-family="N" font-size="30" fill="#fff" font-weight="600">${escapeXml(COVER.cta)}</text>
  ${star(W / 2 - 200, 620)}${star(W / 2 + 190, 620)}
  <text x="${W / 2}" y="640" text-anchor="middle" font-family="N" font-size="32" fill="${P.brownLight}">${escapeXml(COVER.sub)}</text>
  <rect x="${W / 2 - 300}" y="700" width="600" height="100" rx="20" fill="${P.white}" stroke="${P.rose}" stroke-width="1.5"/>
  <text x="${W / 2}" y="762" text-anchor="middle" font-family="N" font-size="28" fill="${P.brown}">${escapeXml(COVER.comment)}</text>
</svg>`;
  return sharp(creamBackground())
    .composite([{ input: Buffer.from(text), top: 0, left: 0 }])
    .png()
    .toBuffer();
}

async function renderHowto(): Promise<Buffer> {
  const font = bodyFont();
  const text = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs><style>@font-face{font-family:'N';src:url('file://${font}')}</style></defs>
  <text x="${W / 2}" y="120" text-anchor="middle" font-family="N" font-size="48" fill="${P.brown}" font-weight="700">${escapeXml(HOWTO.title)}</text>
  <rect x="${W / 2 - 200}" y="150" width="400" height="52" rx="26" fill="${P.rose}"/>
  <text x="${W / 2}" y="186" text-anchor="middle" font-family="N" font-size="26" fill="#fff">${escapeXml(HOWTO.example)}</text>
  <rect x="160" y="230" width="760" height="540" rx="28" fill="${P.white}" stroke="${P.creamDark}" stroke-width="2"/>
  <text x="${W / 2}" y="330" text-anchor="middle" font-family="N" font-size="34" fill="${P.brown}">${escapeXml(HOWTO.digits)}</text>
  <text x="${W / 2}" y="400" text-anchor="middle" font-family="N" font-size="36" fill="${P.brownLight}">↓</text>
  <text x="${W / 2}" y="470" text-anchor="middle" font-family="N" font-size="36" fill="${P.brown}">= ${escapeXml(HOWTO.sum)}</text>
  <text x="${W / 2}" y="540" text-anchor="middle" font-family="N" font-size="36" fill="${P.brownLight}">↓</text>
  <text x="${W / 2}" y="610" text-anchor="middle" font-family="N" font-size="36" fill="${P.brown}">${escapeXml(HOWTO.reduce)}</text>
  <text x="${W / 2}" y="680" text-anchor="middle" font-family="N" font-size="36" fill="${P.brownLight}">↓</text>
  <circle cx="${W / 2}" cy="760" r="44" fill="${P.rose}"/>
  <text x="${W / 2}" y="772" text-anchor="middle" font-family="N" font-size="42" fill="#fff" font-weight="700">${escapeXml(HOWTO.result)}</text>
  ${star(W / 2 - 120, 860)}${star(W / 2 + 100, 860)}
  <text x="${W / 2}" y="900" text-anchor="middle" font-family="N" font-size="34" fill="${P.brown}" font-weight="600">${escapeXml(HOWTO.resultLabel)}</text>
  <rect x="${W / 2 - 180}" y="960" width="360" height="48" rx="24" fill="none" stroke="${P.rose}" stroke-width="1.5"/>
  <text x="${W / 2}" y="992" text-anchor="middle" font-family="N" font-size="24" fill="${P.brownLight}">${escapeXml(HOWTO.note)}</text>
</svg>`;
  return sharp(creamBackground())
    .composite([{ input: Buffer.from(text), top: 0, left: 0 }])
    .png()
    .toBuffer();
}

function numberBadgePng(person: LifePathPerson): Buffer {
  const d = G.numR * 2;
  const c = G.numR;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${d}" height="${d}" viewBox="0 0 ${d} ${d}">
  <circle cx="${c}" cy="${c}" r="${c}" fill="${person.color}"/>
  <text x="${c}" y="${c + 13}" text-anchor="middle" font-size="40" fill="#fff" font-weight="700">${person.num}</text>
</svg>`;
  return Buffer.from(svg);
}

function cardStaticSvg(person: LifePathPerson, cardY: number): string {
  const badgeCy = cardY + G.cardH / 2 - 8;
  const traits = person.traits
    .map(
      (t, i) =>
        `<text x="${G.traitX}" y="${cardY + G.traitY1 + i * G.traitLine}" font-family="N" font-size="24" fill="${P.brown}">• ${escapeXml(t)}</text>`,
    )
    .join("");
  return `
  <rect x="${G.cardX}" y="${cardY}" width="${G.cardW}" height="${G.cardH}" rx="20" fill="${P.white}"/>
  <text x="${G.numCx}" y="${badgeCy + G.numR + 30}" text-anchor="middle" font-family="N" font-size="17" fill="${P.brownLight}">號人</text>
  ${traits}
  <text x="${(G.crystal1Cx + G.crystal2Cx) / 2}" y="${cardY + G.crystalTitleY}" text-anchor="middle" font-family="N" font-size="19" fill="${P.rose}">✦ 適合水晶 ✦</text>
  <line x1="${G.dividerX}" y1="${cardY + 64}" x2="${G.dividerX}" y2="${cardY + G.cardH - 28}" stroke="${P.creamDark}" stroke-width="1" opacity="0.55"/>`;
}

function crystalLabelSvg(name: string): Buffer {
  const font = bodyFont();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="148" height="40">
  <defs><style>@font-face{font-family:'N';src:url('file://${font}')}</style></defs>
  <text x="74" y="30" text-anchor="middle" font-family="N" font-size="21" fill="${P.brown}">${escapeXml(name)}</text>
</svg>`;
  return Buffer.from(svg);
}

async function renderGroup(
  range: [number, number],
  title: string,
): Promise<Buffer> {
  const font = bodyFont();
  const people = LIFE_PATH_PEOPLE.filter(
    (p) => p.num >= range[0] && p.num <= range[1],
  );

  let cardsSvg = "";
  const composites: sharp.OverlayOptions[] = [];

  for (let i = 0; i < people.length; i++) {
    const p = people[i];
    const cardY = G.firstCardY + i * (G.cardH + G.cardGap);
    cardsSvg += cardStaticSvg(p, cardY);

    const badgeCy = cardY + G.cardH / 2 - 8;
    const badge = numberBadgePng(p);
    composites.push({
      input: badge,
      left: Math.round(G.numCx - G.numR),
      top: Math.round(badgeCy - G.numR),
    });

    const imgY = cardY + G.crystalImgY;
    const box = G.crystalBox;
    const c1 = await crystalTile(p.crystals[0].key, box);
    const c2 = await crystalTile(p.crystals[1].key, box);
    composites.push({
      input: c1,
      left: Math.round(G.crystal1Cx - box / 2),
      top: imgY,
    });
    composites.push({
      input: c2,
      left: Math.round(G.crystal2Cx - box / 2),
      top: imgY,
    });
    composites.push({
      input: crystalLabelSvg(p.crystals[0].name),
      left: Math.round(G.crystal1Cx - 74),
      top: cardY + G.crystalLabelY,
    });
    composites.push({
      input: crystalLabelSvg(p.crystals[1].name),
      left: Math.round(G.crystal2Cx - 74),
      top: cardY + G.crystalLabelY,
    });
  }

  const header = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs><style>@font-face{font-family:'N';src:url('file://${font}')}</style></defs>
  <text x="${W / 2}" y="${G.titleY}" text-anchor="middle" font-family="N" font-size="44" fill="${P.brown}" font-weight="700">${escapeXml(title)}</text>
  ${star(W / 2 - 200, G.titleY - 6)}${star(W / 2 + 185, G.titleY - 6)}
  <rect x="${W / 2 - 190}" y="${G.subPillY}" width="380" height="40" rx="20" fill="${P.creamDark}"/>
  <text x="${W / 2}" y="${G.subTextY}" text-anchor="middle" font-family="N" font-size="22" fill="${P.brownLight}">看看你是哪一種呢？</text>
  ${cardsSvg}
</svg>`;

  composites.unshift({ input: Buffer.from(header), top: 0, left: 0 });

  return sharp(creamBackground()).composite(composites).png().toBuffer();
}

async function renderEngage(): Promise<Buffer> {
  const font = bodyFont();
  const text = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs><style>@font-face{font-family:'N';src:url('file://${font}')}</style></defs>
  <text x="${W / 2}" y="240" text-anchor="middle" font-family="N" font-size="52" fill="${P.brown}" font-weight="700">${escapeXml(ENGAGE.title)}</text>
  <rect x="${W / 2 - 220}" y="290" width="440" height="64" rx="14" fill="${P.white}" stroke="${P.rose}" stroke-width="1.5"/>
  <text x="${W / 2}" y="332" text-anchor="middle" font-family="N" font-size="30" fill="${P.brown}">${escapeXml(ENGAGE.highlight)}</text>
  <text x="${W / 2}" y="420" text-anchor="middle" font-family="N" font-size="28" fill="${P.brownLight}">${escapeXml(ENGAGE.reaction1)}</text>
  <text x="${W / 2}" y="460" text-anchor="middle" font-family="N" font-size="28" fill="${P.brownLight}">${escapeXml(ENGAGE.reaction2)}</text>
  <rect x="${W / 2 - 160}" y="500" width="320" height="56" rx="28" fill="${P.rose}"/>
  <text x="${W / 2}" y="536" text-anchor="middle" font-family="N" font-size="28" fill="#fff" font-weight="600">${escapeXml(ENGAGE.cta)}</text>
  <rect x="120" y="600" width="840" height="200" rx="24" fill="${P.white}"/>
  <text x="${W / 2}" y="680" text-anchor="middle" font-family="N" font-size="30" fill="${P.brown}">💬 ${escapeXml(ENGAGE.q1)}</text>
  <line x1="180" y1="720" x2="900" y2="720" stroke="${P.creamDark}" stroke-width="2" stroke-dasharray="8 6"/>
  <text x="${W / 2}" y="770" text-anchor="middle" font-family="N" font-size="30" fill="${P.brown}">♡ ${escapeXml(ENGAGE.q2)}</text>
  <text x="${W / 2}" y="900" text-anchor="middle" font-family="N" font-size="30" fill="${P.brown}">${escapeXml(ENGAGE.footer)}</text>
  <text x="${W / 2}" y="950" text-anchor="middle" font-family="N" font-size="34" fill="${P.roseDark}" font-weight="600">${escapeXml(ENGAGE.footer2)}</text>
</svg>`;
  return sharp(creamBackground())
    .composite([{ input: Buffer.from(text), top: 0, left: 0 }])
    .png()
    .toBuffer();
}

export async function writeLifePathCarouselToDir(outDir: string): Promise<string[]> {
  await fs.mkdir(outDir, { recursive: true });
  const slides: Array<{ name: string; render: () => Promise<Buffer> }> = [
    { name: "01-cover", render: renderCover },
    { name: "02-how-to-calculate", render: renderHowto },
    {
      name: "03-numbers-1-3",
      render: () => renderGroup([1, 3], "生命靈數 1～3 號人"),
    },
    {
      name: "04-numbers-4-6",
      render: () => renderGroup([4, 6], "生命靈數 4～6 號人"),
    },
    {
      name: "05-numbers-7-9",
      render: () => renderGroup([7, 9], "生命靈數 7～9 號人"),
    },
    { name: "06-engagement", render: renderEngage },
  ];

  const paths: string[] = [];
  for (const s of slides) {
    console.log(`  ${s.name}…`);
    const buf = await s.render();
    await fs.writeFile(path.join(outDir, `${s.name}.png`), buf);
    paths.push(path.join(outDir, `${s.name}.png`));
  }
  return paths;
}
