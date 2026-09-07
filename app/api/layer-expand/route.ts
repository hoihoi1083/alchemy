import { fal } from "@fal-ai/client";
import { NextResponse } from "next/server";
import sharp from "sharp";
import { chargeTokens, refundTokens } from "@/lib/billing/charge";
import { TOKEN_COST } from "@/lib/billing/token-costs";
import {
  computeExpandSides,
  estimateExpandTokens,
  presetById,
  type ExpandPresetId,
} from "@/lib/edit-image-2-expand";
import { falVisionImageUrl } from "@/lib/pipeline/fal-vision-image-url";
import { requireAppUser } from "@/lib/require-app-user";
import { isLibraryAssetUrl } from "@/lib/storage/library-asset-url";

export const runtime = "nodejs";
export const maxDuration = 180;

/** Prefer apps outpaint (directional pads). */
const OUTPAINT_ENDPOINT = "fal-ai/image-apps-v2/outpaint";

/**
 * Magic Expand — grow background to a social aspect ratio via fal outpaint.
 */
export async function POST(request: Request) {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;

  const key = process.env.FAL_KEY?.trim();
  if (!key) {
    return NextResponse.json({ error: "FAL_KEY is not configured." }, { status: 503 });
  }
  fal.config({ credentials: key });

  let body: { image_url?: string; preset?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const rawUrl = body.image_url?.trim();
  const preset = presetById(body.preset || "square");
  if (
    !rawUrl ||
    (!/^https?:\/\//i.test(rawUrl) && !isLibraryAssetUrl(rawUrl)) ||
    !preset
  ) {
    return NextResponse.json(
      { error: "image_url and preset (square|story|landscape|wider) are required." },
      { status: 400 },
    );
  }

  let tokenCost: number = TOKEN_COST.smart_layers_expand;
  let chargedBalance: number | null = null;

  try {
    const imageUrl = await falVisionImageUrl(request, rawUrl, {
      clerkId: auth.user.userId,
    });
    const imgRes = await fetch(imageUrl, { cache: "no-store" });
    if (!imgRes.ok) throw new Error(`Failed to download image (${imgRes.status}).`);
    const imgBuf = Buffer.from(await imgRes.arrayBuffer());
    const meta = await sharp(imgBuf).metadata();
    const imgW = meta.width ?? 0;
    const imgH = meta.height ?? 0;
    if (!imgW || !imgH) throw new Error("Could not read image size.");

    const sides = computeExpandSides(imgW, imgH, preset.aspect);
    if (
      sides.expand_left + sides.expand_right + sides.expand_top + sides.expand_bottom <
      8
    ) {
      return NextResponse.json({
        imageUrl,
        width: imgW,
        height: imgH,
        tokensCharged: 0,
        preset: preset.id as ExpandPresetId,
        warning: "already_aspect",
      });
    }

    const outMp = (sides.targetW * sides.targetH) / 1_000_000;
    tokenCost = estimateExpandTokens(outMp);
    const charged = await chargeTokens(auth.user.userId, tokenCost, {
      kind: "smart_layers_expand",
      preset: preset.id,
      endpoint: OUTPAINT_ENDPOINT,
      expand: sides,
    });
    if ("error" in charged) return charged.error;
    chargedBalance = charged.balanceAfter ?? null;

    const falImgUrl = await fal.storage.upload(
      new File(
        [new Uint8Array(await sharp(imgBuf).png().toBuffer())],
        "expand-src.png",
        { type: "image/png" },
      ),
    );

    const result = await fal.subscribe(OUTPAINT_ENDPOINT, {
      input: {
        image_url: falImgUrl,
        expand_left: sides.expand_left,
        expand_right: sides.expand_right,
        expand_top: sides.expand_top,
        expand_bottom: sides.expand_bottom,
        zoom_out_percentage: 0,
        output_format: "png",
        enable_safety_checker: true,
      },
      logs: false,
    });

    const outUrl =
      (result.data as { images?: Array<{ url?: string }> })?.images?.[0]?.url ??
      (result.data as { image?: { url?: string } })?.image?.url;
    if (!outUrl) throw new Error("Expand returned no image.");

    const outRes = await fetch(outUrl, { cache: "no-store" });
    if (!outRes.ok) throw new Error(`Failed to download expand result (${outRes.status}).`);
    let outBuf = Buffer.from(await outRes.arrayBuffer());
    const outMeta = await sharp(outBuf).metadata();
    const outW = outMeta.width ?? sides.targetW;
    const outH = outMeta.height ?? sides.targetH;

    const published = await fal.storage.upload(
      new File(
        [new Uint8Array(await sharp(outBuf).jpeg({ quality: 92 }).toBuffer())],
        "sandwich-expanded.jpg",
        { type: "image/jpeg" },
      ),
    );

    return NextResponse.json({
      imageUrl: published,
      width: outW,
      height: outH,
      tokensCharged: tokenCost,
      creditBalance: chargedBalance,
      preset: preset.id,
      expand: sides,
    });
  } catch (e: unknown) {
    if (chargedBalance != null) {
      await refundTokens(auth.user.userId, tokenCost, {
        kind: "smart_layers_expand",
        reason: "expand_failed",
      });
    }
    const message = e instanceof Error ? e.message : "Expand failed.";
    console.error("[layer-expand]", e);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
