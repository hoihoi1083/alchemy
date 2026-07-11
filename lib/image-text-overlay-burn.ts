import sharp from "sharp";
import {
  compositorFontFaceCss,
  ensureCompositorFonts,
  sanitizeCompositorText,
} from "@/lib/compositor/fonts";
import { escapeXml } from "@/lib/compositor/paper-sticker/svg";
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
  const hasStroke = strokeColor && strokeColor !== "transparent" && strokeW > 0;
  const fontFamily = layer.fontFamily ?? style.fontFamily ?? "NotoBody";
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

  return lines
    .map((line, index) => {
      const y = Math.round(startY + index * lineHeight);
      const strokeAttr = hasStroke
        ? ` stroke="${strokeColor}" stroke-width="${strokeW}" paint-order="stroke"`
        : "";
      return `<text x="${textX}" y="${y}" text-anchor="${textAnchor}" dominant-baseline="middle" font-family="${fontFamily}" font-size="${fontSize}" font-weight="${style.fontWeight ?? 700}" fill="${fill}"${strokeAttr}>${escapeXml(line)}</text>`;
    })
    .join("");
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
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" /><text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle" font-family="NotoBody" font-size="${Math.round(r * 1.1)}" font-weight="700" fill="${stroke}">✓</text>`;
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
    <defs>${compositorFontFaceCss()}</defs>
    ${nodes.join("")}
  </svg>`;

  return sharp(Buffer.from(svg)).png().toBuffer();
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
