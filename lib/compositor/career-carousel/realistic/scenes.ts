import { W, H } from "@/lib/compositor/career-carousel/render-realistic/constants";

export type SceneId =
  | "cover-lounge"
  | "intro-wall-shadow"
  | "flatlay-creative"
  | "flatlay-gold"
  | "flatlay-executive"
  | "flatlay-calm-blue"
  | "flatlay-minimal-desk";

/** Photorealistic-style SVG scenes — window light, bokeh, material textures. */
export function realisticSceneSvg(id: SceneId): string {
  switch (id) {
    case "cover-lounge":
      return coverLounge();
    case "intro-wall-shadow":
      return introWallShadow();
    case "flatlay-creative":
      return flatlayCreative();
    case "flatlay-gold":
      return flatlayGold();
    case "flatlay-executive":
      return flatlayExecutive();
    case "flatlay-calm-blue":
      return flatlayCalmBlue();
    case "flatlay-minimal-desk":
      return flatlayMinimalDesk();
  }
}

function defs(): string {
  return `<defs>
    <filter id="blur40" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="40"/>
    </filter>
    <filter id="blur25" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="25"/>
    </filter>
    <filter id="blur8" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="8"/>
    </filter>
    <linearGradient id="vignette" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#000" stop-opacity="0.15"/>
      <stop offset="55%" stop-color="#000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000" stop-opacity="0.45"/>
    </linearGradient>
    <radialGradient id="windowLight" cx="85%" cy="8%" r="70%">
      <stop offset="0%" stop-color="#fff8ee" stop-opacity="0.95"/>
      <stop offset="45%" stop-color="#f5e6d3" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="#c4a882" stop-opacity="0"/>
    </radialGradient>
  </defs>`;
}

function coverLounge(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  ${defs()}
  <rect width="${W}" height="${H}" fill="#e8dcc8"/>
  <rect width="${W}" height="${H}" fill="url(#windowLight)"/>
  <ellipse cx="300" cy="900" rx="420" ry="260" fill="#c4a574" opacity="0.45" filter="url(#blur40)"/>
  <rect x="60" y="750" width="480" height="200" rx="100" fill="#a08060" opacity="0.35" filter="url(#blur25)"/>
  <circle cx="850" cy="520" r="100" fill="#8b7355" opacity="0.25" filter="url(#blur25)"/>
  <rect x="700" y="850" width="240" height="160" rx="8" fill="#faf8f5" opacity="0.55" transform="rotate(-10 820 930)"/>
  <rect x="820" y="450" width="70" height="220" rx="6" fill="#f0ebe3" opacity="0.65"/>
  <path d="M855 450 Q890 380 920 430 Q860 480 845 540" stroke="#6b5344" stroke-width="4" fill="none" opacity="0.4"/>
  <rect width="${W}" height="${H}" fill="url(#vignette)"/>
</svg>`;
}

function introWallShadow(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  ${defs()}
  <rect width="${W}" height="${H}" fill="#c8bdb2"/>
  <rect width="${W}" height="${H}" fill="url(#windowLight)"/>
  <!-- textured wall -->
  <rect width="${W}" height="${H}" fill="#b8aea3" opacity="0.3"/>
  <!-- person shadow silhouette -->
  <ellipse cx="280" cy="1100" rx="200" ry="40" fill="#000" opacity="0.12" filter="url(#blur8)"/>
  <path d="M180 200 Q220 180 260 220 L320 900 Q280 920 240 880 L200 400 Q160 280 180 200 Z" fill="#000" opacity="0.22"/>
  <path d="M260 220 Q340 200 380 280 L420 850 Q360 900 320 880 L320 220 Z" fill="#000" opacity="0.18"/>
  <!-- fur coat texture hint -->
  <path d="M200 400 Q280 380 340 450 L360 700 Q300 720 250 680 Z" fill="#5c4033" opacity="0.12"/>
  <rect width="${W}" height="${H}" fill="url(#vignette)"/>
</svg>`;
}

function flatlayCreative(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  ${defs()}
  <rect width="${W}" height="${H}" fill="#e8dfd4"/>
  <rect width="${W}" height="${H}" fill="url(#windowLight)"/>
  <!-- linen fabric -->
  <rect x="0" y="400" width="${W}" height="950" fill="#f0e8dc"/>
  ${linenTexture()}
  <!-- art book -->
  <rect x="120" y="720" width="280" height="360" fill="#fff" opacity="0.85" transform="rotate(-6 260 900)"/>
  <rect x="140" y="750" width="240" height="180" fill="#333" opacity="0.15" transform="rotate(-6 260 900)"/>
  <!-- knit sleeve -->
  <ellipse cx="780" cy="980" rx="160" ry="100" fill="#8b6914" opacity="0.35"/>
  ${beadBracelet(540, 1050, ["#e8d5c4", "#d4a574", "#f5ebe0", "#c9956b", "#fff5eb"], 14)}
  <rect width="${W}" height="${H}" fill="url(#vignette)"/>
</svg>`;
}

function flatlayGold(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  ${defs()}
  <rect width="${W}" height="${H}" fill="#f2dcc4"/>
  <radialGradient id="warmSpot" cx="50%" cy="75%" r="50%">
    <stop offset="0%" stop-color="#fff5e6" stop-opacity="0.9"/>
    <stop offset="100%" stop-color="#e8c9a0" stop-opacity="0"/>
  </radialGradient>
  <rect width="${W}" height="${H}" fill="url(#warmSpot)"/>
  ${marbleTexture()}
  ${beadBracelet(540, 1020, ["#d4af37", "#f5e6b8", "#c9a227", "#fff8dc", "#e6c200", "#ffd700"], 11)}
  <!-- bokeh -->
  <circle cx="200" cy="500" r="60" fill="#fff" opacity="0.15" filter="url(#blur25)"/>
  <circle cx="880" cy="600" r="80" fill="#fff" opacity="0.12" filter="url(#blur25)"/>
  <rect width="${W}" height="${H}" fill="url(#vignette)"/>
</svg>`;
}

