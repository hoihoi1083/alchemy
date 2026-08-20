import { fal } from "@fal-ai/client";
import { formatFalGenerationError } from "@/lib/fal-errors";
import { NextResponse } from "next/server";
import {
  buildFalLayoutTransferImageUrls,
  dualProductIdentityHint,
} from "@/lib/fal-dual-reference-urls";
import { requireAppUser, trackUsage } from "@/lib/require-app-user";
import {
  imageTokenCostFromRequest,
  chargeTokens,
  refundTokens,
} from "@/lib/billing/charge";
import { clampImageResolution } from "@/lib/billing/entitlements";
import { getUserPlan } from "@/lib/billing/get-user-plan";
import type { BrandProfile } from "@/lib/brand-profile";
import { parseBrandKit } from "@/lib/brand-kit";
import { archiveImageWithLogoFile } from "@/lib/brand-logo-composite";
import {
  buildMotionPosterEndStillPrompt,
  buildMotionPosterStillPrompt,
  buildPromptVariables,
  buildWizardImagePrompt,
  resolveImagePromptMode,
} from "@/lib/prompt-variables";
import { parseMotionPosterDialectPick } from "@/lib/motion-poster-dialects";
import {
  buildSocialDripStillPrompt,
  heuristicSocialDripPlan,
  normalizeSocialDripPlan,
  parseSocialDripMetaphorPick,
  type SocialDripPlan,
} from "@/lib/social-drip";
import {
  buildVacuumInflateStillPrompt,
} from "@/lib/vacuum-inflate";
import {
  buildHandThrowSceneStillPrompt,
} from "@/lib/hand-throw-scene";
import {
  buildProductExplodeStillPrompt,
} from "@/lib/product-explode";
import {
  buildCreativeMotionStillPrompt,
  parseCreativeMotionSchemePick,
  resolveCreativeMotionScheme,
  type CreativeMotionSchemeId,
} from "@/lib/creative-motion";
import type { PromptMarket, SubjectFraming } from "@/lib/prompt-variables";
import { defaultEditEndpoint, defaultTextEndpoint, sanitizeImageEndpoint } from "@/lib/image-endpoints";
import { mirrorImageUrlToFalStorage } from "@/lib/fal-mirror-media";
import { persistAndDurablize, persistAndDurablizeMany } from "@/lib/storage/durable-media";
import { isHttpOrLibraryMediaUrl } from "@/lib/storage/library-asset-url";
import {
  IMAGE_LOGO_REFINE_SYSTEM_PROMPT,
  IMAGE_REFINE_SYSTEM_PROMPT,
  buildLogoRefinePrompt,
  isSameImageAsset,
  type LogoPlacement,
} from "@/lib/image-refine-prompt";
import {
  IMAGE_REGION_REFINE_SYSTEM_PROMPT,
  buildRegionRefinePrompt,
  parseImageEditRegions,
} from "@/lib/image-edit-region";
import { archiveCampaignSlidesToPipeline, archiveRemoteImageToPipeline } from "@/lib/pipeline/archive-image";
import { IMAGE_CANVAS_COMPOSE_SYSTEM_PROMPT } from "@/lib/pro-canvas-compose";
import type { VisualStyleId } from "@/lib/visual-styles";
import type { PromotionMode } from "@/lib/promotion-mode";
import type { WorkflowMode } from "@/lib/workflow-mode";
import { isPromotionMode } from "@/lib/promotion-mode";
import {
  mergeReferencePromptExtra,
  parseStrategyFromFormData,
} from "@/lib/reference-strategy";
import { ensureOptimizedSceneEssay } from "@/lib/optimize-reference-scene-prompt";
import { resolveArtStyleId, artStyleSystemPrompt } from "@/lib/art-style";
import { resolveCompositionPresetId } from "@/lib/composition-presets";
import {
  planSingleImageAd,
  shouldPlanSingleImageAd,
  type SingleImagePlan,
} from "@/lib/single-image-plan";

export const runtime = "nodejs";
export const maxDuration = 180;

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

function formatFalError(e: unknown): string {
  return formatFalGenerationError(e, "Image generation failed");
}

function aspectRatioForApi(ratio: string): string {
  const map: Record<string, string> = {
    "9:16": "9:16",
    "16:9": "16:9",
    "1:1": "1:1",
    "4:5": "4:5",
  };
  return map[ratio] ?? "auto";
}

function parseNumImages(raw: string | null): number {
  const n = parseInt(raw ?? "1", 10);
  if (Number.isNaN(n)) return 1;
  return Math.min(4, Math.max(1, n));
}

