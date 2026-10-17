import { fal } from "@fal-ai/client";
import { readFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import {
  chargeTokens,
  refundMetaFromCharge,
  refundTokens,
} from "@/lib/billing/charge";
import { imageTokensForResolution } from "@/lib/billing/token-costs";
import { formatFalGenerationError } from "@/lib/fal-errors";
import { BANANA2_EDIT_ENDPOINT } from "@/lib/image-endpoints";
import { requireAppUser, trackUsage } from "@/lib/require-app-user";
import { persistAndDurablize } from "@/lib/storage/durable-media";
import {
  estimateStylePackTokens,
  getStylePack,
  type StylePackShot,
} from "@/lib/style-packs";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_PRODUCT_BYTES = 12 * 1024 * 1024;
const PUBLIC_ROOT = path.join(process.cwd(), "public");

function extractImageUrl(resultData: unknown): string | null {
  if (!resultData || typeof resultData !== "object") return null;
  if ("images" in resultData) {
    const images = (resultData as { images?: Array<{ url?: unknown }> }).images;
    const url = images?.[0]?.url;
    return typeof url === "string" ? url : null;
  }
  if ("image" in resultData) {
    const image = (resultData as { image?: { url?: unknown } }).image;
    if (image && typeof image.url === "string") return image.url;
  }
  return null;
}

function readPublicImage(publicPath: string): { bytes: Buffer; contentType: string; name: string } {
  const rel = publicPath.replace(/^\//, "");
  const abs = path.resolve(PUBLIC_ROOT, rel);
  if (!abs.startsWith(PUBLIC_ROOT + path.sep) && abs !== PUBLIC_ROOT) {
    throw new Error("Invalid style reference path.");
  }
  const bytes = readFileSync(abs);
  const ext = path.extname(abs).toLowerCase();
  const contentType =
    ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
  return { bytes, contentType, name: path.basename(abs) };
}

function buildShotPrompt(shot: StylePackShot, productName: string): string {
  const nameLine = productName
    ? `\nProduct / brand name (use only where lettering belongs — cover headlines stay as style template copy, packaging may show "${productName}"): "${productName}".`
    : `\nDo not invent a brand name. No watermarks.`;
  const coverNote =
    shot.role === "cover"
      ? `\nPriority: this COVER must stay eye-catching and poster-like — product swap first, layout fidelity second, prop literalism last.`
      : `\nPriority: correct product scale + STYLE DNA over copying every prop from the reference.`;
  return `${shot.brief}${coverNote}${nameLine}`;
}

export async function POST(request: Request) {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;

  const falKey = process.env.FAL_KEY?.trim();
  if (!falKey) {
    return NextResponse.json({ error: "Image generation is not configured." }, { status: 503 });
  }
  fal.config({ credentials: falKey });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form data." }, { status: 400 });
  }

  const packId = String(form.get("packId") ?? "").trim();
  const productName = String(form.get("productName") ?? "").trim().slice(0, 80);
  const product = form.get("product");

  const pack = getStylePack(packId);
  if (!pack) {
    return NextResponse.json({ error: "Unknown style pack." }, { status: 404 });
  }

  if (!(product instanceof File) || product.size <= 0) {
    return NextResponse.json({ error: "Upload a product image." }, { status: 400 });
  }
  if (product.size > MAX_PRODUCT_BYTES) {
    return NextResponse.json({ error: "Product image must be under 12 MB." }, { status: 400 });
  }
  const productType = (product.type || "image/jpeg").toLowerCase();
  if (!productType.startsWith("image/")) {
    return NextResponse.json({ error: "Product must be an image file." }, { status: 400 });
  }

  const resolution = "1K";
  const perShot = imageTokensForResolution(resolution);
  const tokenCost = estimateStylePackTokens(pack, resolution);

  const charged = await chargeTokens(
    auth.user.userId,
    tokenCost,
    {
      kind: "image",
      mode: "try-style-pack",
      packId: pack.id,
      shotCount: pack.shots.length,
    },
    request,
  );
  if ("error" in charged) return charged.error;

  try {
    const productBytes = Buffer.from(await product.arrayBuffer());
    const productUrl = await fal.storage.upload(
      new File([new Uint8Array(productBytes)], product.name || "product.jpg", {
        type: productType,
      }),
    );

    const refUrlByShot = new Map<string, string>();
    for (const shot of pack.shots) {
      const ref = readPublicImage(shot.refPath);
      const refUrl = await fal.storage.upload(
        new File([new Uint8Array(ref.bytes)], ref.name, { type: ref.contentType }),
      );
      refUrlByShot.set(shot.id, refUrl);
    }

    type ShotResult = {
      shotId: string;
      label: string;
      url: string | null;
      error: string | null;
    };

    const settled = await Promise.all(
      pack.shots.map(async (shot): Promise<ShotResult> => {
        const styleUrl = refUrlByShot.get(shot.id);
        if (!styleUrl) {
          return { shotId: shot.id, label: shot.label, url: null, error: "Missing style ref." };
        }
        try {
          const result = await fal.subscribe(BANANA2_EDIT_ENDPOINT, {
            input: {
              prompt: buildShotPrompt(shot, productName),
              image_urls: [productUrl, styleUrl],
              num_images: 1,
              aspect_ratio: shot.aspectRatio,
              output_format: "jpeg",
              resolution,
              limit_generations: true,
            },
            logs: false,
          });
          const rawUrl = extractImageUrl(result.data);
          if (!rawUrl) {
            return {
              shotId: shot.id,
              label: shot.label,
              url: null,
              error: "Model returned no image.",
            };
          }
          const durable = await persistAndDurablize({
            clerkId: auth.user.userId,
            kind: "image",
            sourceUrl: rawUrl,
            fallbackUrl: rawUrl,
            name: `${pack.id}-${shot.id}`,
            prompt: shot.brief.slice(0, 200),
          });
          return { shotId: shot.id, label: shot.label, url: durable, error: null };
        } catch (err) {
          return {
            shotId: shot.id,
            label: shot.label,
            url: null,
            error: formatFalGenerationError(err),
          };
        }
      }),
    );

    const ok = settled.filter((s) => s.url);
    const failed = settled.filter((s) => !s.url);
    const refundShots = failed.length;

    if (ok.length === 0) {
      await refundTokens(
        auth.user.userId,
        tokenCost,
        refundMetaFromCharge(charged, {
          kind: "image",
          reason: "try_style_pack_all_failed",
          mode: "try-style-pack",
          packId: pack.id,
        }),
      );
      return NextResponse.json(
        {
          error: failed[0]?.error ?? "Style pack generation failed.",
          results: settled,
          tokensCharged: 0,
          creditBalance: charged.balanceAfter,
        },
        { status: 502 },
      );
    }

    if (refundShots > 0) {
      await refundTokens(
        auth.user.userId,
        perShot * refundShots,
        refundMetaFromCharge(charged, {
          kind: "image",
          reason: "try_style_pack_partial_fail",
          mode: "try-style-pack",
          packId: pack.id,
          refundShots,
        }),
      );
    }

    await trackUsage(auth.user.userId, "image");

    return NextResponse.json({
      packId: pack.id,
      results: settled,
      tokensCharged: perShot * ok.length,
      tokensRefunded: perShot * refundShots,
      creditBalance: charged.balanceAfter,
    });
  } catch (e: unknown) {
    await refundTokens(
      auth.user.userId,
      tokenCost,
      refundMetaFromCharge(charged, {
        kind: "image",
        reason: "try_style_pack_failed",
        mode: "try-style-pack",
        packId: pack.id,
      }),
    );
    const message = formatFalGenerationError(e);
    console.error("[try-style-pack]", e);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
