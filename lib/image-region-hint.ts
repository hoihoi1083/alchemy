import type { ImageEditRegion } from "@/lib/image-edit-region";

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load image for region guide."));
    img.src = url;
  });
}

/** Draw numbered red boxes on a copy of the source image for regional AI edits. */
export async function buildRegionHintImageBlob(
  imageUrl: string,
  regions: ImageEditRegion[],
): Promise<Blob> {
  const img = await loadImage(imageUrl);
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not available.");

  ctx.drawImage(img, 0, 0);
  const lineWidth = Math.max(3, Math.round(canvas.width / 180));
  const fontSize = Math.max(18, Math.round(canvas.width / 28));

  regions.forEach((region, index) => {
    const x = (region.xPct / 100) * canvas.width;
    const y = (region.yPct / 100) * canvas.height;
    const w = (region.wPct / 100) * canvas.width;
    const h = (region.hPct / 100) * canvas.height;

    ctx.strokeStyle = "#ef4444";
    ctx.lineWidth = lineWidth;
    ctx.strokeRect(x, y, w, h);

    ctx.fillStyle = "rgba(239, 68, 68, 0.85)";
    ctx.fillRect(x, y, fontSize * 1.6, fontSize * 1.35);
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.fillText(String(index + 1), x + fontSize * 0.35, y + fontSize);
  });

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not export region guide."))),
      "image/png",
    );
  });
}
