import { fal } from "@fal-ai/client";
import { NextResponse } from "next/server";
import sharp from "sharp";
import { chargeTokens, refundTokens } from "@/lib/billing/charge";
import { estimateSmartLayersSeedreamTokens } from "@/lib/billing/token-costs";
import {
  byteplusApiKey,
  byteplusSeedreamModel,
  isSeedreamCopyrightError,
  seedreamLayerDecomposition,
  type ByteplusImageDataItem,
} from "@/lib/byteplus-ark";
import { falVisionImageUrl } from "@/lib/pipeline/fal-vision-image-url";
import { requireAppUser } from "@/lib/require-app-user";
import { isLibraryAssetUrl } from "@/lib/storage/library-asset-url";

export const runtime = "nodejs";
export const maxDuration = 300;

type LayerOut = {
  id: string;
  kind: "object";
  label: string;
  text: string;
  xPct: number;
  yPct: number;
  wPct: number;
  hPct: number;
  cropUrl: string;
  bbox: { left: number; top: number; width: number; height: number };
  lifted: boolean;
  z: number;
};

async function uploadPng(buf: Buffer, name: string): Promise<string> {
  return fal.storage.upload(new File([new Uint8Array(buf)], name, { type: "image/png" }));
}

async function uploadJpeg(buf: Buffer, name: string): Promise<string> {
  return fal.storage.upload(new File([new Uint8Array(buf)], name, { type: "image/jpeg" }));
}

function absBoxToRect(
  absolute: number[] | undefined,
  imgW: number,
  imgH: number,
): { left: number; top: number; width: number; height: number } | null {
  if (!absolute || absolute.length < 4) return null;
  const left = Math.max(0, Math.floor(Number(absolute[0])));
  const top = Math.max(0, Math.floor(Number(absolute[1])));
  const right = Math.min(imgW, Math.ceil(Number(absolute[2])));
  const bottom = Math.min(imgH, Math.ceil(Number(absolute[3])));
  const width = right - left;
  const height = bottom - top;
  if (width < 8 || height < 8) return null;
  return { left, top, width, height };
}

/** Prefer absolute box; fall back to normalized [0–1] LTRB. */
function layerBoxToRect(
  box: { absolute?: number[]; normalized?: number[] } | undefined,
  imgW: number,
  imgH: number,
): { left: number; top: number; width: number; height: number } | null {
  const fromAbs = absBoxToRect(box?.absolute, imgW, imgH);
  if (fromAbs) return fromAbs;
  const n = box?.normalized;
  if (!n || n.length < 4) return null;
  return absBoxToRect(
    [Number(n[0]) * imgW, Number(n[1]) * imgH, Number(n[2]) * imgW, Number(n[3]) * imgH],
    imgW,
    imgH,
  );
}

