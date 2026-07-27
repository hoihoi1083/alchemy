import { existsSync, readFileSync } from "fs";
import path from "path";

const FONT_DIR = path.join(process.cwd(), "public", "compositor", "fonts");

/**
 * Roles used by compositor + caption burn.
 * - headline / display: brush display face
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

let cachedFontFaceCss: string | null = null;

/** Embed TTFs/OTFs as data URIs so librsvg/Pango does not depend on system fontconfig. */
export function compositorFontFaceCss(): string {
  if (cachedFontFaceCss) return cachedFontFaceCss;
  ensureCompositorFonts();
  const headlineUri = fontDataUri(compositorFontPath("headline"));
  const bodyUri = fontDataUri(compositorFontPath("body"));
  const latinUri = fontDataUri(compositorFontPath("latin"));
  const latinBoldUri = fontDataUri(compositorFontPath("latinBold"));
  // NotoDisplay is referenced by caption presets but was never embedded — alias it.
  cachedFontFaceCss = `
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
  return cachedFontFaceCss;
}

/**
 * Font stack for burned captions. Always include Latin so English never tofu
 * when CJK body/variable fonts fail on Linux.
 */
export function captionBurnFontFamily(
  preferred: "NotoBody" | "NotoDisplay" | undefined,
  bold = false,
): string {
  if (preferred === "NotoDisplay") {
    return bold
      ? "NotoDisplay, MaShanHeadline, NotoLatinBold, NotoBody, sans-serif"
      : "NotoDisplay, MaShanHeadline, NotoLatin, NotoBody, sans-serif";
  }
  return bold
    ? "NotoBody, NotoLatinBold, NotoLatin, sans-serif"
    : "NotoBody, NotoLatin, sans-serif";
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
