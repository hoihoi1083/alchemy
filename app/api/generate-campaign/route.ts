import { ApiError, fal } from "@fal-ai/client";
import { NextResponse } from "next/server";
import { chargeTokens, refundTokens } from "@/lib/billing/charge";
import { clampImageResolution } from "@/lib/billing/entitlements";
import { getUserPlan } from "@/lib/billing/get-user-plan";
import { planMeetsMinimum } from "@/lib/billing/plan-gates";
import { TOKEN_COST } from "@/lib/billing/token-costs";
import { requireAppUser, trackUsage } from "@/lib/require-app-user";
import {
  buildFalLayoutTransferImageUrls,
  carouselCoverSeriesAnchorHint,
  carouselSlideRoleVariationHint,
  carouselUniqueCopyHint,
  dualProductIdentityHint,
} from "@/lib/fal-dual-reference-urls";
import type { BrandProfile } from "@/lib/brand-profile";
import type { CampaignPlan, CampaignSlidePlan } from "@/lib/campaign-types";
import { planCampaign } from "@/lib/campaign-plan";
import { parseBrandKit, type BrandKit } from "@/lib/brand-kit";
import { defaultEditEndpoint, defaultTextEndpoint, sanitizeImageEndpoint } from "@/lib/image-endpoints";
import { persistAndDurablizeMany } from "@/lib/storage/durable-media";
import {
  parseStrategyFromFormData,
  referenceStrategyPromptBlock,
} from "@/lib/reference-strategy";
import { ensureOptimizedSceneEssay } from "@/lib/optimize-reference-scene-prompt";
import {
  buildCampaignSlideImagePrompt,
  buildPromptVariables,
  resolveImagePromptMode,
  type PromptMarket,
  type SubjectFraming,
} from "@/lib/prompt-variables";
import type { VisualStyleId } from "@/lib/visual-styles";
import { artStyleSystemPrompt, resolveArtStyleId } from "@/lib/art-style";
import { archiveCampaignSlidesToPipeline } from "@/lib/pipeline/archive-image";

export const runtime = "nodejs";
export const maxDuration = 300;

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
  return [];
}

