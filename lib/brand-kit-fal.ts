import { fal } from "@fal-ai/client";
import type { BrandKit } from "@/lib/brand-kit";

function dataUrlToBuffer(dataUrl: string): { buffer: Buffer; mime: string } {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error("Invalid logo data URL.");
  return {
    mime: match[1] || "image/png",
    buffer: Buffer.from(match[2], "base64"),
  };
}

/** Upload brand-kit logo to fal storage so edit models can composite it. */
export async function uploadBrandKitLogoToFal(kit: BrandKit | null | undefined): Promise<string | null> {
  const logo = kit?.logoUrl?.trim();
  if (!logo) return null;

  if (logo.startsWith("data:")) {
    const { buffer, mime } = dataUrlToBuffer(logo);
    const ext = mime.includes("jpeg") ? "jpg" : "png";
    const blob = new Blob([Uint8Array.from(buffer)], { type: mime });
    const file = new File([blob], `brand-logo.${ext}`, { type: mime });
    return fal.storage.upload(file);
  }

  if (logo.startsWith("http://") || logo.startsWith("https://")) {
    const res = await fetch(logo, { cache: "no-store" });
    if (!res.ok) throw new Error("Brand logo fetch failed.");
    const blob = await res.blob();
    const file = new File([blob], "brand-logo.png", { type: blob.type || "image/png" });
    return fal.storage.upload(file);
  }

  return null;
}