function flatlayExecutive(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  ${defs()}
  <rect width="${W}" height="${H}" fill="#2a2520"/>
  <rect width="${W}" height="${H}" fill="url(#windowLight)" opacity="0.35"/>
  <!-- dark walnut desk -->
  <rect x="0" y="450" width="${W}" height="900" fill="#3d3228"/>
  <rect x="0" y="450" width="${W}" height="900" fill="#4a3f35" opacity="0.5"/>
  ${woodGrain()}
  ${beadBracelet(540, 1040, ["#1a1a1a", "#888", "#ddd", "#555", "#222", "#aaa"], 12)}
  <rect width="${W}" height="${H}" fill="url(#vignette)"/>
</svg>`;
}

function flatlayCalmBlue(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  ${defs()}
  <rect width="${W}" height="${H}" fill="#dce8ef"/>
  <radialGradient id="blueLight" cx="30%" cy="15%" r="65%">
    <stop offset="0%" stop-color="#fff" stop-opacity="0.85"/>
    <stop offset="100%" stop-color="#b8d4e8" stop-opacity="0"/>
  </radialGradient>
  <rect width="${W}" height="${H}" fill="url(#blueLight)"/>
  <rect x="0" y="420" width="${W}" height="930" fill="#e8f0f5"/>
  ${beadBracelet(540, 1010, ["#7ec8e3", "#b8e0f0", "#5ba8c9", "#d4eef8", "#89cff0"], 13)}
  <rect width="${W}" height="${H}" fill="url(#vignette)"/>
</svg>`;
}

function flatlayMinimalDesk(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  ${defs()}
  <rect width="${W}" height="${H}" fill="#ebe6df"/>
  <rect width="${W}" height="${H}" fill="url(#windowLight)"/>
  <!-- minimal desk -->
  <rect x="0" y="480" width="${W}" height="870" fill="#f5f2ed"/>
  <!-- planner -->
  <rect x="140" y="760" width="220" height="280" rx="6" fill="#fff" opacity="0.7"/>
  <rect x="160" y="790" width="180" height="4" fill="#ccc" opacity="0.5"/>
  <rect x="160" y="820" width="140" height="4" fill="#ccc" opacity="0.4"/>
  ${beadBracelet(560, 1030, ["#6b5344", "#a08060", "#8b7355", "#d4c4b0", "#5c4033"], 12)}
  <rect width="${W}" height="${H}" fill="url(#vignette)"/>
</svg>`;
}

function linenTexture(): string {
  let lines = "";
  for (let i = 0; i < 40; i++) {
    const y = 420 + i * 22;
    lines += `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="#ddd" stroke-width="0.5" opacity="0.15"/>`;
  }
  return lines;
}

function marbleTexture(): string {
  return `<g opacity="0.12">
    <path d="M0 500 Q200 480 400 520 T800 490 T1080 510 L1080 1350 L0 1350 Z" fill="#888"/>
    <path d="M0 700 Q300 680 600 720 T1080 690 L1080 1350 L0 1350 Z" fill="#666"/>
  </g>`;
}

function woodGrain(): string {
  let g = "";
  for (let i = 0; i < 30; i++) {
    const y = 480 + i * 28;
    g += `<line x1="0" y1="${y}" x2="${W}" y2="${y + 4}" stroke="#2a2018" stroke-width="1" opacity="0.08"/>`;
  }
  return g;
}

function beadBracelet(cx: number, cy: number, colors: string[], r: number): string {
  const n = colors.length * 3;
  let beads = "";
  for (let i = 0; i < n; i++) {
    const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
    const bx = cx + Math.cos(angle) * r * 8;
    const by = cy + Math.sin(angle) * r * 5;
    const c = colors[i % colors.length];
    beads += `<circle cx="${bx}" cy="${by}" r="${r}" fill="${c}" opacity="0.92"/>
    <circle cx="${bx - 3}" cy="${by - 3}" r="${r * 0.35}" fill="#fff" opacity="0.25"/>`;
  }
  return `<g filter="url(#blur8)" opacity="0.95">${beads}</g>`;
}

export const SCENE_BY_SLIDE: SceneId[] = [
  "cover-lounge",
  "intro-wall-shadow",
  "flatlay-creative",
  "flatlay-gold",
  "flatlay-executive",
  "flatlay-calm-blue",
  "flatlay-minimal-desk",
];
