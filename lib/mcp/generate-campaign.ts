import { fal } from "@fal-ai/client";
import {
  chargeTokens,
  refundTokens,
} from "@/lib/billing/charge";
import { refundMetaFromCharge } from "@/lib/billing/charge-ref";
import { getUserPlan } from "@/lib/billing/get-user-plan";
import { planMeetsMinimum } from "@/lib/billing/plan-gates";
import { estimateCampaignTokens } from "@/lib/billing/token-costs";
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

type McpCampaignRole = "hero" | "selling-points" | "offer";

export type McpCampaignSlide = {
  role: McpCampaignRole;
  headline: string;
  imageUrl: string;
};

export async function generateCampaignForMcp(input: {
  clerkId: string;
  product: string;
  offer?: string | null;
  headline?: string | null;
  imageUrl?: string | null;
  libraryAssetId?: string | null;
  aspectRatio?: string | null;
}): Promise<
  | {
      ok: true;
      slides: McpCampaignSlide[];
      tokensCharged: number;
      balanceAfter: number | null;
      aspectRatio: string;
    }
  | McpJobErr
> {
  const product = input.product.trim();
  if (!product) return { ok: false, error: "product is required", status: 400 };

  const plan = await getUserPlan(input.clerkId);
  if (!planMeetsMinimum(plan, "standard")) {
    return {
      ok: false,
      error: "Campaign needs Standard plan or higher (same gate as Studio).",
      code: "PLAN_ENTITLEMENT",
      status: 403,
    };
  }

  let refUrl: string | undefined;
  if (input.imageUrl?.trim() || input.libraryAssetId?.trim()) {
    const media = await resolveMcpMediaUrl({
      clerkId: input.clerkId,
      imageUrl: input.imageUrl,
      libraryAssetId: input.libraryAssetId,
    });
    if (!media.ok) return media;
    refUrl = media.url;
  }

  const falKey = process.env.FAL_KEY?.trim();
  if (!falKey) {
    return { ok: false, error: "Image generation is not configured (FAL_KEY).", status: 503 };
  }
  fal.config({ credentials: falKey });

  const offer = input.offer?.trim() || "";
  const headline = input.headline?.trim() || product;
  const aspectRatio = mcpAspectRatio(input.aspectRatio);
  const resolution = "1K" as const;
  const cost = estimateCampaignTokens(resolution);
  const endpoint = refUrl ? defaultEditEndpoint() : defaultTextEndpoint();

  const slidesPlan: Array<{ role: McpCampaignRole; prompt: string; headline: string }> = [
    {
      role: "hero",
      headline,
      prompt:
        `Campaign slide 1 of 3, HERO. Vertical marketing still of ${product}. ` +
        `Headline idea: ${headline}. Premium commercial photo, consistent product identity, 9:16.`,
    },
    {
      role: "selling-points",
      headline: offer || `${product} benefits`,
      prompt:
        `Campaign slide 2 of 3, SELLING POINTS. Same ${product} as slide 1, different layout. ` +
        `Show benefit / lifestyle. ${offer}. Keep identity. Vertical ad still.`,
    },
    {
      role: "offer",
      headline: offer || "Shop now",
      prompt:
        `Campaign slide 3 of 3, OFFER / CTA. Same ${product}, clear offer framing: ${offer || headline}. ` +
        `Strong end-card energy, no fake logos, vertical ad still.`,
    },
  ];

  const chargeMeta = {
    kind: "campaign",
    mode: "mcp",
    via: "mcp",
    resolution,
  };
  const charged = await chargeTokens(input.clerkId, cost, chargeMeta);
  if ("error" in charged) return await chargeErrorFromResponse(charged);

  const slides: McpCampaignSlide[] = [];
  try {
    for (const row of slidesPlan) {
      const falInput: Record<string, unknown> = {
        prompt: row.prompt,
        aspect_ratio: aspectRatio,
        num_images: 1,
        resolution,
        limit_generations: true,
      };
      if (refUrl) falInput.image_urls = [refUrl];
      const result = await fal.subscribe(endpoint, { input: falInput, logs: false });
      const urls = extractImageUrls(result.data);
      if (!urls[0]) throw new Error(`Campaign ${row.role} returned no image`);
      slides.push({ role: row.role, headline: row.headline, imageUrl: urls[0] });
    }
    await trackUsage(input.clerkId, "image");
    return {
      ok: true,
      slides,
      tokensCharged: cost,
      balanceAfter: charged.balanceAfter,
      aspectRatio,
    };
  } catch (e: unknown) {
    await refundTokens(
      input.clerkId,
      cost,
      refundMetaFromCharge(charged, { ...chargeMeta, reason: "generation_failed" }),
    );
    return {
      ok: false,
      error: formatFalGenerationError(e, "Campaign generation failed"),
      status: 502,
    };
  }
}
