import type { ImageEditRegion } from "@/lib/image-edit-region";

/**
 * Draw white erase/fill regions. Inset boxes slightly so the exported mask matches
 * what users see inside the highlight (stroke sits on the outer edge of the box).
 */
export function drawRegionsOnMaskCanvas(
  ctx: CanvasRenderingContext2D,
  regions: ImageEditRegion[],
  imageWidth: number,
  imageHeight: number,
  opts?: { insetPx?: number },
): void {
  const inset = Math.max(0, opts?.insetPx ?? 1);
  ctx.fillStyle = "white";
  for (const region of regions) {
    let x = (region.xPct / 100) * imageWidth;
    let y = (region.yPct / 100) * imageHeight;
    let w = (region.wPct / 100) * imageWidth;
    let h = (region.hPct / 100) * imageHeight;
    if (inset > 0 && w > inset * 2 && h > inset * 2) {
      x += inset;
      y += inset;
      w -= inset * 2;
      h -= inset * 2;
    }
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
