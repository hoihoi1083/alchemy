import sharp from "sharp";
import { ensureCompositorFonts, sanitizeCompositorText } from "@/lib/compositor/fonts";
import { burnTextSvgPaths } from "@/lib/compositor/latin-text-paths";
import {
  resolveCaptionBurnStyle,
  resolveLineCaptionStyle,
} from "@/lib/caption-burn-styles";
import { fitImageInBox } from "@/lib/image-canvas-layout";
import { wrapTextToLines, textBoxHeightPx } from "@/lib/image-canvas-text-layout";
import type { ImageCanvasLayer, ImageShapeLayer } from "@/lib/image-canvas-layers";
import type { ImageTextLayer } from "@/lib/image-text-overlay-types";

async function renderLayerTextNodes(
  width: number,
  height: number,
  layer: ImageTextLayer,
): Promise<string> {
  const style = resolveLineCaptionStyle(layer.stylePreset, resolveCaptionBurnStyle("classic"));
  const fontSize = Math.max(
    20,
    Math.round(width * 0.052 * (style.fontSizeScale ?? 1) * (layer.fontSizeScale ?? 1)),
  );
  const lineHeight = Math.round(fontSize * 1.35);
  const fill = layer.fill ?? style.fill ?? "white";
  const strokeColor = layer.stroke ?? style.stroke ?? "black";
  const strokeW = Math.max(
    0,
    Math.round(fontSize * 0.12 * (style.strokeWidthScale ?? 1)),
  );
  const hasStroke = Boolean(strokeColor && strokeColor !== "transparent" && strokeW > 0);
  const preferred =
    style.fontFamily === "NotoDisplay" || layer.fontFamily === "NotoDisplay"
      ? ("headline" as const)
      : ("body" as const);
  const align = layer.align ?? "center";
  const boxW = Math.round(((layer.wPct ?? 70) / 100) * width);
  const anchorX = Math.round((layer.xPct / 100) * width);
  const anchorY = Math.round((layer.yPct / 100) * height);
  const boxLeft = align === "left" ? anchorX : align === "right" ? anchorX - boxW : anchorX - boxW / 2;
  const textX =
    align === "left" ? boxLeft : align === "right" ? boxLeft + boxW : boxLeft + boxW / 2;
  const textAnchor = align === "left" ? "start" : align === "right" ? "end" : "middle";

  const lines = wrapTextToLines(layer.text, boxW, fontSize)
    .map((line) => sanitizeCompositorText(line))
    .filter((line, index, all) => line.length > 0 || all.length === 1);
  if (!lines.length || (lines.length === 1 && !lines[0])) return "";

  const blockHeight = textBoxHeightPx(lines.length, fontSize);
  const startY = anchorY - blockHeight / 2 + lineHeight / 2;
  const lineYs = lines.map((_, index) => Math.round(startY + index * lineHeight));

  return burnTextSvgPaths({
    lines,
    lineYs,
    x: textX,
    anchor: textAnchor,
    fontSize,
    bold: (style.fontWeight ?? 700) >= 600,
    preferred,
    fill,
    stroke: hasStroke ? strokeColor : "transparent",
    strokeWidth: hasStroke ? strokeW : 0,
  });
}

function shapeBounds(width: number, height: number, layer: ImageShapeLayer) {
  const cx = Math.round((layer.xPct / 100) * width);
  const cy = Math.round((layer.yPct / 100) * height);
  const w = Math.max(4, Math.round((layer.wPct / 100) * width));
  const h = Math.max(4, Math.round((layer.hPct / 100) * height));
  return { cx, cy, w, h, x: cx - w / 2, y: cy - h / 2 };
}

function renderShapeNodes(width: number, height: number, layer: ImageShapeLayer): string {
  const { cx, cy, w, h, x, y } = shapeBounds(width, height, layer);
  const sw = layer.strokeWidth;
  const stroke = layer.strokeColor ?? layer.color;
  const fillHex = layer.color;
  const fillAlpha = Math.round(layer.fillOpacity * 255)
    .toString(16)
    .padStart(2, "0");
  const fill = layer.fillOpacity > 0 ? `${fillHex}${fillAlpha}` : "none";

  if (layer.shape === "check-badge") {
    const r = Math.max(w, h) / 2;
    // Vector check — no font dependency (Linux tofu-safe).
    const s = r * 0.55;
    const check = `M${cx - s * 0.55} ${cy} L${cx - s * 0.1} ${cy + s * 0.45} L${cx + s * 0.6} ${cy - s * 0.4}`;
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" /><path d="${check}" fill="none" stroke="${stroke}" stroke-width="${Math.max(2, Math.round(r * 0.18))}" stroke-linecap="round" stroke-linejoin="round"/>`;
  }

  if (layer.shape === "line" || layer.shape === "arrow") {
    const yLine = layer.hPct < 1.5 ? cy : Math.round(y + h / 2);
    const x1 = Math.round(x);
    const x2 = Math.round(x + w);
    const y1 = yLine;
    const y2 = layer.shape === "arrow" ? Math.round(y + h) : yLine;
    const arrow =
      layer.shape === "arrow"
        ? `<polygon points="${x2},${y2} ${x2 - 10},${y2 - 6} ${x2 - 10},${y2 + 6}" fill="${layer.color}" />`
        : "";
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${layer.color}" stroke-width="${sw}" stroke-linecap="round" />${arrow}`;
  }

  if (layer.shape === "circle") {
    const rx = w / 2;
    const ry = h / 2;
    return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" />`;
  }

  const rx =
    layer.shape === "capsule"
      ? h / 2
      : layer.cornerRadius ?? (layer.shape === "button" || layer.shape === "badge" ? 6 : 8);

  const buttonFill = layer.shape === "button" ? "#ffffff" : fill;
  const buttonStroke = layer.shape === "button" ? stroke : stroke;

  return `<rect x="${Math.round(x)}" y="${Math.round(y)}" width="${Math.round(w)}" height="${Math.round(h)}" rx="${rx}" fill="${buttonFill}" stroke="${buttonStroke}" stroke-width="${sw}" />`;
}

