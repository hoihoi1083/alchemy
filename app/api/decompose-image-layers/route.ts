import { fal } from "@fal-ai/client";
import { NextResponse } from "next/server";
import sharp from "sharp";
import { requireAppUser } from "@/lib/require-app-user";

export const runtime = "nodejs";
export const maxDuration = 300;

const ERASE_ENDPOINT = "fal-ai/flux-pro/v1/erase";

export type DecomposedLayer = {
  id: string;
  kind: "text" | "object";
  label: string;
  /** OCR text when kind=text */
  text: string;
  /** Normalized 0–100 */
  xPct: number;
  yPct: number;
  wPct: number;
  hPct: number;
  /** Cropped RGBA PNG as data URL for canvas overlay */
  cropDataUrl: string;
};

type Box = {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  kind: "text" | "object";
};

function asNum(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() && Number.isFinite(Number(v))) return Number(v);
  return null;
}

function parseBoxes(raw: unknown, kind: "text" | "object"): Box[] {
  if (!raw || typeof raw !== "object") return [];
  const root = raw as Record<string, unknown>;
  const results = (root.results ?? root) as Record<string, unknown>;
  const list =
    (Array.isArray(results.quad_boxes) && results.quad_boxes) ||
    (Array.isArray(results.bboxes) && results.bboxes) ||
    (Array.isArray(root.quad_boxes) && root.quad_boxes) ||
    (Array.isArray(root.bboxes) && root.bboxes) ||
    [];

  const out: Box[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const x = asNum(row.x);
    const y = asNum(row.y);
    const w = asNum(row.w);
    const h = asNum(row.h);
    const label = typeof row.label === "string" ? row.label.trim() : "";
    if (x == null || y == null || w == null || h == null) continue;
    if (w < 4 || h < 4) continue;
    out.push({ x, y, w, h, label: label || (kind === "text" ? "Text" : "Object"), kind });
  }
  return out;
}

/** Florence sometimes returns normalized 0–1 or pixel coords. */
function toPixelBox(
  box: Box,
  imgW: number,
  imgH: number,
): { left: number; top: number; width: number; height: number } {
  let { x, y, w, h } = box;
  // Heuristic: if all coords look normalized
  if (x <= 1.5 && y <= 1.5 && w <= 1.5 && h <= 1.5) {
    x *= imgW;
    y *= imgH;
    w *= imgW;
    h *= imgH;
  }
  const left = Math.max(0, Math.floor(x));
  const top = Math.max(0, Math.floor(y));
  const width = Math.max(1, Math.min(imgW - left, Math.ceil(w)));
  const height = Math.max(1, Math.min(imgH - top, Math.ceil(h)));
  return { left, top, width, height };
}

function iou(
  a: { left: number; top: number; width: number; height: number },
  b: { left: number; top: number; width: number; height: number },
): number {
  const x1 = Math.max(a.left, b.left);
  const y1 = Math.max(a.top, b.top);
  const x2 = Math.min(a.left + a.width, b.left + b.width);
  const y2 = Math.min(a.top + a.height, b.top + b.height);
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const union = a.width * a.height + b.width * b.height - inter;
  return union > 0 ? inter / union : 0;
}

