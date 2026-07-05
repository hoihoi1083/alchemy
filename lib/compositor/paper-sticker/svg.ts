import { compositorFontFaceCss, compositorFontPath, sanitizeCompositorText } from "@/lib/compositor/fonts";
import { TEXT } from "@/lib/compositor/paper-sticker/layout";

export function fontPath(name: "headline" | "body"): string {
  return compositorFontPath(name);
}

export { sanitizeCompositorText };

const PALETTE = {
  ink: "#2a2218",
  inkSoft: "#5c4f3f",
  accent: "#b8892e",
  accentSoft: "#e8d4a8",
  paper: "#fffdf7",
  paperEdge: "#f0e6d4",
};

export function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function wrapByChars(text: string, maxChars: number, maxLines: number): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  const lines: string[] = [];
  let current = "";
  for (const ch of trimmed) {
    if (current.length >= maxChars) {
      lines.push(current);
      current = ch;
      if (lines.length >= maxLines) break;
    } else {
      current += ch;
    }
  }
  if (current && lines.length < maxLines) lines.push(current);
  return lines;
}

export function wrapHeadline(text: string, maxCharsPerLine = TEXT.headlineMaxChars): string[] {
  return wrapByChars(text, maxCharsPerLine, TEXT.headlineMaxLines);
}

function wrapBullet(text: string): string[] {
  return wrapByChars(text, TEXT.bulletMaxChars, 2);
}

export function paperCardSvg(width: number, height: number): string {
  const w = width;
  const h = height;
  const tear =
    `M 16 0 H ${w - 16} Q ${w} 0 ${w} 16 V ${h - 56}` +
    ` Q ${w * 0.93} ${h - 18} ${w * 0.86} ${h - 40}` +
    ` Q ${w * 0.78} ${h - 62} ${w * 0.7} ${h - 30}` +
    ` Q ${w * 0.62} ${h - 6} ${w * 0.54} ${h - 44}` +
    ` Q ${w * 0.46} ${h - 78} ${w * 0.38} ${h - 26}` +
    ` Q ${w * 0.3} ${h - 2} ${w * 0.22} ${h - 38}` +
    ` Q ${w * 0.14} ${h - 70} ${w * 0.06} ${h - 22}` +
    ` L 0 ${h - 56} V 16 Q 0 0 16 0 Z`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <filter id="paperShadow" x="-25%" y="-25%" width="150%" height="150%">
      <feDropShadow dx="0" dy="14" stdDeviation="20" flood-color="#3d2e1e" flood-opacity="0.28"/>
    </filter>
    <linearGradient id="paperGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="${PALETTE.paper}"/>
    </linearGradient>
    <pattern id="paperGrain" width="6" height="6" patternUnits="userSpaceOnUse">
      <rect width="6" height="6" fill="${PALETTE.paper}"/>
      <circle cx="1" cy="2" r="0.45" fill="${PALETTE.paperEdge}" opacity="0.55"/>
    </pattern>
  </defs>
  <path d="${tear}" fill="url(#paperGrad)" filter="url(#paperShadow)"/>
  <path d="${tear}" fill="url(#paperGrain)" opacity="0.35"/>
  <rect x="${w * 0.18}" y="-12" width="${w * 0.22}" height="28" rx="4" fill="${PALETTE.accentSoft}" opacity="0.85" transform="rotate(-4 ${w * 0.29} 2)"/>
</svg>`;
}

export function textLayerSvg(opts: {
  headline: string;
  bullets: string[];
  brand: string;
  signoff: string;
  paperWidth: number;
  paperHeight: number;
  headlineSize: number;
}): string {
  const headline = sanitizeCompositorText(opts.headline);
  const bullets = opts.bullets.map(sanitizeCompositorText).filter(Boolean);
  const brand = sanitizeCompositorText(opts.brand);
  const signoff = sanitizeCompositorText(opts.signoff);
  const w = opts.paperWidth;
  const cx = w / 2;

  const headlineLines = wrapHeadline(headline);
  const headlineTspans = headlineLines
    .map(
      (line, i) =>
        `<tspan x="${cx}" dy="${i === 0 ? 0 : opts.headlineSize * 1.2}">${escapeXml(line)}</tspan>`,
    )
    .join("");

  const headlineBlockH = headlineLines.length * opts.headlineSize * 1.2;
  const dividerY = TEXT.headlineY + headlineBlockH + 28;
  const bulletsStartY = dividerY + 52;

  let bulletY = bulletsStartY;
  const bulletRows = bullets
    .slice(0, 5)
    .flatMap((b) => {
      const lines = wrapBullet(b);
      const rows = lines.map((line, li) => {
        const y = bulletY + li * TEXT.bulletLineHeight;
        const prefix = li === 0 ? "✦ " : "   ";
        return `<text x="${TEXT.bulletsX}" y="${y}" font-family="NotoBody" font-size="${TEXT.bulletSize}" fill="${PALETTE.inkSoft}">${prefix}${escapeXml(line)}</text>`;
      });
      bulletY += lines.length * TEXT.bulletLineHeight + 14;
      return rows;
    })
    .join("\n");

  const footerY = Math.min(TEXT.footerY, bulletY + 80);
  const showSignoff = Boolean(signoff && signoff !== "從略");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${opts.paperHeight}">
  <defs>
    <style>${compositorFontFaceCss()}</style>
    <linearGradient id="goldLine" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${PALETTE.accentSoft}"/>
      <stop offset="50%" stop-color="${PALETTE.accent}"/>
      <stop offset="100%" stop-color="${PALETTE.accentSoft}"/>
    </linearGradient>
  </defs>
  <rect x="64" y="${TEXT.headlineY - 36}" width="${w - 128}" height="${headlineBlockH + 56}" rx="18" fill="${PALETTE.accentSoft}" opacity="0.35"/>
  <text x="${cx}" y="${TEXT.headlineY}" text-anchor="middle" font-family="MaShanHeadline" font-size="${opts.headlineSize}" fill="${PALETTE.ink}">${headlineTspans}</text>
  <line x1="120" y1="${dividerY}" x2="${w - 120}" y2="${dividerY}" stroke="url(#goldLine)" stroke-width="2.5" stroke-linecap="round"/>
  ${bulletRows}
  <rect x="72" y="${footerY - 20}" width="${w - 144}" height="${showSignoff ? 108 : 72}" rx="16" fill="${PALETTE.accentSoft}" opacity="0.45"/>
  ${
    showSignoff
      ? `<text x="${cx}" y="${footerY + 18}" text-anchor="middle" font-family="MaShanHeadline" font-size="${TEXT.signoffSize}" fill="${PALETTE.accent}">${escapeXml(signoff)}</text>`
      : ""
  }
  <text x="${cx}" y="${footerY + (showSignoff ? 62 : 28)}" text-anchor="middle" font-family="NotoBody" font-size="${TEXT.brandSize}" fill="${PALETTE.inkSoft}" letter-spacing="2">${escapeXml(brand)}</text>
</svg>`;
}

