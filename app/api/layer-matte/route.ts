import { fal } from "@fal-ai/client";
import { NextResponse } from "next/server";
import sharp from "sharp";
import { chargeTokens, refundTokens } from "@/lib/billing/charge";
import { TOKEN_COST } from "@/lib/billing/token-costs";
import { requireAppUser } from "@/lib/require-app-user";

export const runtime = "nodejs";
export const maxDuration = 120;

type BBox = { left: number; top: number; width: number; height: number };

function asBBox(raw: unknown): BBox | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const left = Number(r.left);
  const top = Number(r.top);
  const width = Number(r.width);
  const height = Number(r.height);
  if (![left, top, width, height].every((n) => Number.isFinite(n) && n >= 0)) return null;
  if (width < 2 || height < 2) return null;
  return {
    left: Math.floor(left),
    top: Math.floor(top),
    width: Math.ceil(width),
    height: Math.ceil(height),
  };
}

/**
 * BiRefNet matte on a single layer crop (Architecture A — lazy lift).
 * Body: { image_url, bbox } or { crop_url }
 */
export async function POST(request: Request) {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;

  const key = process.env.FAL_KEY?.trim();
  if (!key) {
    return NextResponse.json({ error: "FAL_KEY is not configured." }, { status: 503 });
  }
  fal.config({ credentials: key });

  let body: { image_url?: string; crop_url?: string; bbox?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const tokenCost = TOKEN_COST.smart_layers_matte;
  const charged = await chargeTokens(auth.user.userId, tokenCost, {
    kind: "smart_layers_matte",
  });
  if ("error" in charged) return charged.error;

  try {
    let cropBuf: Buffer;
    let cropW = 0;
    let cropH = 0;

    const cropUrlIn = body.crop_url?.trim();
    const imageUrl = body.image_url?.trim();
    const bbox = asBBox(body.bbox);

    if (cropUrlIn && /^https?:\/\//i.test(cropUrlIn)) {
      const res = await fetch(cropUrlIn, { cache: "no-store" });
      if (!res.ok) throw new Error(`Failed to download crop (${res.status}).`);
      cropBuf = Buffer.from(await res.arrayBuffer());
    } else if (imageUrl && /^https?:\/\//i.test(imageUrl) && bbox) {
      const res = await fetch(imageUrl, { cache: "no-store" });
      if (!res.ok) throw new Error(`Failed to download image (${res.status}).`);
      const imgBuf = Buffer.from(await res.arrayBuffer());
      const meta = await sharp(imgBuf).metadata();
      const imgW = meta.width ?? 0;
      const imgH = meta.height ?? 0;
      if (!imgW || !imgH) throw new Error("Could not read image size.");
      const left = Math.max(0, Math.min(bbox.left, imgW - 1));
      const top = Math.max(0, Math.min(bbox.top, imgH - 1));
      const width = Math.max(1, Math.min(bbox.width, imgW - left));
      const height = Math.max(1, Math.min(bbox.height, imgH - top));
      cropBuf = await sharp(imgBuf).extract({ left, top, width, height }).png().toBuffer();
    } else {
      return NextResponse.json(
        { error: "Provide crop_url, or image_url + bbox." },
        { status: 400 },
      );
    }

    const meta = await sharp(cropBuf).metadata();
    cropW = meta.width ?? 0;
    cropH = meta.height ?? 0;
    if (!cropW || !cropH) throw new Error("Empty crop.");

    const cropPng = await sharp(cropBuf).png().toBuffer();
    const cropFalUrl = await fal.storage.upload(
      new File([new Uint8Array(cropPng)], "matte-crop.png", { type: "image/png" }),
    );

    const matte = await fal.subscribe("fal-ai/birefnet/v2", {
      input: {
        image_url: cropFalUrl,
        model: "Matting",
        refine_foreground: true,
        output_format: "png",
      },
      logs: false,
    });

    const outUrl =
      (matte.data as { image?: { url?: string } })?.image?.url ??
      (matte.data as { images?: Array<{ url?: string }> })?.images?.[0]?.url;

    if (!outUrl) throw new Error("BiRefNet returned no image.");

    const outRes = await fetch(outUrl, { cache: "no-store" });
    if (!outRes.ok) throw new Error(`Matte download failed (${outRes.status}).`);
    let matted: Buffer = Buffer.from(await outRes.arrayBuffer());

    // Ensure output matches crop size (BiRefNet may rescale)
    const outMeta = await sharp(matted).metadata();
    if ((outMeta.width ?? 0) !== cropW || (outMeta.height ?? 0) !== cropH) {
      matted = Buffer.from(
        await sharp(matted).resize(cropW, cropH, { fit: "fill" }).png().toBuffer(),
      );
    } else {
      matted = Buffer.from(await sharp(matted).png().toBuffer());
    }

    const mattedUrl = await fal.storage.upload(
      new File([new Uint8Array(matted)], "layer-matted.png", { type: "image/png" }),
    );

    return NextResponse.json({
      cropUrl: mattedUrl,
      width: cropW,
      height: cropH,
      tokensCharged: tokenCost,
      creditBalance: charged.balanceAfter,
    });
  } catch (e: unknown) {
    await refundTokens(auth.user.userId, tokenCost, {
      kind: "smart_layers_matte",
      reason: "matte_failed",
    });
    const message = e instanceof Error ? e.message : "Matte failed.";
    console.error("[layer-matte]", e);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
