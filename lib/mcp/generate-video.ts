import { fal } from "@fal-ai/client";
import {
  chargeTokens,
  refundTokens,
  videoTokenCostFromRequest,
} from "@/lib/billing/charge";
import { refundMetaFromCharge } from "@/lib/billing/charge-ref";
import { formatFalGenerationError } from "@/lib/fal-errors";
import {
  chargeErrorFromResponse,
  extractVideoUrl,
  type McpJobErr,
} from "@/lib/mcp/fal-result";
import { resolveOptionalMcpMediaUrl } from "@/lib/mcp/library";
import { mcpAspectRatio } from "@/lib/mcp/public-media-url";
import { trackUsage } from "@/lib/require-app-user";

export type McpGenerateVideoOk = {
  ok: true;
  videoUrl: string;
  tokensCharged: number;
  balanceAfter: number | null;
  endpoint: string;
  aspectRatio: string;
  durationSec: number;
  resolution: "720p";
  mode: "text" | "image";
};

export type McpGenerateVideoErr = McpJobErr;

function clampDuration(raw: number | null | undefined): number {
  const n = typeof raw === "number" && Number.isFinite(raw) ? Math.round(raw) : 5;
  return Math.max(4, Math.min(8, n));
}

/**
 * Seedance 2.0 Fast clip for Grok MCP (text or start-frame image).
 * Caps duration at 8s and uses 720p fast to keep MCP jobs inside serverless time.
 */
export async function generateVideoForMcp(input: {
  clerkId: string;
  prompt: string;
  imageUrl?: string | null;
  libraryAssetId?: string | null;
  aspectRatio?: string | null;
  durationSec?: number | null;
}): Promise<McpGenerateVideoOk | McpGenerateVideoErr> {
  const prompt = input.prompt.trim();
  if (!prompt) return { ok: false, error: "prompt is required", status: 400 };
  if (prompt.length > 4000) {
    return { ok: false, error: "prompt is too long (max 4000 characters)", status: 400 };
  }

  const falKey = process.env.FAL_KEY?.trim();
  if (!falKey) {
    return { ok: false, error: "Video generation is not configured (FAL_KEY).", status: 503 };
  }
  fal.config({ credentials: falKey });

  const media = await resolveOptionalMcpMediaUrl({
    clerkId: input.clerkId,
    imageUrl: input.imageUrl,
    libraryAssetId: input.libraryAssetId,
  });
  if (!media.ok) return media;
  const imageUrl = media.url ?? null;

  const mode: "text" | "image" = imageUrl ? "image" : "text";
  const aspectRatio = mcpAspectRatio(input.aspectRatio);
  const durationSec = clampDuration(input.durationSec);
  const resolution = "720p" as const;
  const endpoint =
    mode === "image"
      ? "bytedance/seedance-2.0/fast/image-to-video"
      : "bytedance/seedance-2.0/fast/text-to-video";
  const cost = videoTokenCostFromRequest({
    resolution,
    fast: true,
    duration: durationSec,
  });

  const chargeMeta = {
    kind: "video",
    mode,
    via: "mcp",
    resolution,
    duration: durationSec,
    endpoint,
  };
  const charged = await chargeTokens(input.clerkId, cost, chargeMeta);
  if ("error" in charged) return chargeErrorFromResponse(charged);

  const falInput: Record<string, unknown> = {
    prompt,
    resolution,
    duration: String(durationSec),
    aspect_ratio: aspectRatio,
    generate_audio: false,
  };
  if (imageUrl) falInput.image_url = imageUrl;

  try {
    const result = await fal.subscribe(endpoint, { input: falInput, logs: false });
    const videoUrl = extractVideoUrl(result.data);
    if (!videoUrl) {
      await refundTokens(
        input.clerkId,
        cost,
        refundMetaFromCharge(charged, { ...chargeMeta, reason: "no_video" }),
      );
      return { ok: false, error: "Video URL missing in model response.", status: 502 };
    }
    await trackUsage(input.clerkId, "video");
    return {
      ok: true,
      videoUrl,
      tokensCharged: cost,
      balanceAfter: charged.balanceAfter,
      endpoint,
      aspectRatio,
      durationSec,
      resolution,
      mode,
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
      error: formatFalGenerationError(e, "Video generation failed"),
      status: 502,
    };
  }
}
