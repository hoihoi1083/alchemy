import { existsSync, readFileSync } from "fs";
import path from "path";

const FONT_DIR = path.join(process.cwd(), "public", "compositor", "fonts");

const FONT_FILES = {
  headline: "MaShanZheng-Regular.ttf",
  body: "NotoSansTC-Regular.ttf",
} as const;

export type CompositorFontRole = keyof typeof FONT_FILES;

export function compositorFontPath(role: CompositorFontRole): string {
  return path.join(FONT_DIR, FONT_FILES[role]);
}

export function ensureCompositorFonts(): void {
  const missing = Object.values(FONT_FILES).filter((file) => !existsSync(path.join(FONT_DIR, file)));
  if (missing.length > 0) {
    throw new Error(
      `Compositor fonts missing (${missing.join(", ")}). Run: npm run setup:compositor`,
    );
  }
}

let cachedFontFaceCss: string | null = null;

/** Embed TTFs as data URIs so librsvg/Pango does not depend on system fontconfig. */
export function compositorFontFaceCss(): string {
  if (cachedFontFaceCss) return cachedFontFaceCss;
  ensureCompositorFonts();
  const headlineUri = fontDataUri(compositorFontPath("headline"));
  const bodyUri = fontDataUri(compositorFontPath("body"));
  cachedFontFaceCss = `
      @font-face {
        font-family: 'MaShanHeadline';
        src: url('${headlineUri}') format('truetype');
      }
      @font-face {
        font-family: 'NotoBody';
        src: url('${bodyUri}') format('truetype');
      }`;
  return cachedFontFaceCss;
}

function fontDataUri(filePath: string): string {
  const base64 = readFileSync(filePath).toString("base64");
  return `data:font/ttf;base64,${base64}`;
}

/** Emoji/pictographs can crash Pango on macOS when no color emoji font is available. */
export function sanitizeCompositorText(text: string): string {
  return text.replace(/\p{Extended_Pictographic}/gu, "").trim();
}
