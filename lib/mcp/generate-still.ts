import { fal } from "@fal-ai/client";
import {
  chargeTokens,
  imageTokenCostFromRequest,
  refundTokens,
} from "@/lib/billing/charge";
import { refundMetaFromCharge } from "@/lib/billing/charge-ref";
import { formatFalGenerationError } from "@/lib/fal-errors";
import { defaultEditEndpoint, defaultTextEndpoint } from "@/lib/image-endpoints";
import {
  chargeErrorFromResponse,
  extractImageUrls,
  type McpJobErr,
} from "@/lib/mcp/fal-result";
import { resolveMcpMediaUrl } from "@/lib/mcp/library";
import { mcpAspectRatio } from "@/lib/mcp/public-media-url";
import { trackUsage } from "@/lib/require-app-user";

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

export type McpGenerateStillErr = McpJobErr;

async function configureFal(): Promise<McpGenerateStillErr | null> {
  const falKey = process.env.FAL_KEY?.trim();
  if (!falKey) {
    return { ok: false, error: "Image generation is not configured (FAL_KEY).", status: 503 };
  }
  fal.config({ credentials: falKey });
  return null;
}

function trimPrompt(prompt: string): McpGenerateStillErr | string {
  const p = prompt.trim();
  if (!p) return { ok: false, error: "prompt is required", status: 400 };
  if (p.length > 4000) {
    return { ok: false, error: "prompt is too long (max 4000 characters)", status: 400 };
  }
  return p;
}

/**
 * Text-to-image via Nano Banana 2, charged against the Alchemy wallet.
 */
export async function generateStillForMcp(input: {
  clerkId: string;
  prompt: string;
  aspectRatio?: string | null;
}): Promise<McpGenerateStillOk | McpGenerateStillErr> {
  const prompt = trimPrompt(input.prompt);
  if (typeof prompt !== "string") return prompt;
  const cfg = await configureFal();
  if (cfg) return cfg;

  const aspectRatio = mcpAspectRatio(input.aspectRatio);
  const resolution = "1K" as const;
  const cost = imageTokenCostFromRequest({ numImages: 1, resolution });
  const endpoint = defaultTextEndpoint();

  return runStillJob({
    clerkId: input.clerkId,
    cost,
    chargeMeta: {
      kind: "image",
      mode: "text",
      via: "mcp",
      resolution,
      aspect_ratio: aspectRatio,
    },
    endpoint,
    falInput: {
      prompt,
      aspect_ratio: aspectRatio,
      num_images: 1,
      resolution,
      limit_generations: true,
    },
    aspectRatio,
    resolution,
  });
}

/**
 * Image-to-image edit (Nano Banana 2 /edit) from a public HTTPS reference URL.
 */
export async function editStillForMcp(input: {
  clerkId: string;
  prompt: string;
  imageUrl?: string | null;
  libraryAssetId?: string | null;
  aspectRatio?: string | null;
}): Promise<McpGenerateStillOk | McpGenerateStillErr> {
  const prompt = trimPrompt(input.prompt);
  if (typeof prompt !== "string") return prompt;
  const media = await resolveMcpMediaUrl({
    clerkId: input.clerkId,
    imageUrl: input.imageUrl,
    libraryAssetId: input.libraryAssetId,
  });
  if (!media.ok) return media;
  const imageUrl = media.url;
  const cfg = await configureFal();
  if (cfg) return cfg;

  const aspectRatio = mcpAspectRatio(input.aspectRatio);
  const resolution = "1K" as const;
  const cost = imageTokenCostFromRequest({
    numImages: 1,
    resolution,
    multipartMode: "refine",
  });
  const endpoint = defaultEditEndpoint();

  return runStillJob({
    clerkId: input.clerkId,
    cost,
    chargeMeta: {
      kind: "image",
      mode: "refine",
      via: "mcp",
      resolution,
      aspect_ratio: aspectRatio,
    },
    endpoint,
    falInput: {
      prompt,
      image_urls: [imageUrl],
      aspect_ratio: aspectRatio,
      num_images: 1,
      resolution,
      limit_generations: true,
    },
    aspectRatio,
    resolution,
  });
}

async function runStillJob(opts: {
  clerkId: string;
  cost: number;
  chargeMeta: Record<string, unknown>;
  endpoint: string;
  falInput: Record<string, unknown>;
  aspectRatio: string;
  resolution: "1K";
}): Promise<McpGenerateStillOk | McpGenerateStillErr> {
  const charged = await chargeTokens(opts.clerkId, opts.cost, opts.chargeMeta);
  if ("error" in charged) return chargeErrorFromResponse(charged);

  try {
    const result = await fal.subscribe(opts.endpoint, {
      input: opts.falInput,
      logs: false,
    });
    const urls = extractImageUrls(result.data);
    if (!urls.length) {
      await refundTokens(
        opts.clerkId,
        opts.cost,
        refundMetaFromCharge(charged, { ...opts.chargeMeta, reason: "no_image" }),
      );
      return { ok: false, error: "Image URL missing in model response.", status: 502 };
    }

    await trackUsage(opts.clerkId, "image");
    return {
      ok: true,
      imageUrl: urls[0]!,
      imageUrls: urls,
      tokensCharged: opts.cost,
      balanceAfter: charged.balanceAfter,
      endpoint: opts.endpoint,
      aspectRatio: opts.aspectRatio,
      resolution: opts.resolution,
    };
  } catch (e: unknown) {
    await refundTokens(
      opts.clerkId,
      opts.cost,
      refundMetaFromCharge(charged, {
        ...opts.chargeMeta,
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