function banana2Input(
  prompt: string,
  imageUrls: string[],
  aspectRatio: string,
  numImages: number,
  opts?: {
    limitGenerations?: boolean;
    systemPrompt?: string;
    resolution?: "1K" | "2K" | "4K";
  },
): Record<string, unknown> {
  const input: Record<string, unknown> = {
    prompt,
    aspect_ratio: aspectRatio,
    num_images: numImages,
    resolution: opts?.resolution ?? "1K",
    limit_generations: opts?.limitGenerations ?? true,
  };
  if (imageUrls.length > 0) {
    input.image_urls = imageUrls;
  }
  if (opts?.systemPrompt?.trim()) {
    input.system_prompt = opts.systemPrompt.trim();
  }
  return input;
}

async function mirrorImageToFalStorage(url: string, clerkId: string): Promise<string> {
  // Delegate to the shared mirror, which returns fal-CDN URLs as-is, reads
  // local pipeline files from disk, and SSRF-guards any other remote URL
  // before fetching it.
  return mirrorImageUrlToFalStorage(url, { clerkId });
}

function parseLogoPlacement(raw: string | null | undefined): LogoPlacement {
  const v = raw?.trim();
  if (
    v === "bottom-right" ||
    v === "bottom-left" ||
    v === "top-right" ||
    v === "top-left" ||
    v === "center" ||
    v === "replace"
  ) {
    return v;
  }
  return "bottom-right";
}

async function archiveOutputUrls(
  request: Request,
  urls: string[],
  clerkId: string,
): Promise<string[]> {
  if (!urls.length) return urls;
  if (urls.length === 1) {
    return [await archiveRemoteImageToPipeline(request, urls[0], "generated.png", clerkId)];
  }
  return archiveCampaignSlidesToPipeline(request, urls, clerkId);
}