async function renderCanvasOverlayPng(
  width: number,
  height: number,
  layers: ImageCanvasLayer[],
): Promise<Buffer> {
  const nodes: string[] = [];
  for (const layer of layers) {
    if (layer.kind === "shape") {
      nodes.push(renderShapeNodes(width, height, layer));
    } else if (layer.kind === "text") {
      nodes.push(await renderLayerTextNodes(width, height, layer));
    }
  }

  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    ${nodes.join("")}
  </svg>`;

  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  const textLayers = layers.filter(
    (l): l is Extract<ImageCanvasLayer, { kind: "text" }> => l.kind === "text",
  );
  if (textLayers.length > 0) {
    await assertOverlayHasInk(
      png,
      textLayers.map((l) => l.text).join(""),
    );
  }
  return png;
}

/** Reject empty / tofu overlays so image burn never "succeeds" with boxes. */
async function assertOverlayHasInk(png: Buffer, text: string): Promise<void> {
  const sample = text.replace(/\s+/g, "");
  if (sample.length < 1) return;
  const { data } = await sharp(png)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let ink = 0;
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3] ?? 0;
    if (a < 40) continue;
    const r = data[i] ?? 0;
    const g = data[i + 1] ?? 0;
    const b = data[i + 2] ?? 0;
    if (r + g + b > 520 || (r < 40 && g < 40 && b < 40)) ink += 1;
  }
  const minInk = Math.max(60, sample.length * 6);
  if (ink < minInk) {
    throw new Error(
      `Image text overlay looks empty/tofu for "${sample.slice(0, 40)}" (inkPixels=${ink}, need≥${minInk}).`,
    );
  }
}

async function loadLogoBuffer(url: string): Promise<Buffer> {
  if (url.startsWith("data:")) {
    const base64 = url.split(",")[1];
    return Buffer.from(base64, "base64");
  }
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load brand logo.");
  return Buffer.from(await res.arrayBuffer());
}

export async function burnImageCanvasOverlay(
  inputImage: string | Buffer,
  layers: ImageCanvasLayer[],
): Promise<Buffer> {
  ensureCompositorFonts();
  const base = sharp(inputImage);
  const meta = await base.metadata();
  const width = meta.width ?? 1080;
  const height = meta.height ?? 1920;
  const overlay = await renderCanvasOverlayPng(width, height, layers);
  const composites: sharp.OverlayOptions[] = [{ input: overlay, top: 0, left: 0 }];

  for (const layer of layers) {
    if (layer.kind !== "logo" || !layer.url.trim()) continue;
    const boxW = Math.max(8, Math.round((layer.wPct / 100) * width));
    const boxH = Math.max(8, Math.round((layer.hPct / 100) * height));
    const cx = Math.round((layer.xPct / 100) * width);
    const cy = Math.round((layer.yPct / 100) * height);
    const logoBuf = await loadLogoBuffer(layer.url);
    const logoMeta = await sharp(logoBuf).metadata();
    const naturalW = logoMeta.width ?? boxW;
    const naturalH = logoMeta.height ?? boxH;
    const fit = fitImageInBox(naturalW, naturalH, boxW, boxH);
    const resized = await sharp(logoBuf)
      .resize(Math.round(fit.w), Math.round(fit.h), { fit: "inside" })
      .png()
      .toBuffer();
    const left = Math.round(cx - boxW / 2 + fit.offsetX);
    const top = Math.round(cy - boxH / 2 + fit.offsetY);
    composites.push({ input: resized, left: Math.max(0, left), top: Math.max(0, top) });
  }

  return base.composite(composites).png().toBuffer();
}

export async function burnImageTextOverlay(
  inputImage: string | Buffer,
  layers: ImageTextLayer[],
): Promise<Buffer> {
  return burnImageCanvasOverlay(
    inputImage,
    layers.map((layer) => ({ kind: "text" as const, ...layer })),
  );
}
