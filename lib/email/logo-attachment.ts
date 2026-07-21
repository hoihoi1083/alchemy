import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

export const EMAIL_LOGO_CONTENT_ID = "alchemy-logo";

let cached: { content: string; filename: string; contentId: string } | null = null;

/**
 * Inline email logo (CID). Avoids Gmail image-proxy 403s from Vercel bot protection
 * when hotlinking https://www.alchemyailab.com/alchemy-logo.png.
 */
export async function getEmailLogoAttachment(): Promise<{
  content: string;
  filename: string;
  contentId: string;
  contentType: string;
}> {
  if (cached) {
    return { ...cached, contentType: "image/png" };
  }

  const logoPath = path.join(process.cwd(), "public", "alchemy-logo.png");
  if (!existsSync(logoPath)) {
    throw new Error(`Missing logo at ${logoPath}`);
  }

  const raw = readFileSync(logoPath);
  // Keep email payload small — full site logo is ~450KB.
  const buf = await sharp(raw).resize(128, 128, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  cached = {
    content: buf.toString("base64"),
    filename: "alchemy-logo.png",
    contentId: EMAIL_LOGO_CONTENT_ID,
  };
  return { ...cached, contentType: "image/png" };
}