async function runRefineEdit(
  request: Request,
  opts: {
  endpoint: string;
  prompt: string;
  aspectRatio: string;
  numImages: number;
  imageUrls: string[];
  systemPrompt: string;
  userId: string;
  refineSources: string[];
  tokenCost?: number;
  resolution?: "1K" | "2K" | "4K";
}): Promise<NextResponse> {
  const cost =
    opts.tokenCost ??
    imageTokenCostFromRequest({
      multipartMode: "refine",
      numImages: opts.numImages,
    });
  const charged = await chargeTokens(opts.userId, cost, { kind: "image", mode: "refine" });
  if ("error" in charged) return charged.error;
  const balanceAfter = charged.balanceAfter;

  try {
    const plan = await getUserPlan(opts.userId);
    const { resolution: imageResolution } = clampImageResolution(plan, opts.resolution ?? null);
    const hostedUrls = await Promise.all(
      opts.imageUrls.map((url) => mirrorImageToFalStorage(url, opts.userId)),
    );
    const result = await fal.subscribe(opts.endpoint, {
      input: {
        ...banana2Input(opts.prompt, hostedUrls, opts.aspectRatio, opts.numImages, {
          limitGenerations: false,
          systemPrompt: opts.systemPrompt,
          resolution: imageResolution,
        }),
        seed: Math.floor(Math.random() * 2_147_483_647),
      },
      logs: true,
    });
    const outUrls = extractImageUrls(result.data);
    if (!outUrls.length) {
      await refundTokens(opts.userId, cost, { kind: "image", mode: "refine", reason: "no_image" });
      return NextResponse.json(
        {
          error:
            "Image URL missing in model response. Please try again.",
          raw: result.data,
        },
        { status: 502 },
      );
    }

    const allSources = [...opts.refineSources, ...hostedUrls];
    if (
      allSources.length > 0 &&
      outUrls.every((out) => allSources.some((src) => isSameImageAsset(src, out)))
    ) {
      await refundTokens(opts.userId, cost, { kind: "image", mode: "refine", reason: "unchanged" });
      return NextResponse.json(
        {
          error:
            "The model returned the same image. Try a more specific fix note (e.g. “remove the logo in the top-right corner”).",
        },
        { status: 502 },
      );
    }

    await trackUsage(opts.userId, "image");
    const archived = await archiveOutputUrls(request, outUrls, opts.userId);
    const durable = await persistAndDurablizeMany({
      clerkId: opts.userId,
      kind: "image",
      sourceUrls: outUrls,
      fallbackUrls: archived,
      prompt: opts.prompt.slice(0, 500),
    });
    return NextResponse.json({
      imageUrl: durable[0],
      imageUrls: durable,
      requestId: result.requestId,
      endpoint: opts.endpoint,
      mode: "refine",
      variantCount: outUrls.length,
      tokensCharged: cost,
      creditBalance: balanceAfter,
    });
  } catch (e: unknown) {
    await refundTokens(opts.userId, cost, { kind: "image", mode: "refine", reason: "generation_failed" });
    return NextResponse.json({ error: formatFalError(e) }, { status: 502 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;

  const key = process.env.FAL_KEY?.trim();
  if (!key) {
    return NextResponse.json(
      { error: "Image generation is temporarily unavailable. Please try again later." },
      { status: 503 },
    );
  }
  fal.config({ credentials: key });

  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
    }

    const multipartMode = (formData.get("mode") as string | null)?.trim() || "";

    if (multipartMode === "refine-logo") {
      const sourceUrl = (formData.get("source_image_url") as string | null)?.trim() || "";
      const logoFile = formData.get("logo_image");
      const hasLogo = logoFile instanceof File && logoFile.size > 0;
      const placement = parseLogoPlacement(
        (formData.get("logo_placement") as string | null) ?? undefined,
      );
      const userNote = (formData.get("user_note") as string | null)?.trim() || "";

      if (!sourceUrl.startsWith("http")) {
        return NextResponse.json({ error: "Generate an AI image first, then add a logo." }, { status: 400 });
      }
      if (!hasLogo) {
        return NextResponse.json({ error: "Upload a logo image (PNG with transparency works best)." }, { status: 400 });
      }

      // Pixel stamp preserves PNG alpha. AI compositing fills transparent holes with black.
      // "replace" still needs the edit model to remove an existing mark first.
      if (placement !== "replace") {
        try {
          const logoBuffer = Buffer.from(await (logoFile as File).arrayBuffer());
          const archived = await archiveImageWithLogoFile(
            request,
            sourceUrl,
            logoBuffer,
            placement,
            auth.user.userId,
          );
          const durable = await persistAndDurablize({
            clerkId: auth.user.userId,
            kind: "image",
            sourceUrl: archived.startsWith("http")
              ? archived
              : new URL(archived, request.url).toString(),
            fallbackUrl: archived,
            name: "logo-stamp",
          });
          // Deterministic PNG stamp — no fal AI cost.
          return NextResponse.json({
            imageUrl: durable,
            imageUrls: [durable],
            mode: "refine-logo",
            logoStamped: true,
            variantCount: 1,
            tokensCharged: 0,
          });
        } catch (e: unknown) {
          return NextResponse.json({ error: formatFalError(e) }, { status: 502 });
        }
      }

      const endpoint = sanitizeImageEndpoint(
        formData.get("endpoint") as string | null,
        defaultEditEndpoint(),
      );
      const aspectRatio = aspectRatioForApi(
        (formData.get("aspect_ratio") as string | null)?.trim() || "auto",
      );
      const numImages = parseNumImages((formData.get("num_images") as string | null)?.trim() ?? "1");
      if (!endpoint.includes("/edit")) {
        return NextResponse.json(
          { error: "Logo refine requires an edit endpoint (e.g. nano-banana-2/edit)." },
          { status: 400 },
        );
      }

      const refineLogoCost = imageTokenCostFromRequest({ multipartMode: "refine-logo", numImages });

      try {
        const logoUrl = await fal.storage.upload(logoFile as File);
        const prompt = buildLogoRefinePrompt({ placement, userNote });
        return await runRefineEdit(request, {
          endpoint,
          prompt,
          aspectRatio,
          numImages,
          imageUrls: [sourceUrl, logoUrl],
          systemPrompt: IMAGE_LOGO_REFINE_SYSTEM_PROMPT,
          userId: auth.user.userId,
          refineSources: [sourceUrl, logoUrl],
          tokenCost: refineLogoCost,
        });
      } catch (e: unknown) {
        return NextResponse.json({ error: formatFalError(e) }, { status: 502 });
      }
    }

    if (multipartMode === "refine-regions") {
      const sourceUrl = (formData.get("source_image_url") as string | null)?.trim() || "";
      const regionsRaw = formData.get("regions");
      let regions = parseImageEditRegions(null);
      if (typeof regionsRaw === "string") {
        try {
          regions = parseImageEditRegions(JSON.parse(regionsRaw));
        } catch {
          regions = [];
        }
      }
      const hintFile = formData.get("region_hint_image");
      const hasHint = hintFile instanceof File && hintFile.size > 0;
      const endpoint = sanitizeImageEndpoint(
        formData.get("endpoint") as string | null,
        defaultEditEndpoint(),
      );
      const aspectRatio = aspectRatioForApi(
        (formData.get("aspect_ratio") as string | null)?.trim() || "auto",
      );
      const numImages = parseNumImages((formData.get("num_images") as string | null)?.trim() ?? "1");

      if (!sourceUrl.startsWith("http")) {
        return NextResponse.json({ error: "Generate an AI image first, then select areas to fix." }, { status: 400 });
      }
      if (!regions.length) {
        return NextResponse.json(
          { error: "Draw at least one area and describe what to change inside it." },
          { status: 400 },
        );
      }
      if (!endpoint.includes("/edit")) {
        return NextResponse.json(
          { error: "Regional refine requires an edit endpoint (e.g. nano-banana-2/edit)." },
          { status: 400 },
        );
      }

      const regionCost = imageTokenCostFromRequest({ multipartMode: "refine-regions", numImages });

      try {
        const imageUrls = [sourceUrl];
        if (hasHint) {
          const hintUrl = await fal.storage.upload(hintFile as File);
          imageUrls.push(hintUrl);
        }
        const prompt = buildRegionRefinePrompt(regions, hasHint);
        return await runRefineEdit(request, {
          endpoint,
          prompt,
          aspectRatio,
          numImages,
          imageUrls,
          systemPrompt: IMAGE_REGION_REFINE_SYSTEM_PROMPT,
          userId: auth.user.userId,
          refineSources: [sourceUrl],
          tokenCost: regionCost,
        });
      } catch (e: unknown) {
        return NextResponse.json({ error: formatFalError(e) }, { status: 502 });
      }
    }

    const imageMode = (formData.get("image_mode") as string | null)?.trim() || "product-ad";
    const creativeMode =
      (formData.get("image_creative_mode") as string | null)?.trim() || "promo-ai";
    const reference = formData.get("reference_image");
    const styleRef = formData.get("style_reference_image");
    const hasProduct = reference instanceof File && reference.size > 0;
    const hasStyle = styleRef instanceof File && styleRef.size > 0;
    const productAngleFiles = formData
      .getAll("product_angle_images")
      .filter((f): f is File => f instanceof File && f.size > 0)
      .slice(0, 4);

    const brandKitRawEarly = (formData.get("brand_kit") as string | null)?.trim() || "";
    let brandKitEarly = null as ReturnType<typeof parseBrandKit> | null;
    if (brandKitRawEarly) {
      try {
        brandKitEarly = parseBrandKit(JSON.parse(brandKitRawEarly));
      } catch {
        return NextResponse.json({ error: "Invalid brand kit data." }, { status: 400 });
      }
    }
    const promotionModeRawEarly = (formData.get("promotion_mode") as string | null)?.trim() || "";
    const isConceptMode = isPromotionMode(promotionModeRawEarly) && promotionModeRawEarly === "concept";

    const startPlateUrlEarly = (formData.get("start_plate_url") as string | null)?.trim() || "";
    const motionPosterEarly = ["1", "true", "yes"].includes(
      String(formData.get("motion_poster") ?? "")
        .trim()
        .toLowerCase(),
    );
    const socialDripEarly = ["1", "true", "yes"].includes(
      String(formData.get("social_drip") ?? "")
        .trim()
        .toLowerCase(),
    );
    const vacuumInflateEarly = ["1", "true", "yes"].includes(
      String(formData.get("vacuum_inflate") ?? "")
        .trim()
        .toLowerCase(),
    );
    const creativeMotionEarly = ["1", "true", "yes"].includes(
      String(formData.get("creative_motion") ?? "")
        .trim()
        .toLowerCase(),
    );
    const handThrowEarly = ["1", "true", "yes"].includes(
      String(formData.get("hand_throw_scene") ?? "")
        .trim()
        .toLowerCase(),
    );
    const productExplodeEarly = ["1", "true", "yes"].includes(
      String(formData.get("product_explode") ?? "")
        .trim()
        .toLowerCase(),
    );
    if (
      !hasProduct &&
      !hasStyle &&
      !isConceptMode &&
      !(motionPosterEarly && startPlateUrlEarly) &&
      !socialDripEarly &&
      !vacuumInflateEarly &&
      !creativeMotionEarly &&
      !handThrowEarly &&
      !productExplodeEarly
    ) {
      return NextResponse.json(
        {
          error:
            imageMode === "reference"
              ? "Upload a reference image to guide the look."
              : "Upload a product photo to polish it with AI.",
        },
        { status: 400 },
      );
    }

    const productName = (formData.get("product_name") as string | null)?.trim() || "";
    const business = (formData.get("business") as string | null)?.trim() || "";
    const promptMarket = ((formData.get("prompt_market") as string | null)?.trim() ||
      "en") as PromptMarket;
    const subjectFraming = ((formData.get("subject_framing") as string | null)?.trim() ||
      "auto") as SubjectFraming;
    const promptExtraRaw = (formData.get("prompt_extra") as string | null)?.trim() || "";
    const headline = (formData.get("headline") as string | null)?.trim() || "";
    const subline = (formData.get("subline") as string | null)?.trim() || "";
    const offer = (formData.get("offer") as string | null)?.trim() || "";
    const { strategy, brief: parsedBrief } = parseStrategyFromFormData(formData);
    let brief = parsedBrief;
    if (
      !motionPosterEarly &&
      strategy.kind === "layout-transfer" &&
      brief &&
      (productName || headline)
    ) {
      try {
        brief = await ensureOptimizedSceneEssay(brief, {
          product: productName,
          headline,
          subline,
          offer,
        });
      } catch {
        /* keep unoptimized brief */
      }
    }
    const promptExtra = mergeReferencePromptExtra(promptExtraRaw, brief, strategy);
    const artStyleId = resolveArtStyleId((formData.get("art_style") as string | null)?.trim());
    const compositionPresetId = resolveCompositionPresetId(
      (formData.get("composition_preset") as string | null)?.trim(),
    );
    const imageTextModeRaw = (formData.get("image_text_mode") as string | null)?.trim();
    const imageTextMode =
      imageTextModeRaw === "textless" ? ("textless" as const) : ("integrated" as const);
    const clientPrompt = (formData.get("prompt") as string | null)?.trim() || "";

    const aspectRatioRaw = (formData.get("aspect_ratio") as string | null)?.trim() || "9:16";
    const aspectRatio = aspectRatioForApi(aspectRatioRaw);
    const numImages = parseNumImages((formData.get("num_images") as string | null)?.trim() ?? "1");

    const useReferenceConcept = strategy.useReferenceConceptPrompts;
    const dualImage = strategy.useDualImage;

    if (creativeMode === "reference-concept" && strategy.kind === "layout-transfer" && !dualImage) {
      return NextResponse.json(
        {
          error:
            "Reference concept needs both a product photo and a reference ad image (JPG/PNG).",
        },
        { status: 400 },
      );
    }

    const endpoint = sanitizeImageEndpoint(
      formData.get("endpoint") as string | null,
      strategy.sendPixelsToFal ? defaultEditEndpoint() : defaultTextEndpoint(),
    );

    const vars = buildPromptVariables({
      product: productName,
      business,
      headline,
      subline,
      offer,
      market: promptMarket,
      framing: subjectFraming,
      extra: promptExtra,
      artStyle: artStyleId,
      imageTextMode,
      compositionPreset: compositionPresetId,
    });

    const visualStyle = (formData.get("visual_style") as string | null)?.trim() || "product";
    const promotionModeRaw = (formData.get("promotion_mode") as string | null)?.trim() || "";
    const workflowModeRaw = (formData.get("workflow_mode") as string | null)?.trim() || "";
    const promotionMode = isPromotionMode(promotionModeRaw) ? promotionModeRaw : undefined;
    const workflowMode =
      workflowModeRaw === "image-only" ||
      workflowModeRaw === "video-only" ||
      workflowModeRaw === "combined"
        ? (workflowModeRaw as WorkflowMode)
        : undefined;
    const brandProfileRaw = (formData.get("brand_profile") as string | null)?.trim() || "";
    let brandProfile: BrandProfile | null = null;
    if (brandProfileRaw) {
      try {
        brandProfile = JSON.parse(brandProfileRaw) as BrandProfile;
      } catch {
        return NextResponse.json({ error: "Invalid brand profile data." }, { status: 400 });
      }
    }
    const brandKitRaw = (formData.get("brand_kit") as string | null)?.trim() || "";
    const brandKit = brandKitEarly ?? (brandKitRaw ? parseBrandKit(JSON.parse(brandKitRaw)) : null);

    const promptMode = resolveImagePromptMode(
      visualStyle,
      useReferenceConcept ? "reference-concept" : creativeMode,
      { promotionMode, workflowMode },
    );

    const imageOutputMode = (formData.get("image_output_mode") as string | null)?.trim() || "";
    const motionPoster = ["1", "true", "yes"].includes(
      String(formData.get("motion_poster") ?? "")
        .trim()
        .toLowerCase(),
    );
    const socialDrip = ["1", "true", "yes"].includes(
      String(formData.get("social_drip") ?? "")
        .trim()
        .toLowerCase(),
    );
    const vacuumInflate = ["1", "true", "yes"].includes(
      String(formData.get("vacuum_inflate") ?? "")
        .trim()
        .toLowerCase(),
    );
    const creativeMotion = ["1", "true", "yes"].includes(
      String(formData.get("creative_motion") ?? "")
        .trim()
        .toLowerCase(),
    );
    const handThrowScene = ["1", "true", "yes"].includes(
      String(formData.get("hand_throw_scene") ?? "")
        .trim()
        .toLowerCase(),
    );
    const productExplode = ["1", "true", "yes"].includes(
      String(formData.get("product_explode") ?? "")
        .trim()
        .toLowerCase(),
    );
    const posterFrame =
      String(formData.get("motion_poster_frame") ?? "start").trim() === "end"
        ? "end"
        : "start";
    const socialDripFrame =
      String(formData.get("social_drip_frame") ?? "start").trim() === "end"
        ? "end"
        : "start";
    const vacuumInflateFrame =
      String(formData.get("vacuum_inflate_frame") ?? "start").trim() === "end"
        ? "end"
        : "start";
    const creativeMotionFrame =
      String(formData.get("creative_motion_frame") ?? "start").trim() === "end"
        ? "end"
        : "start";
    const handThrowFrame =
      String(formData.get("hand_throw_scene_frame") ?? "start").trim() === "end"
        ? "end"
        : "start";
    const productExplodeFrame =
      String(formData.get("product_explode_frame") ?? "start").trim() === "end"
        ? "end"
        : "start";
    let creativeMotionScheme: CreativeMotionSchemeId = "body-breathe";
    if (creativeMotion) {
      creativeMotionScheme = resolveCreativeMotionScheme({
        pick: parseCreativeMotionSchemePick(formData.get("creative_motion_scheme")),
        product: productName,
        headline,
      });
    }
    const startPlateUrl = (formData.get("start_plate_url") as string | null)?.trim() || "";
    if (motionPoster) {
      vars.imageTextMode = posterFrame === "end" ? "integrated" : "textless";
    }
    let socialDripPlan: SocialDripPlan | null = null;
    if (socialDrip) {
      const planRaw = (formData.get("social_drip_plan") as string | null)?.trim() || "";
      if (planRaw) {
        try {
          socialDripPlan = JSON.parse(planRaw) as SocialDripPlan;
        } catch {
          socialDripPlan = null;
        }
      }
      if (!socialDripPlan) {
        socialDripPlan = heuristicSocialDripPlan({
          product: productName,
          conceptIdea: productName,
          headline,
          business,
          conceptMode: promotionMode === "concept",
          pick: parseSocialDripMetaphorPick(formData.get("social_drip_metaphor")),
          igHandle: String(formData.get("social_drip_ig_handle") ?? ""),
          igCaption: String(formData.get("social_drip_ig_caption") ?? ""),
          pourOrigin: String(formData.get("social_drip_pour_origin") ?? ""),
          pourAmount: String(formData.get("social_drip_pour_amount") ?? ""),
        });
      } else {
        socialDripPlan = normalizeSocialDripPlan(socialDripPlan);
      }
    }
    let singleImagePlan: SingleImagePlan | null = null;
    // Never override specialized client prompts (end-frame, storyboard scene regen, advanced paste).
    const wantSinglePlan =
      !motionPoster &&
      !socialDrip &&
      !vacuumInflate &&
      !creativeMotion &&
      !handThrowScene &&
      !productExplode &&
      !clientPrompt &&
      (!imageOutputMode || imageOutputMode === "single" || imageOutputMode === "ab") &&
      shouldPlanSingleImageAd(promptMode, imageTextMode);
    if (wantSinglePlan) {
      singleImagePlan = await planSingleImageAd({
        visualStyleId: visualStyle as VisualStyleId,
        promotionMode,
        artStyleId,
        promptMarket,
        product: productName,
        business,
        headline,
        subline,
        offer,
        promptExtra,
        hasProductPhoto: hasProduct,
      });
    }

    const tokenCost = imageTokenCostFromRequest({
      numImages,
      imageOutputMode,
    });
    const charged = await chargeTokens(auth.user.userId, tokenCost, {
      kind: "image",
      mode: "generate",
      numImages,
      imageOutputMode,
    });
    if ("error" in charged) return charged.error;
    const balanceAfter = charged.balanceAfter;

    const plan = await getUserPlan(auth.user.userId);
    const requestedImageRes = (formData.get("resolution") as string | null)?.trim() || null;
    const { resolution: imageResolution } = clampImageResolution(plan, requestedImageRes);

    try {
      const imageUrls: string[] = [];
      if (strategy.sendPixelsToFal) {
        if (useReferenceConcept && dualImage) {
          imageUrls.push(
            ...(await buildFalLayoutTransferImageUrls({
              upload: (f) => fal.storage.upload(f),
              styleRef: hasStyle ? (styleRef as File) : null,
              productRef: hasProduct ? (reference as File) : null,
              productAngles: hasProduct ? productAngleFiles : [],
            })),
          );
        } else if (hasProduct) {
          imageUrls.push(await fal.storage.upload(reference as File));
          for (const angle of productAngleFiles) {
            imageUrls.push(await fal.storage.upload(angle));
          }
        } else if (hasStyle) {
          imageUrls.push(await fal.storage.upload(styleRef as File));
        }
      }
      if (motionPoster && posterFrame === "end" && startPlateUrl) {
        const plate = await mirrorImageUrlToFalStorage(startPlateUrl, {
          clerkId: auth.user.userId,
          refresh: true,
        });
        imageUrls.splice(0, imageUrls.length, plate);
      }
      if (socialDrip && socialDripFrame === "end" && startPlateUrl) {
        const plate = await mirrorImageUrlToFalStorage(startPlateUrl, {
          clerkId: auth.user.userId,
          refresh: true,
        });
        imageUrls.splice(0, imageUrls.length, plate);
      }
      if (
        ((vacuumInflate && vacuumInflateFrame === "end") ||
          (creativeMotion && creativeMotionFrame === "end") ||
          (handThrowScene && handThrowFrame === "end") ||
          (productExplode && productExplodeFrame === "end")) &&
        startPlateUrl
      ) {
        const plate = await mirrorImageUrlToFalStorage(startPlateUrl, {
          clerkId: auth.user.userId,
          refresh: true,
        });
        // Keep product ref if present; put start plate first for edit continuity.
        if (imageUrls.length > 0) {
          imageUrls.unshift(plate);
        } else {
          imageUrls.push(plate);
        }
      }

      // Social drip IG avatar: attach Brand kit logo when available (always for this path).
      let socialDripLogoImageIndex: number | undefined;
      if (socialDrip) {
        const logoSrc = brandKit?.logoUrl?.trim() || "";
        if (logoSrc) {
          try {
            const logoFal = await mirrorImageUrlToFalStorage(logoSrc, {
              clerkId: auth.user.userId,
              refresh: true,
            });
            imageUrls.push(logoFal);
            socialDripLogoImageIndex = imageUrls.length;
          } catch {
            socialDripLogoImageIndex = undefined;
          }
        }
      }

      const angleHint =
        useReferenceConcept && dualImage && hasProduct && hasStyle
          ? dualProductIdentityHint(productAngleFiles.length > 0)
          : hasProduct && productAngleFiles.length > 0
            ? dualProductIdentityHint(true)
            : "";

      const motionPosterDialectPick = parseMotionPosterDialectPick(
        formData.get("motion_poster_dialect"),
      );
      const builtPrompt = socialDrip && socialDripPlan
        ? buildSocialDripStillPrompt({
            plan: socialDripPlan,
            product:
              productName ||
              headline ||
              (promotionMode === "concept" ? "the service scene" : "the product"),
            conceptMode: promotionMode === "concept",
            aspectRatio: aspectRatioRaw,
            frame: socialDripFrame,
            brandLogoImageIndex: socialDripLogoImageIndex,
          })
        : vacuumInflate
        ? buildVacuumInflateStillPrompt({
            product:
              productName ||
              headline ||
              (promotionMode === "concept"
                ? "the uploaded brand mark"
                : "the uploaded product"),
            conceptMode: promotionMode === "concept",
            aspectRatio: aspectRatioRaw,
            frame: vacuumInflateFrame,
          })
        : creativeMotion
        ? buildCreativeMotionStillPrompt({
            scheme: creativeMotionScheme,
            product:
              productName ||
              headline ||
              (promotionMode === "concept" ? "brand mark" : "the product"),
            conceptMode: promotionMode === "concept",
            aspectRatio: aspectRatioRaw,
            frame: creativeMotionFrame,
          })
        : handThrowScene
        ? buildHandThrowSceneStillPrompt({
            product:
              productName ||
              headline ||
              (promotionMode === "concept"
                ? "brand landmark architecture"
                : "product landmark"),
            conceptMode: promotionMode === "concept",
            aspectRatio: aspectRatioRaw,
            frame: handThrowFrame,
          })
        : productExplode
        ? buildProductExplodeStillPrompt({
            product:
              productName ||
              headline ||
              (promotionMode === "concept" ? "brand device" : "the product"),
            conceptMode: promotionMode === "concept",
            aspectRatio: aspectRatioRaw,
            frame: productExplodeFrame,
          })
        : motionPoster
        ? posterFrame === "end"
          ? buildMotionPosterEndStillPrompt(vars, {
              conceptMode: promotionMode === "concept",
              dialect:
                motionPosterDialectPick === "auto" ? undefined : motionPosterDialectPick,
              aspectRatio: aspectRatioRaw,
            })
          : buildMotionPosterStillPrompt(vars, {
              conceptMode: promotionMode === "concept",
              dialect:
                motionPosterDialectPick === "auto" ? undefined : motionPosterDialectPick,
              aspectRatio: aspectRatioRaw,
            })
        : buildWizardImagePrompt(
            vars,
            promptMode,
            brandProfile,
            visualStyle as VisualStyleId,
            brandKit,
            {
              structuredReferenceBrief: Boolean(brief),
              aspectRatio: aspectRatioRaw,
              singleImagePlan,
              hasReferenceImage: hasProduct || hasStyle,
              referenceImageMode: strategy.referenceImageMode,
            },
          );
      // Prefer server-built prompt when we ran the single-still planner (teaching-quality DNA).
      // Honor explicit client prompts (e.g. storyboard scene regenerate) — do not replace with
      // a generic concept-cinematic rebuild that drops the scene action.
      const finalPrompt = [
        socialDrip ||
        motionPoster ||
        vacuumInflate ||
        creativeMotion ||
        handThrowScene ||
        productExplode
          ? builtPrompt
          : singleImagePlan
            ? builtPrompt
            : clientPrompt
              ? clientPrompt
              : builtPrompt,
        angleHint,
      ]
        .filter(Boolean)
        .join(" ");

      const result = await fal.subscribe(endpoint, {
        input: banana2Input(finalPrompt, imageUrls, aspectRatio, numImages, {
          systemPrompt: artStyleSystemPrompt(artStyleId, {
            textless: motionPoster && posterFrame !== "end",
          }),
          resolution: imageResolution,
        }),
        logs: true,
      });
      const outUrls = extractImageUrls(result.data);
      if (!outUrls.length) {
        await refundTokens(auth.user.userId, tokenCost, {
          kind: "image",
          mode: "generate",
          reason: "no_image",
        });
        return NextResponse.json(
          {
            error: "Image URL missing in model response.",
            raw: result.data,
          },
          { status: 502 },
        );
      }

      await trackUsage(auth.user.userId, "image");
      const archived = await archiveOutputUrls(request, outUrls, auth.user.userId);
      const durable = await persistAndDurablizeMany({
        clerkId: auth.user.userId,
        kind: "image",
        sourceUrls: outUrls,
        fallbackUrls: archived,
        prompt: finalPrompt.slice(0, 500),
      });
      return NextResponse.json({
        imageUrl: durable[0],
        imageUrls: durable,
        requestId: result.requestId,
        endpoint,
        mode: "edit",
        creativeMode: useReferenceConcept ? "reference-concept" : "promo-ai",
        imageCount: imageUrls.length,
        variantCount: durable.length,
        tokensCharged: tokenCost,
        creditBalance: balanceAfter,
      });
    } catch (e: unknown) {
      await refundTokens(auth.user.userId, tokenCost, {
        kind: "image",
        mode: "generate",
        reason: "generation_failed",
      });
      return NextResponse.json({ error: formatFalError(e) }, { status: 502 });
    }
  }

  const body = (await request.json().catch(() => null)) as
    | {
        prompt?: string;
        endpoint?: string;
        aspect_ratio?: string;
        num_images?: number;
        image_urls?: string[];
        mode?: string;
      }
    | null;
  const prompt = body?.prompt?.trim() || "";
  const endpoint = sanitizeImageEndpoint(body?.endpoint, defaultTextEndpoint());
  const apiMode = body?.mode?.trim();
  const isCompose = apiMode === "compose";
  const isRefine = apiMode === "refine" || (!isCompose && (body?.image_urls?.length ?? 0) > 0);
  const aspectRatio = aspectRatioForApi(
    body?.aspect_ratio?.trim() || (isRefine ? "auto" : "9:16"),
  );
  const numImages = Math.min(4, Math.max(1, body?.num_images ?? 1));
  const imageUrls = (body?.image_urls ?? []).filter(
    (u): u is string => typeof u === "string" && isHttpOrLibraryMediaUrl(u),
  );

  if (!prompt) {
    return NextResponse.json(
      { error: "Describe your product, or upload a photo on step 2." },
      { status: 400 },
    );
  }

  if (imageUrls.length > 0 && !endpoint.includes("/edit")) {
    return NextResponse.json(
      { error: "Image refine requires an edit endpoint (e.g. nano-banana-2/edit)." },
      { status: 400 },
    );
  }

  const jsonCost = imageTokenCostFromRequest({ numImages });

  if (imageUrls.length > 0) {
    const systemPrompt = isCompose
      ? IMAGE_CANVAS_COMPOSE_SYSTEM_PROMPT
      : IMAGE_REFINE_SYSTEM_PROMPT;
    return await runRefineEdit(request, {
      endpoint,
      prompt,
      aspectRatio,
      numImages,
      imageUrls,
      systemPrompt,
      userId: auth.user.userId,
      refineSources: imageUrls,
      tokenCost: jsonCost,
    });
  }

  const charged = await chargeTokens(auth.user.userId, jsonCost, {
    kind: "image",
    mode: "text",
  });
  if ("error" in charged) return charged.error;
  const balanceAfter = charged.balanceAfter;

  try {
    const result = await fal.subscribe(endpoint, {
      input: { prompt, aspect_ratio: aspectRatio, num_images: numImages },
      logs: true,
    });
    const outUrls = extractImageUrls(result.data);
    if (!outUrls.length) {
      await refundTokens(auth.user.userId, jsonCost, {
        kind: "image",
        mode: "text",
        reason: "no_image",
      });
      return NextResponse.json(
        {
          error:
            "Image URL missing in model response. Please try again.",
          raw: result.data,
        },
        { status: 502 },
      );
    }

    await trackUsage(auth.user.userId, "image");
    const archived = await archiveOutputUrls(request, outUrls, auth.user.userId);
    const durable = await persistAndDurablizeMany({
      clerkId: auth.user.userId,
      kind: "image",
      sourceUrls: outUrls,
      fallbackUrls: archived,
      prompt: prompt.slice(0, 500),
    });
    return NextResponse.json({
      imageUrl: durable[0],
      imageUrls: durable,
      requestId: result.requestId,
      endpoint,
      mode: "text",
      variantCount: durable.length,
      tokensCharged: jsonCost,
      creditBalance: balanceAfter,
    });
  } catch (e: unknown) {
    await refundTokens(auth.user.userId, jsonCost, {
      kind: "image",
      mode: "text",
      reason: "generation_failed",
    });
    return NextResponse.json({ error: formatFalError(e) }, { status: 502 });
  }
}
