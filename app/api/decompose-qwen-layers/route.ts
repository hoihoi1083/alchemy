import { fal } from "@fal-ai/client";
import { NextResponse } from "next/server";
import sharp from "sharp";
import { chargeTokens, refundTokens } from "@/lib/billing/charge";
import { TOKEN_COST } from "@/lib/billing/token-costs";
import {
  alphaContentBBox,
  pickBackgroundLayerIndex,
} from "@/lib/edit-image-2-qwen-layers";
import { falVisionImageUrl } from "@/lib/pipeline/fal-vision-image-url";
import { requireAppUser } from "@/lib/require-app-user";
import { isLibraryAssetUrl } from "@/lib/storage/library-asset-url";

export const runtime = "nodejs";
export const maxDuration = 300;

const QWEN_LAYERED_ENDPOINT = "fal-ai/qwen-image-layered";

export type QwenDecomposedLayer = {
  id: string;
  kind: "text" | "object";
  label: string;
  text: string;
  xPct: number;
  yPct: number;
  wPct: number;
  hPct: number;
  cropUrl: string;
  cropDataUrl?: string;
  bbox: { left: number; top: number; width: number; height: number };
  lifted: boolean;
};

type CropRect = { left: number; top: number; width: number; height: number };

function asCrop(raw: unknown, imgW: number, imgH: number): CropRect | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const left = Math.floor(Number(r.left));
  const top = Math.floor(Number(r.top));
  const width = Math.ceil(Number(r.width));
  const height = Math.ceil(Number(r.height));
  if (![left, top, width, height].every((n) => Number.isFinite(n))) return null;
  if (width < 16 || height < 16) return null;
  const L = Math.max(0, Math.min(left, imgW - 1));
  const T = Math.max(0, Math.min(top, imgH - 1));
  const W = Math.max(1, Math.min(width, imgW - L));
  const H = Math.max(1, Math.min(height, imgH - T));
  if (W < 16 || H < 16) return null;
  if ((W * H) / (imgW * imgH) > 0.92) return null;
  return { left: L, top: T, width: W, height: H };
}

async function uploadPng(buf: Buffer, name: string): Promise<string> {
  return fal.storage.upload(new File([new Uint8Array(buf)], name, { type: "image/png" }));
}

async function uploadJpeg(buf: Buffer, name: string): Promise<string> {
  return fal.storage.upload(new File([new Uint8Array(buf)], name, { type: "image/jpeg" }));
}

/**
 * Canva-like Magic Layers via fal Qwen-Image-Layered.
 * Optional `crop` = recursive split on a highlighted leftover region.
 */
