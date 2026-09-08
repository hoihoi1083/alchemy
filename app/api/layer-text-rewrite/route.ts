import { fal } from "@fal-ai/client";
import { NextResponse } from "next/server";
import sharp from "sharp";
import { chargeTokens, refundTokens } from "@/lib/billing/charge";
import { TOKEN_COST } from "@/lib/billing/token-costs";
import {
  buildLayerTextRewritePrompt,
  LAYER_TEXT_REWRITE_SYSTEM_PROMPT,
} from "@/lib/edit-image-2-text-rewrite";
import {
  finishCropAfterModelEdit,
  prepareCropForModelEdit,
} from "@/lib/edit-image-2-transparent-edit";
import { defaultEditEndpoint } from "@/lib/image-endpoints";
import { falVisionImageUrl } from "@/lib/pipeline/fal-vision-image-url";
import { requireAppUser } from "@/lib/require-app-user";
import { isLibraryAssetUrl } from "@/lib/storage/library-asset-url";

export const runtime = "nodejs";
export const maxDuration = 180;

/**
 * AI rewrite of a text-layer crop: keep style/color, change wording only.
 * Transparent crops are chroma-flattened before Banana (models destroy alpha).
 */
export async function POST(request: Request) {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;

  const key = process.env.FAL_KEY?.trim();
  if (!key) {
    return NextResponse.json({ error: "FAL_KEY is not configured." }, { status: 503 });
  }
  fal.config({ credentials: key });

  let body: { crop_url?: string; new_text?: string; old_text?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const cropUrlIn = body.crop_url?.trim();
  const newText = (body.new_text ?? "").trim();
  if (
    !cropUrlIn ||
    (!/^https?:\/\//i.test(cropUrlIn) && !isLibraryAssetUrl(cropUrlIn)) ||
    !newText
  ) {
    return NextResponse.json(
      { error: "crop_url (https or library) and new_text are required." },
      { status: 400 },
    );
  }

  const tokenCost = TOKEN_COST.image;
  const charged = await chargeTokens(auth.user.userId, tokenCost, {
    kind: "image",
    mode: "refine-layer-text",
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

    const prepared = await prepareCropForModelEdit(cropBuf);
    const falCropUrl = await fal.storage.upload(
      new File([new Uint8Array(prepared.modelInput)], "text-crop.png", {
        type: "image/png",
      }),
    );

    const prompt = buildLayerTextRewritePrompt({
      newText,
      oldText: body.old_text,
    });
    const endpoint = defaultEditEndpoint();

    const result = await fal.subscribe(endpoint, {
      input: {
        prompt,
        image_urls: [falCropUrl],
        aspect_ratio: "auto",
        num_images: 1,
        resolution: "1K",
        limit_generations: true,
        system_prompt: LAYER_TEXT_REWRITE_SYSTEM_PROMPT,
      },
      logs: false,
    });

    const outUrl = (result.data as { images?: Array<{ url?: string }> })?.images?.[0]?.url;
    if (!outUrl) throw new Error("Text rewrite returned no image.");

    const outRes = await fetch(outUrl, { cache: "no-store" });
    if (!outRes.ok) throw new Error(`Rewrite download ${outRes.status}`);
    const outBuf = Buffer.from(await outRes.arrayBuffer());
    const fitted = await finishCropAfterModelEdit(outBuf, {
      restoreChroma: prepared.restoreChroma,
      width: w,
      height: h,
    });

    let cropUrlOut: string;
    try {
      cropUrlOut = await fal.storage.upload(
        new File([new Uint8Array(fitted)], "text-rewritten.png", {
          type: "image/png",
        }),
      );
    } catch {
      cropUrlOut = `data:image/png;base64,${fitted.toString("base64")}`;
    }

    return NextResponse.json({
      cropUrl: cropUrlOut,
      tokensCharged: tokenCost,
      creditBalance: charged.balanceAfter,
      debug: { restoreChroma: prepared.restoreChroma },
    });
  } catch (e: unknown) {
    await refundTokens(auth.user.userId, tokenCost, {
      kind: "image",
      reason: "layer_text_rewrite_failed",
      mode: "refine-layer-text",
    });
    const message = e instanceof Error ? e.message : "Text rewrite failed.";
    console.error("[layer-text-rewrite]", e);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
