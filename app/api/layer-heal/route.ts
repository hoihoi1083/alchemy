import { fal } from "@fal-ai/client";
import { NextResponse } from "next/server";
import sharp from "sharp";
import { chargeTokens, refundTokens } from "@/lib/billing/charge";
import { estimateInpaintTokens, TOKEN_COST } from "@/lib/billing/token-costs";
import { isFailedFluxEraseOutput } from "@/lib/edit-image-2-erase-quality";
import { holeContentBarelyChanged } from "@/lib/edit-image-2-heal-quality";
import {
  ERASE_COVERAGE_LIMIT,
  FILL_COVERAGE_LIMIT,
  holeUnionCoverage,
} from "@/lib/edit-image-2-hole-coverage";
import { localRingFill, plateLooksFlatBright } from "@/lib/edit-image-2-local-heal";
import { falVisionImageUrl } from "@/lib/pipeline/fal-vision-image-url";
import { requireAppUser } from "@/lib/require-app-user";
import { isLibraryAssetUrl } from "@/lib/storage/library-asset-url";

export const runtime = "nodejs";
export const maxDuration = 180;

const ERASE_ENDPOINT = "fal-ai/flux-pro/v1/erase";
const FILL_ENDPOINT = "fal-ai/flux-pro/v1/fill";

const FILL_PROMPT =
  "Seamlessly continue the surrounding background only. Match exact color, texture, lighting, and grain. No text, no logos, no objects, no people, no watermarks.";

type BBox = { left: number; top: number; width: number; height: number };
type HealMode = "auto" | "erase" | "fill" | "local";

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

function parseMode(raw: unknown): HealMode {
  const m = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (m === "erase" || m === "fill" || m === "local" || m === "auto") return m;
  // Default: generative auto (erase → fill → local) so move clears the component.
  return "auto";
}

async function publishHealedJpeg(outJpeg: Buffer, falKey: string | undefined): Promise<string> {
  if (falKey) {
    try {
      fal.config({ credentials: falKey });
      return await fal.storage.upload(
        new File([new Uint8Array(outJpeg)], "background-healed.jpg", { type: "image/jpeg" }),
      );
    } catch (err) {
      console.warn("[layer-heal] fal upload failed, returning data URL:", err);
    }
  }
  return `data:image/jpeg;base64,${outJpeg.toString("base64")}`;
}

async function toHealJpeg(buf: Buffer): Promise<Buffer> {
  return Buffer.from(
    await sharp(buf)
      .ensureAlpha()
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .jpeg({ quality: 92 })
      .toBuffer(),
  );
}

async function uploadMaskPair(
  imgBuf: Buffer,
  imgW: number,
  imgH: number,
  hole: BBox,
): Promise<{ falImageUrl: string; maskUrl: string; padded: BBox }> {
  const pad = Math.max(4, Math.round(Math.min(hole.width, hole.height) * 0.1));
  const padded: BBox = {
    left: Math.max(0, hole.left - pad),
    top: Math.max(0, hole.top - pad),
    width: Math.min(imgW - Math.max(0, hole.left - pad), hole.width + pad * 2),
    height: Math.min(imgH - Math.max(0, hole.top - pad), hole.height + pad * 2),
  };
  const maskSvg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${imgW}" height="${imgH}">`,
    `<rect width="100%" height="100%" fill="#000"/>`,
    `<rect x="${padded.left}" y="${padded.top}" width="${padded.width}" height="${padded.height}" fill="#fff"/>`,
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
  return { falImageUrl, maskUrl, padded };
}

async function runErase(
  imgBuf: Buffer,
  imgW: number,
  imgH: number,
  hole: BBox,
): Promise<Buffer> {
  const { falImageUrl, maskUrl } = await uploadMaskPair(imgBuf, imgW, imgH, hole);
  const erase = await fal.subscribe(ERASE_ENDPOINT, {
    input: {
      image_url: falImageUrl,
      mask_url: maskUrl,
      dilate_pixels: 12,
    },
    logs: false,
  });
  const erasedUrl = (erase.data as { images?: Array<{ url?: string }> })?.images?.[0]?.url;
  if (!erasedUrl) throw new Error("Erase returned no image");
  const erasedRes = await fetch(erasedUrl, { cache: "no-store" });
  if (!erasedRes.ok) throw new Error(`Erase download ${erasedRes.status}`);
  const erasedBuf = Buffer.from(await erasedRes.arrayBuffer());
  if (await isFailedFluxEraseOutput(erasedBuf)) {
    throw new Error("Erase returned chroma-green failure plate");
  }
  if (await holeContentBarelyChanged(imgBuf, erasedBuf, hole, imgW, imgH)) {
    throw new Error("Erase left hole contents unchanged");
  }
  return toHealJpeg(erasedBuf);
}

async function runFill(
  imgBuf: Buffer,
  imgW: number,
  imgH: number,
  hole: BBox,
): Promise<Buffer> {
  const { falImageUrl, maskUrl } = await uploadMaskPair(imgBuf, imgW, imgH, hole);
  const fill = await fal.subscribe(FILL_ENDPOINT, {
    input: {
      image_url: falImageUrl,
      mask_url: maskUrl,
      prompt: FILL_PROMPT,
      enhance_prompt: true,
    },
    logs: false,
  });
  const fillUrl = (fill.data as { images?: Array<{ url?: string }> })?.images?.[0]?.url;
  if (!fillUrl) throw new Error("Fill returned no image");
  const fillRes = await fetch(fillUrl, { cache: "no-store" });
  if (!fillRes.ok) throw new Error(`Fill download ${fillRes.status}`);
  const fillBuf = Buffer.from(await fillRes.arrayBuffer());
  if (await isFailedFluxEraseOutput(fillBuf)) {
    throw new Error("Fill returned chroma-green failure plate");
  }
  if (await holeContentBarelyChanged(imgBuf, fillBuf, hole, imgW, imgH)) {
    throw new Error("Fill left hole contents unchanged");
  }
  return toHealJpeg(fillBuf);
}

