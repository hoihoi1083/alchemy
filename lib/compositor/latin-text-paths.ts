import { readFileSync } from "fs";
import opentype from "opentype.js";
import { compositorFontPath, ensureCompositorFonts } from "@/lib/compositor/fonts";

type CachedFont = opentype.Font;

let latinRegular: CachedFont | null = null;
let latinBold: CachedFont | null = null;

function loadFont(role: "latin" | "latinBold"): CachedFont {
  ensureCompositorFonts();
  const file = compositorFontPath(role);
  const buf = readFileSync(file);
  const font = opentype.parse(
    buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
  );
  if (!font?.glyphs?.length) {
    throw new Error(`Failed to parse compositor font: ${file}`);
  }
  return font;
}

function getLatinFont(bold: boolean): CachedFont {
  if (bold) {
    if (!latinBold) latinBold = loadFont("latinBold");
    return latinBold;
  }
  if (!latinRegular) latinRegular = loadFont("latin");
  return latinRegular;
}

/** Advance + path without OpenType feature lookups (Noto breaks opentype.js ccmp). */
function layoutLatinLine(
  font: CachedFont,
  text: string,
  fontSize: number,
  baselineY: number,
): { d: string; width: number } {
  const scale = fontSize / font.unitsPerEm;
  let x = 0;
  const parts: string[] = [];
  for (const ch of text) {
    const glyph = font.charToGlyph(ch);
    const path = glyph.getPath(x, baselineY, fontSize);
    const d = path.toPathData(2);
    if (d && d !== "M0 0Z") parts.push(d);
    x += (glyph.advanceWidth ?? 0) * scale;
  }
  return { d: parts.join(" "), width: x };
}

/**
 * Render Latin text as SVG path outlines (no @font-face / Pango / fontconfig).
 * This is the reliable English burn path on Vercel Linux where Sharp SVG
 * fonts often paint .notdef tofu boxes.
 */
export function latinCaptionSvgPaths(opts: {
  lines: string[];
  lineYs: number[];
  x: number;
  anchor: "start" | "middle" | "end";
  fontSize: number;
  bold?: boolean;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
}): string {
  const font = getLatinFont(Boolean(opts.bold));
  const fill = opts.fill ?? "white";
  const stroke = opts.stroke ?? "black";
  const strokeWidth = opts.strokeWidth ?? Math.max(2, Math.round(opts.fontSize * 0.12));

  return opts.lines
    .map((line, i) => {
      const y = opts.lineYs[i] ?? opts.lineYs[opts.lineYs.length - 1] ?? 0;
      // opentype baseline ≈ alphabetic; approximate dominant-baseline=middle.
      const baselineY = y + opts.fontSize * 0.35;
      const { d, width } = layoutLatinLine(font, line, opts.fontSize, baselineY);
      let dx = opts.x;
      if (opts.anchor === "middle") dx = opts.x - width / 2;
      else if (opts.anchor === "end") dx = opts.x - width;
      return `<path transform="translate(${dx.toFixed(2)} 0)" d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" paint-order="stroke" stroke-linejoin="round"/>`;
    })
    .join("\n");
}