export async function POST(request: Request) {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;

  const key = process.env.FAL_KEY?.trim();
  if (!key) {
    return NextResponse.json({ error: "FAL_KEY is not configured." }, { status: 503 });
  }
  fal.config({ credentials: key });

  let body: { image_url?: string; num_layers?: number; crop?: unknown };
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

  const numLayers = Math.max(
    2,
    Math.min(10, Math.round(Number(body.num_layers) || (body.crop ? 4 : 6))),
  );
  const tokenCost = TOKEN_COST.smart_layers_qwen;
  const charged = await chargeTokens(auth.user.userId, tokenCost, {
    kind: "smart_layers_qwen",
    numLayers,
    endpoint: QWEN_LAYERED_ENDPOINT,
    region: Boolean(body.crop),
  });
  if ("error" in charged) return charged.error;

  try {
    const imageUrl = await falVisionImageUrl(request, rawImageUrl, {
      clerkId: auth.user.userId,
    });

    const srcRes = await fetch(imageUrl, { cache: "no-store" });
    if (!srcRes.ok) throw new Error(`Failed to download image (${srcRes.status}).`);
    const fullBuf = Buffer.from(await srcRes.arrayBuffer());
    const srcMeta = await sharp(fullBuf).metadata();
    const srcW = srcMeta.width ?? 0;
    const srcH = srcMeta.height ?? 0;
    if (!srcW || !srcH) throw new Error("Could not read image size.");

    const region = asCrop(body.crop, srcW, srcH);
    const workBuf = region
      ? Buffer.from(
          await sharp(fullBuf)
            .extract({
              left: region.left,
              top: region.top,
              width: region.width,
              height: region.height,
            })
            .png()
            .toBuffer(),
        )
      : fullBuf;
    const workW = region?.width ?? srcW;
    const workH = region?.height ?? srcH;
    const ox = region?.left ?? 0;
    const oy = region?.top ?? 0;

    const workUrl = await uploadPng(workBuf, region ? "qwen-region.png" : "qwen-full.png");

    const qwen = await fal.subscribe(QWEN_LAYERED_ENDPOINT, {
      input: {
        image_url: workUrl,
        num_layers: numLayers,
        num_inference_steps: 28,
        guidance_scale: 5,
        output_format: "png",
        acceleration: "regular",
        enable_safety_checker: true,
      },
      logs: false,
    });

    const outImages = (qwen.data as { images?: Array<{ url?: string }> })?.images ?? [];
    const urls = outImages.map((im) => im.url).filter((u): u is string => Boolean(u?.trim()));
    if (urls.length < 1) throw new Error("Layer split returned no layers.");

    type Prepared = {
      buf: Buffer;
      frameW: number;
      frameH: number;
      bbox: NonNullable<Awaited<ReturnType<typeof alphaContentBBox>>>;
    };
    const prepared: Prepared[] = [];
    for (const url of urls) {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) continue;
      let buf = Buffer.from(await res.arrayBuffer());
      const meta = await sharp(buf).metadata();
      let frameW = meta.width ?? 0;
      let frameH = meta.height ?? 0;
      if (!frameW || !frameH) continue;
      if (frameW !== workW || frameH !== workH) {
        buf = Buffer.from(
          await sharp(buf).resize(workW, workH, { fit: "fill" }).png().toBuffer(),
        );
        frameW = workW;
        frameH = workH;
      }
      const bbox = await alphaContentBBox(buf);
      if (!bbox) continue;
      prepared.push({ buf, frameW, frameH, bbox });
    }

    if (!prepared.length) throw new Error("Split layers had no opaque content.");

    const bgIdx = pickBackgroundLayerIndex(
      prepared.map((p) => ({
        coverage: p.bbox.coverage,
        width: p.bbox.width,
        height: p.bbox.height,
        frameW: p.frameW,
        frameH: p.frameH,
      })),
    );

    const bgPrepared = prepared[bgIdx]!;
    const bgFlat = await sharp(bgPrepared.buf)
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .jpeg({ quality: 92 })
      .toBuffer();

    let backgroundUrl: string;
    let originalBackgroundUrl: string;
    if (region) {
      // Patch only the highlighted region on the current plate.
      const patched = await sharp(fullBuf)
        .composite([
          {
            input: Buffer.from(bgFlat),
            left: region.left,
            top: region.top,
          },
        ])
        .jpeg({ quality: 92 })
        .toBuffer();
      backgroundUrl = await uploadJpeg(Buffer.from(patched), "qwen-region-bg.jpg");
      originalBackgroundUrl = await uploadJpeg(
        await sharp(fullBuf).jpeg({ quality: 92 }).toBuffer(),
        "qwen-plate-before-region.jpg",
      );
    } else {
      backgroundUrl = await uploadJpeg(Buffer.from(bgFlat), "qwen-background.jpg");
      originalBackgroundUrl = await uploadJpeg(
        await sharp(fullBuf).jpeg({ quality: 92 }).toBuffer(),
        "qwen-original.jpg",
      );
    }

    const layers: QwenDecomposedLayer[] = [];
    for (let i = 0; i < prepared.length; i++) {
      if (i === bgIdx) continue;
      const p = prepared[i]!;
      const { left, top, width, height } = p.bbox;
      if ((width * height) / (workW * workH) > 0.92 && p.bbox.coverage > 0.75) continue;

      const crop = await sharp(p.buf)
        .extract({ left, top, width, height })
        .png()
        .toBuffer();
      const cropUrl = await uploadPng(crop, `qwen-layer-${layers.length}.png`);
      const fullLeft = ox + left;
      const fullTop = oy + top;
      layers.push({
        id: crypto.randomUUID(),
        kind: "object",
        label: region ? `Region ${layers.length + 1}` : `Layer ${layers.length + 1}`,
        text: "",
        xPct: (fullLeft / srcW) * 100,
        yPct: (fullTop / srcH) * 100,
        wPct: (width / srcW) * 100,
        hPct: (height / srcH) * 100,
        cropUrl,
        bbox: { left: fullLeft, top: fullTop, width, height },
        lifted: true,
      });
    }

    layers.sort(
      (a, b) => b.bbox.width * b.bbox.height - a.bbox.width * a.bbox.height,
    );

    // Text is handled by sandwich (OCR lift first). Do not Florence-tag Qwen crops —
    // that produced gibberish labels on Chinese posters.
    return NextResponse.json({
      width: srcW,
      height: srcH,
      layerCount: layers.length,
      backgroundUrl,
      originalBackgroundUrl,
      backgroundDataUrl: backgroundUrl,
      layers,
      append: Boolean(region),
      tokensCharged: tokenCost,
      creditBalance: charged.balanceAfter,
      debug: {
        textDetected: 0,
        objectsDetected: layers.length,
        backgroundMode: region ? "qwen-region" : "qwen-layered",
        qwenLayerCount: prepared.length,
        numLayersRequested: numLayers,
        endpoint: QWEN_LAYERED_ENDPOINT,
        region: region ?? undefined,
      },
      warning:
        layers.length === 0
          ? "Split returned only a background plate. Try Erase or Box lift."
          : undefined,
    });
  } catch (e: unknown) {
    await refundTokens(auth.user.userId, tokenCost, {
      kind: "smart_layers_qwen",
      reason: "qwen_layered_failed",
    });
    const message = e instanceof Error ? e.message : "Layer split failed.";
    console.error("[decompose-qwen-layers]", e);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
