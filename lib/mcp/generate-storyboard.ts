import { fal } from "@fal-ai/client";
import {
  chargeTokens,
  imageTokenCostFromRequest,
  refundTokens,
} from "@/lib/billing/charge";
import { refundMetaFromCharge } from "@/lib/billing/charge-ref";
import { getUserPlan } from "@/lib/billing/get-user-plan";
import { planMeetsMinimum } from "@/lib/billing/plan-gates";
import { formatFalGenerationError } from "@/lib/fal-errors";
import { defaultEditEndpoint, defaultTextEndpoint } from "@/lib/image-endpoints";
import {
  chargeErrorFromResponse,
  extractImageUrls,
  type McpJobErr,
} from "@/lib/mcp/fal-result";
import { resolveOptionalMcpMediaUrl } from "@/lib/mcp/library";
import { mcpAspectRatio } from "@/lib/mcp/public-media-url";
import { trackUsage } from "@/lib/require-app-user";

export type McpStoryboardScene = {
  index: number;
  role: string;
  prompt: string;
  imageUrl: string;
};

export type McpGenerateStoryboardOk = {
  ok: true;
  scenes: McpStoryboardScene[];
  tokensCharged: number;
  balanceAfter: number | null;
  aspectRatio: string;
  resolution: "1K";
};

export type McpGenerateStoryboardErr = McpJobErr;

const SCENE_ROLES = ["hook", "product", "proof", "cta"] as const;

function clampSceneCount(raw: number | null | undefined): number {
  const n = typeof raw === "number" && Number.isFinite(raw) ? Math.round(raw) : 3;
  return Math.max(2, Math.min(4, n));
}

function scenePrompts(brief: string, count: number): Array<{ role: string; prompt: string }> {
  const roles = SCENE_ROLES.slice(0, count);
  return roles.map((role, i) => ({
    role,
    prompt:
      `Storyboard still ${i + 1} of ${count}, role ${role}. ` +
      `Vertical marketing frame. Keep identity consistent across scenes. ` +
      `Brief: ${brief}`,
  }));
}

/**
 * 2–4 Nano Banana stills as a simple storyboard pack (Pro+ like Studio).
 * Optional public HTTPS product/style reference.
 */
export async function generateStoryboardForMcp(input: {
  clerkId: string;
  brief: string;
  imageUrl?: string | null;
  libraryAssetId?: string | null;
  sceneCount?: number | null;
  aspectRatio?: string | null;
}): Promise<McpGenerateStoryboardOk | McpGenerateStoryboardErr> {
  const brief = input.brief.trim();
  if (!brief) return { ok: false, error: "brief is required", status: 400 };
  if (brief.length > 4000) {
    return { ok: false, error: "brief is too long (max 4000 characters)", status: 400 };
  }

  const plan = await getUserPlan(input.clerkId);
  if (!planMeetsMinimum(plan, "pro")) {
    return {
      ok: false,
      error: "Storyboard needs a Pro plan or higher (same gate as Studio).",
      code: "storyboard_needs_pro",
      status: 403,
    };
  }

  const media = await resolveOptionalMcpMediaUrl({
    clerkId: input.clerkId,
    imageUrl: input.imageUrl,
    libraryAssetId: input.libraryAssetId,
  });
  if (!media.ok) return media;
  const imageUrl = media.url ?? null;

  const falKey = process.env.FAL_KEY?.trim();
  if (!falKey) {
    return { ok: false, error: "Image generation is not configured (FAL_KEY).", status: 503 };
  }
  fal.config({ credentials: falKey });

  const sceneCount = clampSceneCount(input.sceneCount);
  const aspectRatio = mcpAspectRatio(input.aspectRatio);
  const resolution = "1K" as const;
  const cost = imageTokenCostFromRequest({ numImages: sceneCount, resolution });
  const endpoint = imageUrl ? defaultEditEndpoint() : defaultTextEndpoint();
  const planned = scenePrompts(brief, sceneCount);

  const chargeMeta = {
    kind: "storyboard",
    mode: "mcp",
    via: "mcp",
    resolution,
    scene_count: sceneCount,
  };
  const charged = await chargeTokens(input.clerkId, cost, chargeMeta);
  if ("error" in charged) return chargeErrorFromResponse(charged);

  const scenes: McpStoryboardScene[] = [];
  try {
    for (let i = 0; i < planned.length; i++) {
      const row = planned[i]!;
      const falInput: Record<string, unknown> = {
        prompt: row.prompt,
        aspect_ratio: aspectRatio,
        num_images: 1,
        resolution,
        limit_generations: true,
      };
      if (imageUrl) falInput.image_urls = [imageUrl];
      const result = await fal.subscribe(endpoint, { input: falInput, logs: false });
      const urls = extractImageUrls(result.data);
      if (!urls[0]) {
        throw new Error(`Scene ${i + 1} returned no image`);
      }
      scenes.push({
        index: i + 1,
        role: row.role,
        prompt: row.prompt,
        imageUrl: urls[0],
      });
    }
    await trackUsage(input.clerkId, "image");
    return {
      ok: true,
      scenes,
      tokensCharged: cost,
      balanceAfter: charged.balanceAfter,
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
      error: formatFalGenerationError(e, "Storyboard generation failed"),
      status: 502,
    };
  }
}