function formatFalError(e: unknown): string {
  if (e instanceof ApiError) {
    return `${e.message}${e.requestId ? ` (fal request: ${e.requestId})` : ""}`;
  }
  if (e && typeof e === "object" && "message" in e) {
    return String((e as { message: unknown }).message);
  }
  return "Campaign image generation failed";
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

function parseExistingCampaignPlan(raw: string): CampaignPlan | null {
  if (!raw.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as CampaignPlan;
    if (!parsed || !Array.isArray(parsed.slides) || parsed.slides.length < 1) return null;
    const slides = parsed.slides
      .map((s, i): CampaignSlidePlan | null => {
        if (!s || typeof s !== "object") return null;
        const role =
          s.role === "hero" || s.role === "selling-points" || s.role === "offer"
            ? s.role
            : (["hero", "selling-points", "offer"] as const)[i] ?? "hero";
        return {
          role,
          title: String(s.title ?? "").trim() || role,
          headline: String(s.headline ?? "").trim(),
          subline: String(s.subline ?? "").trim(),
          composition: String(s.composition ?? "").trim(),
        };
      })
      .filter((s): s is CampaignSlidePlan => Boolean(s));
    if (!slides.length) return null;
    return {
      theme: String(parsed.theme ?? "").trim(),
      visualDna: String(parsed.visualDna ?? "").trim(),
      slides,
    };
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;

  const userPlan = await getUserPlan(auth.user.userId);
  if (!planMeetsMinimum(userPlan, "standard")) {
    return NextResponse.json(
      {
        error: "Campaign mode requires Standard plan or above.",
        code: "PLAN_ENTITLEMENT",
        requiredPlan: "standard",
        hint: "campaign_needs_standard",
      },
      { status: 403 },
    );
  }

  const key = process.env.FAL_KEY?.trim();
  if (!key) {
    return NextResponse.json(
      { error: "Campaign generation is temporarily unavailable. Please try again later." },
      { status: 503 },
    );
  }
  fal.config({ credentials: key });

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const reference = formData.get("reference_image");
  const styleRef = formData.get("style_reference_image");
  const hasProduct = reference instanceof File && reference.size > 0;
  const hasStyle = styleRef instanceof File && styleRef.size > 0;
  const productAngleFiles = formData
    .getAll("product_angle_images")
    .filter((f): f is File => f instanceof File && f.size > 0)
    .slice(0, 4);
  const creativeMode =
    (formData.get("image_creative_mode") as string | null)?.trim() || "promo-ai";
  const { strategy, brief: parsedBrief } = parseStrategyFromFormData(formData);
  const useReferenceConcept = strategy.useReferenceConceptPrompts;
  const dualImage = strategy.useDualImage;
  const promotionMode = ((formData.get("promotion_mode") as string | null)?.trim() ||
    "physical") as "physical" | "concept";

  if (creativeMode === "reference-concept" && strategy.kind === "layout-transfer" && !dualImage) {
    return NextResponse.json(
      {
        error:
          "Reference concept needs both a product photo and a reference ad image (JPG/PNG).",
      },
      { status: 400 },
    );
  }

  const visualStyle = ((formData.get("visual_style") as string | null)?.trim() ||
    "product") as VisualStyleId;
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
  let brandKit: BrandKit | null = null;
  if (brandKitRaw) {
    try {
      brandKit = parseBrandKit(JSON.parse(brandKitRaw));
    } catch {
      return NextResponse.json({ error: "Invalid brand kit data." }, { status: 400 });
    }
  }

  const productName = (formData.get("product_name") as string | null)?.trim() || "";
  const business = (formData.get("business") as string | null)?.trim() || "";
  const headline = (formData.get("headline") as string | null)?.trim() || "";
  const subline = (formData.get("subline") as string | null)?.trim() || "";
  const offer = (formData.get("offer") as string | null)?.trim() || "";
  const campaignTheme = (formData.get("campaign_theme") as string | null)?.trim() || "";
  const promptMarket = ((formData.get("prompt_market") as string | null)?.trim() ||
    "en") as PromptMarket;
  const subjectFraming = ((formData.get("subject_framing") as string | null)?.trim() ||
    "auto") as SubjectFraming;
  const promptExtraRaw = (formData.get("prompt_extra") as string | null)?.trim() || "";
  let brief = parsedBrief;
  if (strategy.kind === "layout-transfer" && brief && (productName || headline)) {
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
  const strategyBlock = brief ? referenceStrategyPromptBlock(brief, strategy) : "";
  const promptExtra = [promptExtraRaw, strategyBlock].filter(Boolean).join(" | ");
  const aspectRatio = aspectRatioForApi(
    (formData.get("aspect_ratio") as string | null)?.trim() || "9:16",
  );
  const endpoint = sanitizeImageEndpoint(
    formData.get("endpoint") as string | null,
    strategy.sendPixelsToFal ? defaultEditEndpoint() : defaultTextEndpoint(),
  );

  const artStyleId = resolveArtStyleId((formData.get("art_style") as string | null)?.trim());
  const systemPrompt = artStyleSystemPrompt(artStyleId);

  const regenerateSlideRaw = (formData.get("slide_index") as string | null)?.trim() ?? "";
  const regenerateSlideIndex =
    regenerateSlideRaw === "" ? null : Number.parseInt(regenerateSlideRaw, 10);
  const existingPlan = parseExistingCampaignPlan(
    (formData.get("existing_plan") as string | null)?.trim() || "",
  );
  const seriesCoverUrl =
    (formData.get("series_cover_url") as string | null)?.trim() || "";
  const isSingleSlideRegen =
    regenerateSlideIndex != null &&
    Number.isInteger(regenerateSlideIndex) &&
    regenerateSlideIndex >= 0 &&
    Boolean(existingPlan?.slides[regenerateSlideIndex]);

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
  });

  const promptMode = resolveImagePromptMode(
    visualStyle,
    useReferenceConcept ? "reference-concept" : "promo-ai",
    { promotionMode, workflowMode: "image-only" },
  );

  const tokenCost = isSingleSlideRegen ? TOKEN_COST.image : TOKEN_COST.campaign;
  const requestedImageRes =
    (formData.get("resolution") as string | null)?.trim() || null;
  const { resolution: imageResolution } = clampImageResolution(
    userPlan,
    requestedImageRes,
  );

  let plan: CampaignPlan;
  try {
    plan = isSingleSlideRegen
      ? existingPlan!
      : await planCampaign({
          visualStyleId: visualStyle,
          campaignTheme,
          product: productName,
          business,
          headline,
          subline,
          offer,
          brandProfile,
          promotionMode,
          hasReferenceLayout: strategy.useDualImage,
          hasProductPhoto: hasProduct,
          referenceStrategyKind:
            strategy.kind === "layout-transfer"
              ? "layout-transfer"
              : strategy.kind === "style-only"
                ? "style-only"
                : "none",
          promptExtra,
        });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Campaign planning failed.";
    const status =
      message.includes("DEEPSEEK_API_KEY") ||
      message.includes("DeepSeek API") ||
      message.includes("balance")
        ? 503
        : 400;
    return NextResponse.json({ error: message }, { status });
  }

  const charged = await chargeTokens(auth.user.userId, tokenCost, {
    kind: isSingleSlideRegen ? "image" : "campaign",
  });
  if ("error" in charged) return charged.error;
  const balanceAfter = charged.balanceAfter;

  try {
    let baseImageUrlsForFal: string[] | null = null;
    if (strategy.sendPixelsToFal) {
      if (strategy.useDualImage && dualImage) {
        baseImageUrlsForFal = await buildFalLayoutTransferImageUrls({
          upload: (f) => fal.storage.upload(f),
          styleRef: hasStyle ? (styleRef as File) : null,
          productRef: hasProduct ? (reference as File) : null,
          productAngles: hasProduct ? productAngleFiles : [],
        });
      } else {
        baseImageUrlsForFal = [];
        if (hasProduct) {
          baseImageUrlsForFal.push(await fal.storage.upload(reference as File));
          for (const angle of productAngleFiles) {
            baseImageUrlsForFal.push(await fal.storage.upload(angle));
          }
        } else if (hasStyle) {
          baseImageUrlsForFal.push(await fal.storage.upload(styleRef as File));
        }
      }
    }

    const dualHint =
      strategy.useDualImage && dualImage && hasProduct && hasStyle
        ? dualProductIdentityHint(productAngleFiles.length > 0)
        : "";
    const modelWear = promptMode === "model-wear";

    type SlideOut = {
      role: string;
      title: string;
      headline: string;
      subline: string;
      imageUrl: string;
    };

    function slideHints(
      slide: (typeof plan.slides)[number],
      i: number,
      extras: string[] = [],
    ): string[] {
      return [
        dualHint,
        ...extras,
        carouselUniqueCopyHint({
          index: i + 1,
          role: slide.role,
          title: slide.headline,
          body: slide.subline,
        }),
        carouselSlideRoleVariationHint({
          role: slide.role,
          index: i + 1,
          total: plan.slides.length,
          modelWear,
        }),
      ];
    }

    async function generateOneSlide(
      slide: (typeof plan.slides)[number],
      i: number,
      urls: string[] | null,
      extraHints: string[],
    ): Promise<SlideOut> {
      const prompt = [
        buildCampaignSlideImagePrompt(
          vars,
          slide,
          plan,
          promptMode,
          brandProfile,
          i,
          plan.slides.length,
          hasProduct || hasStyle,
          {
            visualStyleId: visualStyle,
            referenceConcept: strategy.useReferenceConceptPrompts,
            referenceImageMode: strategy.referenceImageMode,
            brandKit,
            hasProductPhoto: hasProduct,
            productName: productName,
          },
        ),
        ...extraHints,
      ]
        .filter(Boolean)
        .join("\n");

      const result = await fal.subscribe(endpoint, {
        input: {
          prompt,
          ...(urls?.length ? { image_urls: urls } : {}),
          aspect_ratio: aspectRatio,
          num_images: 1,
          resolution: imageResolution,
          limit_generations: true,
          ...(systemPrompt ? { system_prompt: systemPrompt } : {}),
        },
        logs: true,
      });

      const outUrls = extractImageUrls(result.data);
      if (!outUrls[0]) {
        throw new Error(`Image URL missing for slide ${i + 1}.`);
      }

      return {
        role: slide.role,
        title: slide.title,
        headline: slide.headline,
        subline: slide.subline,
        imageUrl: outUrls[0],
      };
    }

    if (isSingleSlideRegen) {
      const target = plan.slides[regenerateSlideIndex!]!;
      const urls =
        regenerateSlideIndex! > 0 &&
        seriesCoverUrl.startsWith("http") &&
        baseImageUrlsForFal?.length
          ? [...baseImageUrlsForFal, seriesCoverUrl]
          : baseImageUrlsForFal;
      const hints = slideHints(target, regenerateSlideIndex!, [
        regenerateSlideIndex! > 0 && seriesCoverUrl.startsWith("http")
          ? carouselCoverSeriesAnchorHint({
              hasProductPhoto: hasProduct,
              pixelAnchor: true,
            })
          : "",
      ]);
      const one = await generateOneSlide(target, regenerateSlideIndex!, urls, hints);
      const durableUrls = await persistAndDurablizeMany({
        clerkId: auth.user.userId,
        kind: "image",
        sourceUrls: [one.imageUrl],
        fallbackUrls: [one.imageUrl],
        prompt: `campaign-slide-${regenerateSlideIndex! + 1}`,
      });
      const imageUrl = durableUrls[0] ?? one.imageUrl;
      await trackUsage(auth.user.userId, "image");
      return NextResponse.json({
        plan,
        slideIndex: regenerateSlideIndex,
        slide: {
          role: one.role,
          title: one.title,
          headline: one.headline,
          subline: one.subline,
          imageUrl,
        },
        imageUrl,
        endpoint,
        mode: "campaign-slide",
        tokensCharged: tokenCost,
        creditBalance: balanceAfter,
      });
    }

    let slides: SlideOut[];
    if (baseImageUrlsForFal?.length && plan.slides.length > 1) {
      const coverOut = await generateOneSlide(
        plan.slides[0]!,
        0,
        baseImageUrlsForFal,
        slideHints(plan.slides[0]!, 0),
      );
      const anchoredUrls = [...baseImageUrlsForFal, coverOut.imageUrl];
      const coverHint = carouselCoverSeriesAnchorHint({
        hasProductPhoto: hasProduct,
        pixelAnchor: true,
      });
      const restOut = await Promise.all(
        plan.slides.slice(1).map((slide, offset) =>
          generateOneSlide(
            slide,
            offset + 1,
            anchoredUrls,
            slideHints(slide, offset + 1, [coverHint]),
          ),
        ),
      );
      slides = [coverOut, ...restOut];
    } else {
      slides = await Promise.all(
        plan.slides.map((slide, i) =>
          generateOneSlide(
            slide,
            i,
            baseImageUrlsForFal ? [...baseImageUrlsForFal] : null,
            slideHints(slide, i),
          ),
        ),
      );
    }

    const falUrls = slides.map((s) => s.imageUrl);
    const archivedUrls = await archiveCampaignSlidesToPipeline(
      request,
      falUrls,
      auth.user.userId,
    );
    const durableUrls = await persistAndDurablizeMany({
      clerkId: auth.user.userId,
      kind: "image",
      sourceUrls: falUrls,
      fallbackUrls: archivedUrls.length === falUrls.length ? archivedUrls : falUrls,
      prompt: productName.slice(0, 200) || "campaign",
    });
    const archivedSlides = slides.map((slide, index) => ({
      ...slide,
      imageUrl: durableUrls[index] ?? archivedUrls[index] ?? slide.imageUrl,
    }));

    const imageUrls = archivedSlides.map((s) => s.imageUrl);
    await trackUsage(auth.user.userId, "campaign");
    return NextResponse.json({
      plan,
      slides: archivedSlides,
      imageUrl: imageUrls[0],
      imageUrls,
      endpoint,
      mode: "campaign",
      slideCount: archivedSlides.length,
      tokensCharged: tokenCost,
      creditBalance: balanceAfter,
    });
  } catch (e: unknown) {
    await refundTokens(auth.user.userId, tokenCost, {
      kind: isSingleSlideRegen ? "image" : "campaign",
      reason: "generation_failed",
    });
    return NextResponse.json({ error: formatFalError(e) }, { status: 502 });
  }
}