/**
 * Heal one hole after a layer is lifted.
 * mode: auto (default) = erase → fill → local; erase | fill | local.
 */
export async function POST(request: Request) {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;

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

  const rawBg = body.background_url?.trim();
  const hole = asBBox(body.hole);
  if (
    !rawBg ||
    (!/^https?:\/\//i.test(rawBg) && !isLibraryAssetUrl(rawBg)) ||
    !hole
  ) {
    return NextResponse.json(
      {
        error:
          "background_url (https or library) and hole {left,top,width,height} are required.",
      },
      { status: 400 },
    );
  }

  const requested = parseMode(body.mode);
  const key = process.env.FAL_KEY?.trim();
  if ((requested === "auto" || requested === "erase" || requested === "fill") && !key) {
    // No fal → local only (still useful).
  }
  if (key) fal.config({ credentials: key });

  let imgBuf: Buffer;
  try {
    const backgroundUrl = await falVisionImageUrl(request, rawBg, {
      clerkId: auth.user.userId,
    });
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

  const coverage = holeUnionCoverage([clamped], imgW, imgH);
  // Fill tolerates larger holes than erase. Never force local solely because the
  // hole is big on a photo plate — that paints solid black on stadium ads.
  const coverageOkForFill = coverage <= FILL_COVERAGE_LIMIT;
  const coverageOkForErase = coverage <= ERASE_COVERAGE_LIMIT;
  const wantGenerative =
    Boolean(key) &&
    (requested === "auto" || requested === "erase" || requested === "fill") &&
    (requested === "erase" ? coverageOkForErase : coverageOkForFill);

  const megapixels = (imgW * imgH) / 1_000_000;
  const tokenCost = wantGenerative
    ? estimateInpaintTokens(megapixels)
    : TOKEN_COST.smart_layers_heal;

  const charged = await chargeTokens(auth.user.userId, tokenCost, {
    kind: "smart_layers_heal",
    mode: wantGenerative ? requested : "local",
    coverage,
  });
  if ("error" in charged) return charged.error;

  try {
    let outJpeg: Buffer | null = null;
    let mode: "local" | "erase" | "fill" = "local";
    let generativeFallback = false;

    if (wantGenerative && key) {
      // Auto: Erase only. Fill invents walls/plants (fal flux-pro/v1/fill history).
      // Explicit mode=fill still allowed for callers that want it.
      const tryErase = requested === "auto" || requested === "erase";
      const tryFill = requested === "fill";

      if (tryErase) {
        try {
          outJpeg = await runErase(imgBuf, imgW, imgH, clamped);
          mode = "erase";
        } catch (eraseErr) {
          console.warn(
            "[layer-heal] erase failed:",
            eraseErr instanceof Error ? eraseErr.message : eraseErr,
          );
        }
      }

      if (!outJpeg && tryFill) {
        try {
          outJpeg = await runFill(imgBuf, imgW, imgH, clamped);
          mode = "fill";
        } catch (fillErr) {
          console.warn(
            "[layer-heal] fill failed:",
            fillErr instanceof Error ? fillErr.message : fillErr,
          );
        }
      }

      if (!outJpeg) {
        generativeFallback = true;
        await refundTokens(auth.user.userId, tokenCost, {
          kind: "smart_layers_heal",
          reason: "generative_failed_fallback_local",
        });
        const flat = await plateLooksFlatBright(imgBuf);
        if (!flat) {
          // Do not paint solid black/grey on stadium photos — keep plate, client
          // already cleared the layer ghost via optimistic punch.
          throw new Error("Generative heal failed on photo plate (skip local black fill)");
        }
        const localCost = TOKEN_COST.smart_layers_heal;
        const localCharged = await chargeTokens(auth.user.userId, localCost, {
          kind: "smart_layers_heal",
          mode: "local",
          coverage,
        });
        if ("error" in localCharged) {
          return localCharged.error;
        }
        outJpeg = Buffer.from(await localRingFill(imgBuf, clamped, imgW, imgH));
        const backgroundUrlOut = await publishHealedJpeg(outJpeg, key);
        return NextResponse.json({
          backgroundUrl: backgroundUrlOut,
          mode: "local" as const,
          tokensCharged: localCost,
          creditBalance: localCharged.balanceAfter,
          eraseFallback: true,
          generativeFallback: true,
        });
      }
    } else {
      if (requested !== "local" && !wantGenerative) {
        console.warn(
          `[layer-heal] hole coverage ${(coverage * 100).toFixed(0)}% — skip generative, try local only if flat`,
        );
      }
      // Dark photo plates: local ring-fill → solid black. Prefer leaving plate
      // untouched only when generative was requested but coverage is huge.
      const flat = await plateLooksFlatBright(imgBuf);
      if (!flat && requested !== "local") {
        throw new Error(
          `Hole too large for generative heal (${(coverage * 100).toFixed(0)}%) on photo plate`,
        );
      }
      outJpeg = Buffer.from(await localRingFill(imgBuf, clamped, imgW, imgH));
      mode = "local";
    }

    const backgroundUrlOut = await publishHealedJpeg(outJpeg, key);

    return NextResponse.json({
      backgroundUrl: backgroundUrlOut,
      mode,
      tokensCharged: tokenCost,
      creditBalance: charged.balanceAfter,
      ...(generativeFallback ? { generativeFallback: true } : {}),
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
