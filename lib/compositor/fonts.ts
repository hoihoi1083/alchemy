import { existsSync, readFileSync } from "fs";
import path from "path";

const FONT_DIR = path.join(process.cwd(), "public", "compositor", "fonts");

/**
 * Roles used by compositor + caption burn.
 * - headline / display: brush display face (CJK calligraphy)
 * - body: CJK body (TC)
 * - latin / latinBold: static Noto Sans for English (Linux Sharp-safe)
 */
const FONT_CANDIDATES: Record<string, string[]> = {
  headline: ["MaShanZheng-Regular.ttf"],
  body: ["NotoSansTC-Regular.otf", "NotoSansTC-Regular.ttf"],
  latin: ["NotoSans-Regular.ttf"],
  latinBold: ["NotoSans-Bold.ttf", "NotoSans-Regular.ttf"],
};

export type CompositorFontRole = "headline" | "body" | "latin" | "latinBold";

function resolveFontFile(role: CompositorFontRole): string {
  const candidates = FONT_CANDIDATES[role] ?? [];
  for (const file of candidates) {
    const full = path.join(FONT_DIR, file);
    if (existsSync(full)) return full;
  }
  throw new Error(
    `Compositor font missing for ${role} (tried ${candidates.join(", ")}). Run: npm run setup:compositor`,
  );
}

export function compositorFontPath(role: CompositorFontRole): string {
  return resolveFontFile(role);
}

export function ensureCompositorFonts(): void {
  const roles: CompositorFontRole[] = ["headline", "body", "latin", "latinBold"];
  const missing: string[] = [];
  for (const role of roles) {
    try {
      resolveFontFile(role);
    } catch {
      missing.push(role);
    }
  }
  if (missing.length > 0) {
    throw new Error(
      `Compositor fonts missing (${missing.join(", ")}). Run: npm run setup:compositor`,
    );
  }
}

/**
 * True when text needs CJK / fullwidth glyphs (not coverable by Noto Sans Latin).
 * Includes CJK punctuation, kana/han, compatibility ideographs, and
 * fullwidth ASCII like `：` `！` `（` which Latin Noto Sans maps to .notdef.
 */
export function textNeedsCjkFonts(text: string): boolean {
  return /[\u3000-\u303f\u3040-\u30ff\u3400-\u9fff\uf900-\ufaff\ufe10-\ufe1f\ufe30-\ufe4f\uff00-\uffef]/u.test(
    text,
  );
}

let cachedAllFontFaceCss: string | null = null;
let cachedLatinFontFaceCss: string | null = null;

function latinFontFaceCss(): string {
  if (cachedLatinFontFaceCss) return cachedLatinFontFaceCss;
  ensureCompositorFonts();
  const latinUri = fontDataUri(compositorFontPath("latin"));
  const latinBoldUri = fontDataUri(compositorFontPath("latinBold"));
  // English-only: embed ONLY static Latin (≈1MB). Do not alias CJK names to
  // duplicated base64 blobs — captionBurnFontFamily already prefers NotoLatin*.
  cachedLatinFontFaceCss = `
      @font-face {
        font-family: 'NotoLatin';
        src: url('${latinUri}') format('truetype');
        font-weight: 400;
      }
      @font-face {
        font-family: 'NotoLatinBold';
        src: url('${latinBoldUri}') format('truetype');
        font-weight: 700;
      }`;
  return cachedLatinFontFaceCss;
}

function allFontFaceCss(): string {
  if (cachedAllFontFaceCss) return cachedAllFontFaceCss;
  ensureCompositorFonts();
  const headlineUri = fontDataUri(compositorFontPath("headline"));
  const bodyUri = fontDataUri(compositorFontPath("body"));
  const latinUri = fontDataUri(compositorFontPath("latin"));
  const latinBoldUri = fontDataUri(compositorFontPath("latinBold"));
  cachedAllFontFaceCss = `
      @font-face {
        font-family: 'MaShanHeadline';
        src: url('${headlineUri}') format('truetype');
      }
      @font-face {
        font-family: 'NotoDisplay';
        src: url('${headlineUri}') format('truetype');
      }
      @font-face {
        font-family: 'NotoBody';
        src: url('${bodyUri}');
      }
      @font-face {
        font-family: 'NotoLatin';
        src: url('${latinUri}') format('truetype');
        font-weight: 400;
      }
      @font-face {
        font-family: 'NotoLatinBold';
        src: url('${latinBoldUri}') format('truetype');
        font-weight: 700;
      }`;
  return cachedAllFontFaceCss;
}

/**
 * Embed TTFs/OTFs as data URIs so librsvg/Pango does not depend on system fontconfig.
 * Pass caption text when possible — English-only burns skip the ~12MB CJK embed
 * (which often fails / tofu on Vercel Linux).
 */
export function compositorFontFaceCss(textForScriptDetect?: string): string {
  if (textForScriptDetect != null && !textNeedsCjkFonts(textForScriptDetect)) {
    return latinFontFaceCss();
  }
  return allFontFaceCss();
}

/**
 * Font stack for burned captions.
 * Latin first so English never hits CJK .notdef tofu on Linux when the CJK face
 * "covers" Latin codepoints but draws empty boxes.
 */
export function captionBurnFontFamily(
  preferred: "NotoBody" | "NotoDisplay" | undefined,
  bold = false,
  opts?: { text?: string },
): string {
  const needsCjk = opts?.text ? textNeedsCjkFonts(opts.text) : true;
  const latin = bold ? "NotoLatinBold, NotoLatin" : "NotoLatin, NotoLatinBold";

  if (!needsCjk) {
    // English-only: only NotoLatin* are embedded in CSS.
    return bold
      ? "NotoLatinBold, NotoLatin, sans-serif"
      : "NotoLatin, NotoLatinBold, sans-serif";
  }

  if (preferred === "NotoDisplay") {
    return `${latin}, NotoDisplay, MaShanHeadline, NotoBody, sans-serif`;
  }
  return `${latin}, NotoBody, sans-serif`;
}

function fontDataUri(filePath: string): string {
  const base64 = readFileSync(filePath).toString("base64");
  const ext = path.extname(filePath).toLowerCase();
  const mime = ext === ".otf" ? "font/otf" : "font/ttf";
  return `data:${mime};base64,${base64}`;
}

/** Emoji/pictographs can crash Pango on macOS when no color emoji font is available. */
export function sanitizeCompositorText(text: string): string {
  return text.replace(/\p{Extended_Pictographic}/gu, "").trim();
}