async function alphaTrimRect(
  buf: Buffer,
): Promise<{ left: number; top: number; width: number; height: number } | null> {
  const { data, info } = await sharp(buf)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let minX = info.width;
  let minY = info.height;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const a = data[(y * info.width + x) * info.channels + 3] ?? 0;
      if (a < 16) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX <= minX || maxY <= minY) return null;
  return {
    left: minX,
    top: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

/**
 * Normalize one Seedream layer PNG onto the board.
 * Placement size ALWAYS comes from bounding_box when present (board space).
 * Full-canvas PNGs are cropped with a scaled extract; tight crops keep pixels
 * and are displayed inside the bbox (Konva scales to fit).
 */
async function normalizeSeedreamLayer(opts: {
  buf: Buffer;
  lw: number;
  lh: number;
  boardW: number;
  boardH: number;
  boundingBox?: { absolute?: number[]; normalized?: number[] };
}): Promise<{
  buf: Buffer;
  rect: { left: number; top: number; width: number; height: number };
} | null> {
  const { lw, lh, boardW, boardH } = opts;
  let buf = opts.buf;
  const place = layerBoxToRect(opts.boundingBox, boardW, boardH);

  // Only treat as a full transparent sheet when PNG ≈ board size.
  // Do NOT use "larger than bbox" — that mis-classifies big tight crops and
  // blows up text when we then size from pixels.
  const isCanvasSheet =
    (lw >= Math.floor(boardW * 0.85) && lh >= Math.floor(boardH * 0.85)) ||
    (Math.abs(lw - boardW) / boardW <= 0.2 && Math.abs(lh - boardH) / boardH <= 0.2);

  if (place && isCanvasSheet) {
    const sx = lw / boardW;
    const sy = lh / boardH;
    const ex = Math.max(0, Math.floor(place.left * sx));
    const ey = Math.max(0, Math.floor(place.top * sy));
    const ew = Math.max(8, Math.min(lw - ex, Math.ceil(place.width * sx)));
    const eh = Math.max(8, Math.min(lh - ey, Math.ceil(place.height * sy)));
    if (ex + ew <= lw && ey + eh <= lh) {
      buf = Buffer.from(
        await sharp(buf).extract({ left: ex, top: ey, width: ew, height: eh }).png().toBuffer(),
      );
      return { buf, rect: place };
    }
  }

  if (place) {
    // Content crop — keep pixels; always place with Seedream's board-space bbox.
    return { buf, rect: place };
  }

  if (isCanvasSheet) {
    const trim = await alphaTrimRect(buf);
    if (!trim) return null;
    buf = Buffer.from(await sharp(buf).extract(trim).png().toBuffer());
    return { buf, rect: trim };
  }

  // No bbox + small PNG: park centered using pixel size.
  return {
    buf,
    rect: {
      left: Math.max(0, Math.round((boardW - lw) / 2)),
      top: Math.max(0, Math.round((boardH - lh) / 2)),
      width: Math.min(lw, boardW),
      height: Math.min(lh, boardH),
    },
  };
}

/**
 * Seedream 5.0 Pro Layerize via BytePlus ModelArk (layer_decomposition).
 * fal is only used to host input/output images (FAL_KEY).
 */
export async function POST(request: Request) {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;

  if (!byteplusApiKey()) {
    return NextResponse.json(
      {
        error:
          "BYTEPLUS_API_KEY (or ARK_API_KEY) is not configured. Add it to .env.local and restart the dev server.",
      },
      { status: 503 },
    );
  }

  const falKey = process.env.FAL_KEY?.trim();
  if (!falKey) {
    return NextResponse.json(
      { error: "FAL_KEY is not configured (needed to host layer PNGs)." },
      { status: 503 },
    );
  }
  fal.config({ credentials: falKey });

  let body: { image_url?: string; prompt?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const rawImageUrl = body.image_url?.trim();
  if (
    !rawImageUrl ||
    (!/^https?:\/\//i.test(rawImageUrl) && !isLibraryAssetUrl(rawImageUrl))
  ) {
    return NextResponse.json(
      { error: "image_url (https or library) is required." },
      { status: 400 },
    );
  }

  const modelId = byteplusSeedreamModel();
  const tokenCost = estimateSmartLayersSeedreamTokens();
  const charged = await chargeTokens(auth.user.userId, tokenCost, {
    kind: "smart_layers_seedream",
    endpoint: "byteplus/seedream/layer_decomposition",
    model: modelId,
    estimateLayers: 10,
  });
  if ("error" in charged) return charged.error;

  const abort = AbortSignal.timeout(280_000);

  try {
    const imageUrl = await falVisionImageUrl(request, rawImageUrl, {
      clerkId: auth.user.userId,
    });

    const srcRes = await fetch(imageUrl, { cache: "no-store", signal: abort });
    if (!srcRes.ok) throw new Error(`Failed to download image (${srcRes.status}).`);
    const fullBuf = Buffer.from(await srcRes.arrayBuffer());
    const srcMeta = await sharp(fullBuf).metadata();
    const srcW = srcMeta.width ?? 0;
    const srcH = srcMeta.height ?? 0;
    if (!srcW || !srcH) throw new Error("Could not read image size.");

    const ark = await seedreamLayerDecomposition({
      imageUrl,
      prompt: body.prompt,
      size: "1K",
      signal: abort,
    });

    const rawLayers: ByteplusImageDataItem[] = Array.isArray(ark.data) ? ark.data : [];
    if (rawLayers.length < 1) {
      throw new Error("BytePlus Seedream returned no layers.");
    }

    const sorted = [...rawLayers].sort(
      (a, b) => (Number(a.z_index) || 0) - (Number(b.z_index) || 0),
    );

    let boardW = srcW;
    let boardH = srcH;
    const base = sorted[0];
    const baseUrl = base?.url?.trim();
    let backgroundUrl: string;
    if (baseUrl) {
      const br = await fetch(baseUrl, { cache: "no-store", signal: abort });
      if (!br.ok) throw new Error("Failed to download Seedream base layer.");
      const baseBuf = Buffer.from(await br.arrayBuffer());
      const bm = await sharp(baseBuf).metadata();
      boardW = bm.width || srcW;
      boardH = bm.height || srcH;
      backgroundUrl = await uploadJpeg(
        await sharp(baseBuf)
          .flatten({ background: { r: 24, g: 24, b: 28 } })
          .jpeg({ quality: 92 })
          .toBuffer(),
        "seedream-background.jpg",
      );
    } else {
      backgroundUrl = await uploadJpeg(
        await sharp(fullBuf).jpeg({ quality: 92 }).toBuffer(),
        "seedream-fallback-bg.jpg",
      );
    }

    const originalBackgroundUrl = await uploadJpeg(
      await sharp(fullBuf).jpeg({ quality: 92 }).toBuffer(),
      "seedream-original.jpg",
    );

    const layers: LayerOut[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const layer = sorted[i]!;
      const url = layer.url?.trim();
      if (!url) continue;
      const lr = await fetch(url, { cache: "no-store", signal: abort });
      if (!lr.ok) continue;
      const rawBuf = Buffer.from(await lr.arrayBuffer());
      const meta = await sharp(rawBuf).metadata();
      const lw = meta.width ?? 0;
      const lh = meta.height ?? 0;
      if (!lw || !lh) continue;

      const normalized = await normalizeSeedreamLayer({
        buf: rawBuf,
        lw,
        lh,
        boardW,
        boardH,
        boundingBox: layer.bounding_box,
      });
      if (!normalized) continue;
      const { buf, rect } = normalized;

      const cropUrl = await uploadPng(buf, `seedream-layer-${layers.length}.png`);
      const label =
        (layer.name || "").trim() ||
        (layer.description || "").trim().slice(0, 40) ||
        `Layer ${layers.length + 1}`;
      layers.push({
        id: crypto.randomUUID(),
        kind: "object",
        label: label.slice(0, 80),
        text: "",
        xPct: (rect.left / boardW) * 100,
        yPct: (rect.top / boardH) * 100,
        wPct: (rect.width / boardW) * 100,
        hPct: (rect.height / boardH) * 100,
        cropUrl,
        bbox: rect,
        lifted: true,
        z: 100 + (Number(layer.z_index) || layers.length),
      });
    }

    layers.sort((a, b) => a.z - b.z);

    // Background-only results are not a useful Split — refund the Seedream charge.
    let tokensCharged = tokenCost;
    let creditBalance = charged.balanceAfter;
    let tokensRefunded: number | undefined;
    if (layers.length === 0) {
      const balanceAfter = await refundTokens(auth.user.userId, tokenCost, {
        kind: "smart_layers_seedream",
        reason: "seedream_no_liftable_layers",
        endpoint: "byteplus/seedream/layer_decomposition",
        model: modelId,
      });
      tokensCharged = 0;
      tokensRefunded = tokenCost;
      if (balanceAfter !== null) creditBalance = balanceAfter;
    }

    console.info("[decompose-seedream-layers] done", {
      provider: "byteplus",
      model: modelId,
      raw: sorted.length,
      objects: layers.length,
      boardW,
      boardH,
      tokens: tokensCharged,
      tokensRefunded,
    });

    return NextResponse.json({
      width: boardW,
      height: boardH,
      layerCount: layers.length,
      backgroundUrl,
      originalBackgroundUrl,
      backgroundDataUrl: backgroundUrl,
      layers,
      tokensCharged,
      tokensRefunded,
      creditBalance,
      debug: {
        mode: "seedream-layerize-byteplus",
        endpoint: "byteplus/images/generations",
        model: modelId,
        seedreamLayerCount: sorted.length,
        objectsDetected: layers.length,
        imageSize: "1K",
        byteplusEstimateUsd: 0.0225 * 10,
        tokenCost: tokensCharged,
      },
      warning:
        layers.length === 0
          ? "Seedream returned only a background. Tokens were refunded. Use Box lift or Clean plate on leftovers."
          : undefined,
    });
  } catch (e: unknown) {
    await refundTokens(auth.user.userId, tokenCost, {
      kind: "smart_layers_seedream",
      reason: isSeedreamCopyrightError(e)
        ? "seedream_copyright_blocked"
        : "seedream_layerize_failed",
    });
    console.error("[decompose-seedream-layers]", e);
    if (isSeedreamCopyrightError(e)) {
      return NextResponse.json(
        {
          error:
            "BytePlus Seedream blocked this image (copyright / brand / likeness filter). Tokens were refunded. User uploads and our AI posters can both trip it when logos, characters, or famous likenesses are visible. Use Box lift / Clean plate, or try another image.",
          errorCode: "copyright_restricted",
          tokensRefunded: tokenCost,
        },
        { status: 422 },
      );
    }
    const message = e instanceof Error ? e.message : "Seedream Layerize failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