export function sparkleSvg(width: number, height: number, opacity: number): string {
  const stars = [
    { cx: width * 0.82, cy: 120, r: 5 },
    { cx: width * 0.88, cy: 200, r: 3.5 },
    { cx: width * 0.76, cy: 280, r: 4 },
    { cx: width * 0.14, cy: 180, r: 3 },
    { cx: width * 0.22, cy: 320, r: 4.5 },
  ];
  const circles = stars
    .map(
      (s) =>
        `<circle cx="${s.cx}" cy="${s.cy}" r="${s.r}" fill="#fff8e8" opacity="${opacity}"/>` +
        `<circle cx="${s.cx}" cy="${s.cy}" r="${s.r * 2.2}" fill="#fff8e8" opacity="${opacity * 0.3}"/>`,
    )
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${circles}</svg>`;
}

export function cafeBackgroundSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0.2" y2="1">
      <stop offset="0%" stop-color="#f5ebe0"/>
      <stop offset="40%" stop-color="#e8d9c8"/>
      <stop offset="100%" stop-color="#cbb89e"/>
    </linearGradient>
    <radialGradient id="bokeh1" cx="50%" cy="40%" r="50%">
      <stop offset="0%" stop-color="#fff8ee" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#fff8ee" stop-opacity="0"/>
    </radialGradient>
    <filter id="blur">
      <feGaussianBlur stdDeviation="28"/>
    </filter>
  </defs>
  <rect width="1080" height="1920" fill="url(#bg)"/>
  <ellipse cx="540" cy="720" rx="520" ry="420" fill="url(#bokeh1)"/>
  <g filter="url(#blur)" opacity="0.55">
    <circle cx="180" cy="520" r="140" fill="#d4a574"/>
    <circle cx="900" cy="680" r="120" fill="#c9956a"/>
    <circle cx="320" cy="1200" r="160" fill="#b8c9a0" opacity="0.7"/>
    <circle cx="820" cy="1380" r="100" fill="#e8c9a0"/>
  </g>
  <rect width="1080" height="1920" fill="#3d2e1e" opacity="0.06"/>
</svg>`;
}
