import type { ImageEditRegion } from "@/lib/image-edit-region";

export function drawRegionsOnMaskCanvas(
  ctx: CanvasRenderingContext2D,
  regions: ImageEditRegion[],
  imageWidth: number,
  imageHeight: number,
): void {
  ctx.fillStyle = "white";
  for (const region of regions) {
    const x = (region.xPct / 100) * imageWidth;
    const y = (region.yPct / 100) * imageHeight;
    const w = (region.wPct / 100) * imageWidth;
    const h = (region.hPct / 100) * imageHeight;
    ctx.fillRect(x, y, w, h);
  }
}

export async function regionsToInpaintMaskBlob(
  regions: ImageEditRegion[],
  imageWidth: number,
  imageHeight: number,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = imageWidth;
  canvas.height = imageHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, imageWidth, imageHeight);
  drawRegionsOnMaskCanvas(ctx, regions, imageWidth, imageHeight);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Failed to export inpaint mask"));
    }, "image/png");
  });
}

export function regionsInpaintPrompt(regions: ImageEditRegion[]): string {
  return regions
    .map((r, i) => r.instruction.trim() && `Zone ${i + 1}: ${r.instruction.trim()}`)
    .filter(Boolean)
    .join(". ");
}
