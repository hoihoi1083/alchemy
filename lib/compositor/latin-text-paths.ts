import { readFileSync } from "fs";
import type { Font, PathCommand } from "opentype.js";
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

function isCjkChar(ch: string): boolean {
  return textNeedsCjkFonts(ch);
}

function glyphIsMissing(
  font: Font,
  ch: string,
): boolean {
  if (!ch.trim()) return false;
  const glyph = font.charToGlyph(ch);
  return glyph.index === 0 || glyph.name === ".notdef";
}

/** Latin first for ASCII; CJK/fullwidth punctuation falls back to NotoSansTC. */
function fontsForChar(ch: string, bold: boolean): Font[] {
  const latin = loadFont(bold ? "latinBold" : "latin");
  const body = loadFont("body");
  if (/\s/.test(ch)) return [latin];
  if (isCjkChar(ch)) return [body, latin];
  return [latin, body];
}

function fontAndGlyphOrThrow(ch: string, bold: boolean): { font: Font; glyph: ReturnType<Font["charToGlyph"]> } {
  const fonts = fontsForChar(ch, bold);
  for (const font of fonts) {
    if (glyphIsMissing(font, ch)) continue;
    return { font, glyph: font.charToGlyph(ch) };
  }
  throw new Error(
    `Missing glyph for "${ch}" in NotoSans / NotoSansTC — cannot burn text (would show tofu).`,
  );
}

function fmtPathNum(n: number, digits = 2): string {
  if (!Number.isFinite(n)) {
    throw new Error(`Non-finite path coordinate: ${n}`);
  }
  const v = Number(n.toFixed(digits));
  return Object.is(v, -0) ? "0" : String(v);
}

/**
 * Serialize glyph outlines as absolute SVG path data.
 * Do NOT use opentype `Path.toPathData(digits)` — it can emit `NaN` for some
 * glyphs (notably "5" at certain x offsets). Sharp/librsvg then stops parsing
 * the rest of a combined `d`, so captions appear truncated mid-string.
 */
export function pathCommandsToD(commands: PathCommand[], digits = 2): string {
  let d = "";
  for (const c of commands) {
    switch (c.type) {
      case "M":
        d += `M${fmtPathNum(c.x, digits)} ${fmtPathNum(c.y, digits)}`;
        break;
      case "L":
        d += `L${fmtPathNum(c.x, digits)} ${fmtPathNum(c.y, digits)}`;
        break;
      case "Q":
        d += `Q${fmtPathNum(c.x1, digits)} ${fmtPathNum(c.y1, digits)} ${fmtPathNum(c.x, digits)} ${fmtPathNum(c.y, digits)}`;
        break;
      case "C":
        d += `C${fmtPathNum(c.x1, digits)} ${fmtPathNum(c.y1, digits)} ${fmtPathNum(c.x2, digits)} ${fmtPathNum(c.y2, digits)} ${fmtPathNum(c.x, digits)} ${fmtPathNum(c.y, digits)}`;
        break;
      case "Z":
        d += "Z";
        break;
      default:
        break;
    }
  }
  return d;
}

/** Layout one line with per-character font (Latin vs CJK). */
function layoutLine(
  text: string,
  fontSize: number,
  baselineY: number,
  bold: boolean,
): { pathDs: string[]; width: number } {
  let x = 0;
  const pathDs: string[] = [];
  for (const ch of text) {
    const { font, glyph } = fontAndGlyphOrThrow(ch, bold);
    const scale = fontSize / font.unitsPerEm;
    const path = glyph.getPath(x, baselineY, fontSize);
    const d = pathCommandsToD(path.commands);
    if (d && d !== "M0 0Z" && !d.includes("NaN")) pathDs.push(d);
    x += (glyph.advanceWidth ?? 0) * scale;
  }
  return { pathDs, width: x };
}

export type BurnTextSvgPathOpts = {
  lines: string[];
  lineYs: number[];
  x: number;
  anchor: "start" | "middle" | "end";
  fontSize: number;
  bold?: boolean;
  /** Ignored for glyph burn — CJK always body; Latin always Noto Sans. */
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
  let fill = opts.fill ?? "white";
  // Transparent-fill display styles would only stroke .notdef boxes — treat as white.
  if (!fill || fill === "transparent" || fill === "none") fill = "white";
  const stroke = opts.stroke ?? "black";
  const strokeWidth =
    opts.strokeWidth ?? Math.max(2, Math.round(opts.fontSize * 0.12));
  const bold = Boolean(opts.bold);
  const baselineBias = textNeedsCjkFonts(sample) ? 0.32 : 0.35;
  const strokeAttr =
    strokeWidth > 0 && stroke && stroke !== "transparent"
      ? ` stroke="${stroke}" stroke-width="${strokeWidth}" paint-order="stroke" stroke-linejoin="round"`
      : "";

  return opts.lines
    .map((line, i) => {
      const y = opts.lineYs[i] ?? opts.lineYs[opts.lineYs.length - 1] ?? 0;
      const baselineY = y + opts.fontSize * baselineBias;
      const { pathDs, width } = layoutLine(line, opts.fontSize, baselineY, bold);
      if (!pathDs.length) return "";
      let dx = opts.x;
      if (opts.anchor === "middle") dx = opts.x - width / 2;
      else if (opts.anchor === "end") dx = opts.x - width;
      // One <path> per glyph so a single bad outline cannot truncate the line.
      return pathDs
        .map(
          (d) =>
            `<path transform="translate(${dx.toFixed(2)} 0)" d="${d}" fill="${fill}"${strokeAttr}/>`,
        )
        .join("\n");
    })
    .filter(Boolean)
    .join("\n");
}

/** @deprecated Prefer burnTextSvgPaths — kept for existing caption callers. */
export function latinCaptionSvgPaths(opts: BurnTextSvgPathOpts): string {
  return burnTextSvgPaths(opts);
}
