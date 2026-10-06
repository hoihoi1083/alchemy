import { fal } from "@fal-ai/client";
import {
  chargeTokens,
  imageTokenCostFromRequest,
  refundTokens,
} from "@/lib/billing/charge";
import { refundMetaFromCharge } from "@/lib/billing/charge-ref";
import { formatFalGenerationError } from "@/lib/fal-errors";
import { defaultTextEndpoint } from "@/lib/image-endpoints";
import { trackUsage } from "@/lib/require-app-user";

const ALLOWED_RATIOS = new Set([
  "1:1",
  "9:16",
  "16:9",
  "4:5",
  "5:4",
  "3:4",
  "4:3",
  "3:2",
  "2:3",
]);

function extractImageUrls(resultData: unknown): string[] {
  if (!resultData || typeof resultData !== "object") return [];
  if ("images" in resultData) {
    const images = (resultData as { images?: Array<{ url?: unknown }> }).images;
    return (images ?? [])
      .map((img) => (typeof img?.url === "string" ? img.url : undefined))
      .filter((u): u is string => Boolean(u));
  }
  if ("image" in resultData) {
    const image = (resultData as { image?: { url?: unknown } }).image;
    if (image && typeof image.url === "string") return [image.url];
  }
  if ("url" in resultData) {
    const url = (resultData as { url?: unknown }).url;
    if (typeof url === "string") return [url];
  }
  return [];
}

export type McpGenerateStillOk = {
  ok: true;
  imageUrl: string;
  imageUrls: string[];
  tokensCharged: number;
  balanceAfter: number | null;
  endpoint: string;
  aspectRatio: string;
  resolution: "1K";
};

export type McpGenerateStillErr = {
  ok: false;
  error: string;
  code?: string;
  status?: number;
};

/**
 * Text-to-image via Nano Banana 2, charged against the Alchemy wallet.
 * Kept separate from /api/generate-image so Grok MCP does not inherit wizard side effects.
 */
export async function generateStillForMcp(input: {
  clerkId: string;
  prompt: string;
  aspectRatio?: string | null;
}): Promise<McpGenerateStillOk | McpGenerateStillErr> {
  const prompt = input.prompt.trim();
  if (!prompt) {
    return { ok: false, error: "prompt is required", status: 400 };
  }
  if (prompt.length > 4000) {
    return { ok: false, error: "prompt is too long (max 4000 characters)", status: 400 };
  }

  const falKey = process.env.FAL_KEY?.trim();
  if (!falKey) {
    return { ok: false, error: "Image generation is not configured (FAL_KEY).", status: 503 };
  }
  fal.config({ credentials: falKey });

  const rawRatio = (input.aspectRatio ?? "9:16").trim();
  const aspectRatio = ALLOWED_RATIOS.has(rawRatio) ? rawRatio : "9:16";
  const resolution = "1K" as const;
  const cost = imageTokenCostFromRequest({ numImages: 1, resolution });
  const endpoint = defaultTextEndpoint();

  const chargeMeta = {
    kind: "image",
    mode: "text",
    via: "mcp",
    resolution,
    aspect_ratio: aspectRatio,
  };
  const charged = await chargeTokens(input.clerkId, cost, chargeMeta);
  if ("error" in charged) {
    const body = (await charged.error.json().catch(() => null)) as {
      error?: string;
      code?: string;
    } | null;
    return {
      ok: false,
      error: body?.error ?? "Could not charge tokens",
      code: body?.code,
      status: charged.error.status,
    };
  }

  try {
    const result = await fal.subscribe(endpoint, {
      input: {
        prompt,
        aspect_ratio: aspectRatio,
        num_images: 1,
        resolution,
        limit_generations: true,
      },
      logs: false,
    });
    const urls = extractImageUrls(result.data);
    if (!urls.length) {
      await refundTokens(
        input.clerkId,
        cost,
        refundMetaFromCharge(charged, { ...chargeMeta, reason: "no_image" }),
      );
      return { ok: false, error: "Image URL missing in model response.", status: 502 };
    }

    await trackUsage(input.clerkId, "image");
    return {
      ok: true,
      imageUrl: urls[0]!,
      imageUrls: urls,
      tokensCharged: cost,
      balanceAfter: charged.balanceAfter,
      endpoint,
      aspectRatio,
      resolution,
    };
  } catch (e: unknown) {
    await refundTokens(
      input.clerkId,
      cost,
      refundMetaFromCharge(charged, {
        ...chargeMeta,
        reason: "generation_failed",
      }),
    );
    return {
      ok: false,
      error: formatFalGenerationError(e, "Image generation failed"),
      status: 502,
    };
  }
}