export async function POST(request: Request) {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;

  const key = process.env.FAL_KEY?.trim();
  if (!key) {
    return NextResponse.json({ error: "FAL_KEY is not configured." }, { status: 503 });
  }
  fal.config({ credentials: key });

  let body: { image_url?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const imageUrl = body.image_url?.trim();
  if (!imageUrl || !/^https?:\/\//i.test(imageUrl)) {
    return NextResponse.json({ error: "image_url (https) is required." }, { status: 400 });
  }

  try {
    const [ocrRes, objRes, imgRes] = await Promise.all([
      fal.subscribe("fal-ai/florence-2-large/ocr-with-region", {
        input: { image_url: imageUrl },
        logs: false,
      }),
      fal.subscribe("fal-ai/florence-2-large/object-detection", {
        input: { image_url: imageUrl },
        logs: false,
      }),
      fetch(imageUrl, { cache: "no-store" }),
    ]);

    if (!imgRes.ok) {
      return NextResponse.json({ error: `Failed to download image (${imgRes.status}).` }, { status: 502 });
    }
    const imgBuf = Buffer.from(await imgRes.arrayBuffer());
    const meta = await sharp(imgBuf).metadata();
    const imgW = meta.width ?? 0;
    const imgH = meta.height ?? 0;
    if (!imgW || !imgH) {
      return NextResponse.json({ error: "Could not read image size." }, { status: 502 });
    }

    const textBoxes = parseBoxes(ocrRes.data, "text");
    const objectBoxes = parseBoxes(objRes.data, "object").filter((b) => {
      // skip generic huge "whole image" detections
      const px = toPixelBox(b, imgW, imgH);
      return px.width * px.height < imgW * imgH * 0.85;
    });

    // Prefer text; drop objects that heavily overlap text regions
    const textPx = textBoxes.map((b) => ({ box: b, px: toPixelBox(b, imgW, imgH) }));
    const objectPx = objectBoxes
      .map((b) => ({ box: b, px: toPixelBox(b, imgW, imgH) }))
      .filter(({ px }) => !textPx.some((t) => iou(t.px, px) > 0.45));

    // Largest objects first — better product/hero cutouts
    const objectRanked = [...objectPx].sort(
      (a, b) => b.px.width * b.px.height - a.px.width * a.px.height,
    );
    const selected = [...textPx.slice(0, 24), ...objectRanked.slice(0, 10)];

    /** SAM2 cutout for top objects (transparent PNG) — Canva-like freeform layers. */
    async function samCutout(px: {
      left: number;
      top: number;
      width: number;
      height: number;
    }): Promise<Buffer | null> {
      try {
        const pad = 4;
        const x_min = Math.max(0, px.left - pad);
        const y_min = Math.max(0, px.top - pad);
        const x_max = Math.min(imgW, px.left + px.width + pad);
        const y_max = Math.min(imgH, px.top + px.height + pad);
        const sam = await fal.subscribe("fal-ai/sam2/image", {
          input: {
            image_url: imageUrl as string,
            box_prompts: [{ x_min, y_min, x_max, y_max }],
            apply_mask: true,
            output_format: "png",
          },
          logs: false,
        });
        const url = (sam.data as { image?: { url?: string } })?.image?.url;
        if (!url) return null;
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) return null;
        const full = Buffer.from(await res.arrayBuffer());
        // Crop masked full-frame back to bbox
        return sharp(full)
          .extract({
            left: px.left,
            top: px.top,
            width: px.width,
            height: px.height,
          })
          .png()
          .toBuffer();
      } catch (err) {
        console.warn("[decompose-image-layers] SAM2 cutout skipped:", err);
        return null;
      }
    }

    const layers: DecomposedLayer[] = [];
    let samRefined = 0;
    const holeRects: Array<{ left: number; top: number; width: number; height: number }> = [];

    // Refine at most 5 largest objects with SAM (latency budget)
    const samBudget = new Set(
      objectRanked.slice(0, 5).map((o) => `${o.px.left},${o.px.top},${o.px.width},${o.px.height}`),
    );

    for (const { box, px } of selected) {
      let crop: Buffer;
      const key = `${px.left},${px.top},${px.width},${px.height}`;
      if (box.kind === "object" && samBudget.has(key)) {
        const cut = await samCutout(px);
        if (cut) {
          crop = cut;
          samRefined += 1;
        } else {
          crop = await sharp(imgBuf)
            .extract({
              left: px.left,
              top: px.top,
              width: px.width,
              height: px.height,
            })
            .png()
            .toBuffer();
        }
      } else {
        crop = await sharp(imgBuf)
          .extract({
            left: px.left,
            top: px.top,
            width: px.width,
            height: px.height,
          })
          .png()
          .toBuffer();
      }

      // Slightly expand erase region so text edges don't ghost
      const pad = Math.max(4, Math.round(Math.min(px.width, px.height) * 0.06));
      holeRects.push({
        left: Math.max(0, px.left - pad),
        top: Math.max(0, px.top - pad),
        width: Math.min(imgW - Math.max(0, px.left - pad), px.width + pad * 2),
        height: Math.min(imgH - Math.max(0, px.top - pad), px.height + pad * 2),
      });

      layers.push({
        id: crypto.randomUUID(),
        kind: box.kind,
        label: box.label.slice(0, 80) || (box.kind === "text" ? "Text" : "Object"),
        text: box.kind === "text" ? box.label : "",
        xPct: (px.left / imgW) * 100,
        yPct: (px.top / imgH) * 100,
        wPct: (px.width / imgW) * 100,
        hPct: (px.height / imgH) * 100,
        cropDataUrl: `data:image/png;base64,${crop.toString("base64")}`,
      });
    }

    // Clean background: FLUX Erase all layer holes (not blur) so move/export has no smudge
    let backgroundDataUrl: string;
    let backgroundMode: "erase" | "blur-fallback" = "erase";
    try {
      const maskSvg = [
        `<svg xmlns="http://www.w3.org/2000/svg" width="${imgW}" height="${imgH}">`,
        `<rect width="100%" height="100%" fill="#000"/>`,
        ...holeRects.map(
          (r) =>
            `<rect x="${r.left}" y="${r.top}" width="${r.width}" height="${r.height}" fill="#fff"/>`,
        ),
        `</svg>`,
      ].join("");
      const maskPng = await sharp(Buffer.from(maskSvg)).png().toBuffer();
      const sourcePng = await sharp(imgBuf).png().toBuffer();

      const [falImageUrl, maskUrl] = await Promise.all([
        fal.storage.upload(new Blob([new Uint8Array(sourcePng)], { type: "image/png" })),
        fal.storage.upload(new Blob([new Uint8Array(maskPng)], { type: "image/png" })),
      ]);

      const erase = await fal.subscribe(ERASE_ENDPOINT, {
        input: {
          image_url: falImageUrl,
          mask_url: maskUrl,
          dilate_pixels: 10,
        },
        logs: false,
      });
      const erasedUrl = (erase.data as { images?: Array<{ url?: string }> })?.images?.[0]?.url;
      if (!erasedUrl) throw new Error("Erase returned no image");
      const erasedRes = await fetch(erasedUrl, { cache: "no-store" });
      if (!erasedRes.ok) throw new Error(`Erase download ${erasedRes.status}`);
      const erasedBuf = Buffer.from(await erasedRes.arrayBuffer());
      const backgroundBuf = await sharp(erasedBuf).jpeg({ quality: 92 }).toBuffer();
      backgroundDataUrl = `data:image/jpeg;base64,${backgroundBuf.toString("base64")}`;
    } catch (eraseErr) {
      console.warn("[decompose-image-layers] FLUX erase failed, blur fallback:", eraseErr);
      backgroundMode = "blur-fallback";
      const holeComposites: sharp.OverlayOptions[] = [];
      for (const r of holeRects) {
        const patch = await sharp(imgBuf)
          .extract({ left: r.left, top: r.top, width: r.width, height: r.height })
          .blur(28)
          .modulate({ brightness: 1.02 })
          .png()
          .toBuffer();
        holeComposites.push({ input: patch, left: r.left, top: r.top });
      }
      const backgroundBuf = await sharp(imgBuf)
        .composite(holeComposites)
        .jpeg({ quality: 90 })
        .toBuffer();
      backgroundDataUrl = `data:image/jpeg;base64,${backgroundBuf.toString("base64")}`;
    }

    return NextResponse.json({
      width: imgW,
      height: imgH,
      layerCount: layers.length,
      backgroundDataUrl,
      layers,
      debug: {
        textDetected: textBoxes.length,
        objectsDetected: objectBoxes.length,
        samRefined,
        backgroundMode,
      },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Decompose failed.";
    console.error("[decompose-image-layers]", e);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
