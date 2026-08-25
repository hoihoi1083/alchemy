import { fal } from "@fal-ai/client";
import { NextResponse } from "next/server";
import sharp from "sharp";
import { chargeTokens, refundTokens } from "@/lib/billing/charge";
import { estimateInpaintTokens, TOKEN_COST } from "@/lib/billing/token-costs";
import { localRingFill } from "@/lib/edit-image-2-local-heal";
import { requireAppUser } from "@/lib/require-app-user";

export const runtime = "nodejs";
export const maxDuration = 180;

const ERASE_ENDPOINT = "fal-ai/flux-pro/v1/erase";

type BBox = { left: number; top: number; width: number; height: number };

function asBBox(raw: unknown): BBox | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const left = Number(r.left);
  const top = Number(r.top);
  const width = Number(r.width);
  const height = Number(r.height);
  if (![left, top, width, height].every((n) => Number.isFinite(n) && n >= 0)) return null;
  if (width < 1 || height < 1) return null;
  return {
    left: Math.floor(left),
    top: Math.floor(top),
    width: Math.ceil(width),
    height: Math.ceil(height),
  };
}

/**
 * Heal one hole on the background after a layer is lifted.
 * Default: local ring fill. Opt-in `mode: "erase"` for FLUX erase (billed higher).
 */
export async function POST(request: Request) {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;

  const key = process.env.FAL_KEY?.trim();
  if (!key) {
    return NextResponse.json({ error: "FAL_KEY is not configured." }, { status: 503 });
  }

  let body: {
    background_url?: string;
    hole?: unknown;
    mode?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const backgroundUrl = body.background_url?.trim();
  const hole = asBBox(body.hole);
  if (!backgroundUrl || !/^https?:\/\//i.test(backgroundUrl) || !hole) {
    return NextResponse.json(
      { error: "background_url (https) and hole {left,top,width,height} are required." },
      { status: 400 },
    );
  }

  const useErase = body.mode === "erase";

  // Peek size for erase billing; local heal uses flat fee.
  let imgBuf: Buffer;
  try {
    const res = await fetch(backgroundUrl, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to download background (${res.status}).`);
    imgBuf = Buffer.from(await res.arrayBuffer());
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to load background.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const meta = await sharp(imgBuf).metadata();
  const imgW = meta.width ?? 0;
  const imgH = meta.height ?? 0;
  if (!imgW || !imgH) {
    return NextResponse.json({ error: "Could not read background size." }, { status: 400 });
  }

  const clamped: BBox = {
    left: Math.max(0, Math.min(hole.left, imgW - 1)),
    top: Math.max(0, Math.min(hole.top, imgH - 1)),
    width: Math.max(1, Math.min(hole.width, imgW - Math.max(0, Math.min(hole.left, imgW - 1)))),
    height: Math.max(1, Math.min(hole.height, imgH - Math.max(0, Math.min(hole.top, imgH - 1)))),
  };

  const megapixels = (imgW * imgH) / 1_000_000;
  const tokenCost = useErase
    ? estimateInpaintTokens(megapixels)
    : TOKEN_COST.smart_layers_heal;

  const charged = await chargeTokens(auth.user.userId, tokenCost, {
    kind: "smart_layers_heal",
    mode: useErase ? "erase" : "local",
  });
  if ("error" in charged) return charged.error;

  fal.config({ credentials: key });

  try {
    let outJpeg: Buffer;
    let mode: "local" | "erase" = "local";

    if (useErase) {
      const pad = Math.max(4, Math.round(Math.min(clamped.width, clamped.height) * 0.08));
      const hl = Math.max(0, clamped.left - pad);
      const ht = Math.max(0, clamped.top - pad);
      const hw = Math.min(imgW - hl, clamped.width + pad * 2);
      const hh = Math.min(imgH - ht, clamped.height + pad * 2);
      const maskSvg = [
        `<svg xmlns="http://www.w3.org/2000/svg" width="${imgW}" height="${imgH}">`,
        `<rect width="100%" height="100%" fill="#000"/>`,
        `<rect x="${hl}" y="${ht}" width="${hw}" height="${hh}" fill="#fff"/>`,
        `</svg>`,
      ].join("");
      const maskPng = await sharp(Buffer.from(maskSvg)).png().toBuffer();
      const sourcePng = await sharp(imgBuf).png().toBuffer();
      const [falImageUrl, maskUrl] = await Promise.all([
        fal.storage.upload(
          new File([new Uint8Array(sourcePng)], "heal-src.png", { type: "image/png" }),
        ),
        fal.storage.upload(
          new File([new Uint8Array(maskPng)], "heal-mask.png", { type: "image/png" }),
        ),
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
      outJpeg = Buffer.from(
        await sharp(Buffer.from(await erasedRes.arrayBuffer())).jpeg({ quality: 92 }).toBuffer(),
      );
      mode = "erase";
    } else {
      outJpeg = Buffer.from(await localRingFill(imgBuf, clamped, imgW, imgH));
      mode = "local";
    }

    const backgroundUrlOut = await fal.storage.upload(
      new File([new Uint8Array(outJpeg)], "background-healed.jpg", { type: "image/jpeg" }),
    );

    return NextResponse.json({
      backgroundUrl: backgroundUrlOut,
      mode,
      tokensCharged: tokenCost,
      creditBalance: charged.balanceAfter,
    });
  } catch (e: unknown) {
    await refundTokens(auth.user.userId, tokenCost, {
      kind: "smart_layers_heal",
      reason: "heal_failed",
    });
    const message = e instanceof Error ? e.message : "Heal failed.";
    console.error("[layer-heal]", e);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
