import { fal } from "@fal-ai/client";
import { NextResponse } from "next/server";
import sharp from "sharp";
import { chargeTokens, refundTokens } from "@/lib/billing/charge";
import { TOKEN_COST } from "@/lib/billing/token-costs";
import { finishCropAfterModelEdit } from "@/lib/edit-image-2-transparent-edit";
import { defaultEditEndpoint } from "@/lib/image-endpoints";
import { requireAppUser } from "@/lib/require-app-user";

export const runtime = "nodejs";
export const maxDuration = 180;

const CANVAS = 768;

/**
 * Generate a new sticker-like component for the Magic Layers board.
 * Magenta plate → Banana text-to-image → chroma restore → transparent PNG.
 */
export async function POST(request: Request) {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;

  const key = process.env.FAL_KEY?.trim();
  if (!key) {
    return NextResponse.json({ error: "FAL_KEY is not configured." }, { status: 503 });
  }
  fal.config({ credentials: key });

  let body: { prompt?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const promptIn = (body.prompt ?? "").trim().slice(0, 400);
  if (!promptIn) {
    return NextResponse.json({ error: "prompt is required." }, { status: 400 });
  }

  const tokenCost = TOKEN_COST.image;
  const charged = await chargeTokens(auth.user.userId, tokenCost, {
    kind: "image",
    mode: "add-ai-component",
  });
  if ("error" in charged) return charged.error;

  try {
    // Solid magenta plate so we can key transparency after generation.
    const plate = await sharp({
      create: {
        width: CANVAS,
        height: CANVAS,
        channels: 3,
        background: { r: 255, g: 0, b: 255 },
      },
    })
      .png()
      .toBuffer();
    // Re-upload via flatten helper path is unnecessary — plate is already flat.
    const plateUrl = await fal.storage.upload(
      new File([new Uint8Array(plate)], "ai-component-plate.png", { type: "image/png" }),
    );

    const prompt = [
      `Create ONE isolated graphic component for an ad poster: ${promptIn}.`,
      "Place it centered on the solid magenta (#FF00FF) background.",
      "Keep every empty pixel pure magenta — that means transparent later.",
      "No full poster, no photo background, no gray card, no watermark.",
      "Clean cutout-friendly edges, high contrast, single subject.",
    ].join(" ");

    // Use edit endpoint with magenta plate so the model preserves the key color.
    const result = await fal.subscribe(defaultEditEndpoint(), {
      input: {
        prompt,
        image_urls: [plateUrl],
        aspect_ratio: "1:1",
        num_images: 1,
        resolution: "1K",
        limit_generations: true,
        system_prompt:
          "You generate a single isolated sticker/component on a pure magenta (#FF00FF) plate. Never fill the plate with gray or photos.",
      },
      logs: false,
    });

    const outUrl = (result.data as { images?: Array<{ url?: string }> })?.images?.[0]?.url;
    if (!outUrl) throw new Error("AI component returned no image.");

    const outRes = await fetch(outUrl, { cache: "no-store" });
    if (!outRes.ok) throw new Error(`Download failed (${outRes.status}).`);
    const outBuf = Buffer.from(await outRes.arrayBuffer());
    let fitted = await finishCropAfterModelEdit(outBuf, {
      restoreChroma: true,
      width: CANVAS,
      height: CANVAS,
    });

    // Tight crop to opaque content so the layer isn't a huge empty square.
    const { data, info } = await sharp(fitted)
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
    if (maxX > minX && maxY > minY) {
      const pad = 8;
      const left = Math.max(0, minX - pad);
      const top = Math.max(0, minY - pad);
      const width = Math.min(info.width - left, maxX - minX + 1 + pad * 2);
      const height = Math.min(info.height - top, maxY - minY + 1 + pad * 2);
      fitted = await sharp(fitted).extract({ left, top, width, height }).png().toBuffer();
    }

    const meta = await sharp(fitted).metadata();
    const cropUrl = await fal.storage.upload(
      new File([new Uint8Array(fitted)], "ai-component.png", { type: "image/png" }),
    );

    return NextResponse.json({
      cropUrl,
      width: meta.width ?? CANVAS,
      height: meta.height ?? CANVAS,
      tokensCharged: tokenCost,
      creditBalance: charged.balanceAfter,
    });
  } catch (e: unknown) {
    await refundTokens(auth.user.userId, tokenCost, {
      kind: "image",
      reason: "add_ai_component_failed",
      mode: "add-ai-component",
    });
    const message = e instanceof Error ? e.message : "AI component failed.";
    console.error("[layer-add-ai-component]", e);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
