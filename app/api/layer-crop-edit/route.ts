import { fal } from "@fal-ai/client";
import { NextResponse } from "next/server";
import sharp from "sharp";
import { chargeTokens, refundTokens } from "@/lib/billing/charge";
import { TOKEN_COST } from "@/lib/billing/token-costs";
import {
  buildLayerCropEditPrompt,
  resolveCropEditMode,
} from "@/lib/edit-image-2-crop-edit";
import { defaultEditEndpoint } from "@/lib/image-endpoints";
import { falVisionImageUrl } from "@/lib/pipeline/fal-vision-image-url";
import { requireAppUser } from "@/lib/require-app-user";
import { isLibraryAssetUrl } from "@/lib/storage/library-asset-url";

export const runtime = "nodejs";
export const maxDuration = 180;

/**
 * AI edit of a selected layer crop.
 * - new_text → wording rewrite (style from crop)
 * - instruction → freeform change on that region only
 * Banana edit @ TOKEN_COST.image.
 */
export async function POST(request: Request) {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;

  const key = process.env.FAL_KEY?.trim();
  if (!key) {
    return NextResponse.json({ error: "FAL_KEY is not configured." }, { status: 503 });
  }
  fal.config({ credentials: key });

  let body: {
    crop_url?: string;
    new_text?: string;
    old_text?: string;
    instruction?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const cropUrlIn = body.crop_url?.trim();
  const mode = resolveCropEditMode({
    newText: body.new_text,
    instruction: body.instruction,
  });
  if (
    !cropUrlIn ||
    (!/^https?:\/\//i.test(cropUrlIn) && !isLibraryAssetUrl(cropUrlIn)) ||
    !mode
  ) {
    return NextResponse.json(
      {
        error:
          "crop_url (https or library) and either new_text or instruction are required.",
      },
      { status: 400 },
    );
  }

  const built = buildLayerCropEditPrompt({
    mode,
    newText: body.new_text,
    oldText: body.old_text,
    instruction: body.instruction,
  });

  const tokenCost = TOKEN_COST.image;
  const charged = await chargeTokens(auth.user.userId, tokenCost, {
    kind: "image",
    mode: built.billingMode,
  });
  if ("error" in charged) return charged.error;

  try {
    const cropUrl = await falVisionImageUrl(request, cropUrlIn, {
      clerkId: auth.user.userId,
    });
    const cropRes = await fetch(cropUrl, { cache: "no-store" });
    if (!cropRes.ok) throw new Error(`Failed to download crop (${cropRes.status}).`);
    const cropBuf = Buffer.from(await cropRes.arrayBuffer());
    const meta = await sharp(cropBuf).metadata();
    const w = meta.width ?? 0;
    const h = meta.height ?? 0;
    if (!w || !h) throw new Error("Could not read crop size.");

    const png = await sharp(cropBuf).png().toBuffer();
    const falCropUrl = await fal.storage.upload(
      new File([new Uint8Array(png)], "layer-crop.png", { type: "image/png" }),
    );

    const result = await fal.subscribe(defaultEditEndpoint(), {
      input: {
        prompt: built.prompt,
        image_urls: [falCropUrl],
        aspect_ratio: "auto",
        num_images: 1,
        resolution: "1K",
        limit_generations: true,
        system_prompt: built.systemPrompt,
      },
      logs: false,
    });

    const outUrl = (result.data as { images?: Array<{ url?: string }> })?.images?.[0]?.url;
    if (!outUrl) throw new Error("Crop edit returned no image.");

    const outRes = await fetch(outUrl, { cache: "no-store" });
    if (!outRes.ok) throw new Error(`Crop edit download ${outRes.status}`);
    const outBuf = Buffer.from(await outRes.arrayBuffer());
    const fitted = await sharp(outBuf)
      .resize(w, h, { fit: "fill" })
      .png()
      .toBuffer();

    let cropUrlOut: string;
    try {
      cropUrlOut = await fal.storage.upload(
        new File([new Uint8Array(fitted)], "layer-crop-edited.png", { type: "image/png" }),
      );
    } catch {
      cropUrlOut = `data:image/png;base64,${fitted.toString("base64")}`;
    }

    return NextResponse.json({
      cropUrl: cropUrlOut,
      mode,
      tokensCharged: tokenCost,
      creditBalance: charged.balanceAfter,
    });
  } catch (e: unknown) {
    await refundTokens(auth.user.userId, tokenCost, {
      kind: "image",
      reason: "layer_crop_edit_failed",
      mode: built.billingMode,
    });
    const message = e instanceof Error ? e.message : "Crop edit failed.";
    console.error("[layer-crop-edit]", e);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
