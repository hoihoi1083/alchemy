import { readFileSync } from "fs";
import type { Font } from "opentype.js";
import * as opentypeNs from "opentype.js";
import {
  compositorFontPath,
  ensureCompositorFonts,
  textNeedsCjkFonts,
  type CompositorFontRole,
} from "@/lib/compositor/fonts";

/**
 * Vercel/webpack: default import of opentype.js breaks
 * ("does not contain a default export"). Resolve parse from namespace/CJS.
 */
const opentype = (
  (opentypeNs as { default?: typeof opentypeNs }).default ?? opentypeNs
) as typeof import("opentype.js");

const fontCache = new Map<CompositorFontRole, Font>();

function loadFont(role: CompositorFontRole): Font {
  const cached = fontCache.get(role);
  if (cached) return cached;
  ensureCompositorFonts();
  const file = compositorFontPath(role);
  const buf = readFileSync(file);
  const font = opentype.parse(
    buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
  );
  if (!font?.glyphs?.length) {
    throw new Error(`Failed to parse compositor font: ${file}`);
  }
  fontCache.set(role, font);
  return font;
}

function pickFontRole(text: string, bold: boolean, preferred?: "body" | "headline"): CompositorFontRole {
  if (textNeedsCjkFonts(text)) {
    return preferred === "headline" ? "headline" : "body";
  }
  return bold ? "latinBold" : "latin";
}

/** Advance + path without OpenType feature lookups (Noto breaks opentype.js ccmp). */
function layoutLine(
  font: Font,
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

export type BurnTextSvgPathOpts = {
  lines: string[];
  lineYs: number[];
  x: number;
  anchor: "start" | "middle" | "end";
  fontSize: number;
  bold?: boolean;
  /** Prefer calligraphy for CJK display lines. */
  preferred?: "body" | "headline";
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
};

/**
 * Render text as SVG path outlines (no @font-face / Pango / fontconfig).
 * Works for English + Chinese on Vercel Linux where Sharp SVG fonts tofu.
 */
export function burnTextSvgPaths(opts: BurnTextSvgPathOpts): string {
  const sample = opts.lines.join("\n");
  const font = loadFont(pickFontRole(sample, Boolean(opts.bold), opts.preferred));
  const fill = opts.fill ?? "white";
  const stroke = opts.stroke ?? "black";
  const strokeWidth =
    opts.strokeWidth ?? Math.max(2, Math.round(opts.fontSize * 0.12));
  // CJK glyphs are denser; alphabetic baseline offset differs slightly.
  const baselineBias = textNeedsCjkFonts(sample) ? 0.32 : 0.35;

  return opts.lines
    .map((line, i) => {
      const y = opts.lineYs[i] ?? opts.lineYs[opts.lineYs.length - 1] ?? 0;
      const baselineY = y + opts.fontSize * baselineBias;
      const { d, width } = layoutLine(font, line, opts.fontSize, baselineY);
      if (!d.trim()) return "";
      let dx = opts.x;
      if (opts.anchor === "middle") dx = opts.x - width / 2;
      else if (opts.anchor === "end") dx = opts.x - width;
      const strokeAttr =
        strokeWidth > 0 && stroke && stroke !== "transparent"
          ? ` stroke="${stroke}" stroke-width="${strokeWidth}" paint-order="stroke" stroke-linejoin="round"`
          : "";
      return `<path transform="translate(${dx.toFixed(2)} 0)" d="${d}" fill="${fill}"${strokeAttr}/>`;
    })
    .filter(Boolean)
    .join("\n");
}

/** @deprecated Prefer burnTextSvgPaths — kept for existing caption callers. */
export function latinCaptionSvgPaths(opts: BurnTextSvgPathOpts): string {
  return burnTextSvgPaths(opts);
}
