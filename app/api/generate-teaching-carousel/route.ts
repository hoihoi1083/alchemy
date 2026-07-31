import { ApiError, fal } from "@fal-ai/client";
import { NextResponse } from "next/server";
import { chargeTokens, refundTokens } from "@/lib/billing/charge";
import { clampImageResolution } from "@/lib/billing/entitlements";
import { getUserPlan } from "@/lib/billing/get-user-plan";
import { estimateTeachingCarouselTokens, TOKEN_COST } from "@/lib/billing/token-costs";
import { requireAppUser, trackUsage } from "@/lib/require-app-user";
import {
  buildFalLayoutTransferImageUrls,
  carouselCoverSeriesAnchorHint,
  dualProductIdentityHint,
} from "@/lib/fal-dual-reference-urls";
import { defaultEditEndpoint, defaultTextEndpoint, sanitizeImageEndpoint } from "@/lib/image-endpoints";
import { persistAndDurablizeMany } from "@/lib/storage/durable-media";
import {
  buildPromptVariables,
  buildTeachingCarouselSlideImagePrompt,
  resolveImagePromptMode,
  type PromptMarket,
  type SubjectFraming,
} from "@/lib/prompt-variables";
import {
  DEFAULT_TEACHING_CAROUSEL_SLIDE_COUNT,
  MAX_TEACHING_CAROUSEL_SLIDE_COUNT,
  MIN_TEACHING_CAROUSEL_SLIDE_COUNT,
  type TeachingCarouselPlan,
  type TeachingCarouselSlide,
} from "@/lib/teaching-carousel-types";
import { planTeachingCarousel } from "@/lib/teaching-carousel-plan";
import { isPromotionMode } from "@/lib/promotion-mode";
import { parseBrandKit, type BrandKit } from "@/lib/brand-kit";
import {
  parseStrategyFromFormData,
  referenceStrategyPromptBlock,
} from "@/lib/reference-strategy";
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
  return "Teaching carousel generation failed";
}

function aspectRatioForApi(ratio: string): string {
  const map: Record<string, string> = { "9:16": "9:16", "1:1": "1:1", "4:5": "4:5" };
  return map[ratio] ?? "4:5";
}

function parseExistingTeachingPlan(raw: string): TeachingCarouselPlan | null {
  try {
    const parsed = JSON.parse(raw) as Partial<TeachingCarouselPlan>;
    if (!parsed || !Array.isArray(parsed.slides) || parsed.slides.length === 0) return null;
    const slides: TeachingCarouselSlide[] = parsed.slides.map((s, i) => {
      const row = s as TeachingCarouselSlide & { subline?: string; headline?: string };
      const role =
        row.role === "cover" || row.role === "summary" || row.role === "point"
          ? row.role
          : i === 0
            ? "cover"
            : i === parsed.slides!.length - 1
              ? "summary"
              : "point";
      return {
        index: Number(row.index) || i + 1,
        role,
        title: String(row.title ?? row.headline ?? "").trim() || `Slide ${i + 1}`,
        body: String(row.body ?? row.subline ?? "").trim(),
        takeaway: String(row.takeaway ?? "").trim(),
        composition: String(row.composition ?? "").trim(),
      };
    });
    return {
      theme: String(parsed.theme ?? "").trim() || "教學輪播",
      visualDna: String(parsed.visualDna ?? "").trim() || "consistent educational carousel",
      slides,
    };
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;

  const key = process.env.FAL_KEY?.trim();
  if (!key) {
    return NextResponse.json(
      { error: "Teaching carousel generation is temporarily unavailable. Please try again later." },
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

  const visualStyle = ((formData.get("visual_style") as string | null)?.trim() ||
    "info-poster") as VisualStyleId;
  const artStyleId = resolveArtStyleId((formData.get("art_style") as string | null)?.trim());
  const promotionModeRaw = (formData.get("promotion_mode") as string | null)?.trim() || "";
  const promotionMode = isPromotionMode(promotionModeRaw) ? promotionModeRaw : "physical";
  const product = (formData.get("product_name") as string | null)?.trim() || "";
  const business = (formData.get("business") as string | null)?.trim() || "";
  const headline = (formData.get("headline") as string | null)?.trim() || "";
  const subline = (formData.get("subline") as string | null)?.trim() || "";
  const offer = (formData.get("offer") as string | null)?.trim() || "";
  const promptExtraRaw = (formData.get("prompt_extra") as string | null)?.trim() || "";
  const promptMarket = ((formData.get("prompt_market") as string | null)?.trim() ||
    "en") as PromptMarket;
  const subjectFraming = ((formData.get("subject_framing") as string | null)?.trim() ||
    "auto") as SubjectFraming;
  const aspectRatio = aspectRatioForApi(
    (formData.get("aspect_ratio") as string | null)?.trim() || "4:5",
  );
  const brandKitRaw = (formData.get("brand_kit") as string | null)?.trim() || "";
  let brandKit: BrandKit | null = null;
  if (brandKitRaw) {
    try {
      brandKit = parseBrandKit(JSON.parse(brandKitRaw));
    } catch {
      return NextResponse.json({ error: "Invalid brand kit data." }, { status: 400 });
    }
  }
  const reference = formData.get("reference_image");
  const styleRef = formData.get("style_reference_image");
  const hasProduct = reference instanceof File && reference.size > 0;
  const hasStyle = styleRef instanceof File && styleRef.size > 0;
  const { strategy, brief } = parseStrategyFromFormData(formData);
  const strategyBlock = brief ? referenceStrategyPromptBlock(brief, strategy) : "";
  // Do not treat product_angle_images as research carousel panels — kit is user product detail only.
  const carouselRefs = formData
    .getAll("carousel_reference_images")
    .filter((f): f is File => f instanceof File && f.size > 0)
    .slice(0, 5);
  const productAngleFiles = formData
    .getAll("product_angle_images")
    .filter((f): f is File => f instanceof File && f.size > 0)
    .slice(0, 4);
  const carouselExtra =
    carouselRefs.length > 0
      ? strategy.kind === "layout-transfer"
        ? `Reference carousel has ${1 + carouselRefs.length} slides in order — mirror palette, typography rhythm, and layout grid family from IMAGE 2 style reference; each output slide maps to one reference panel/row where possible. IMAGE 1 remains the user product hero on every slide.`
        : `Reference carousel has ${1 + carouselRefs.length} slides in order — match palette, typography rhythm, and pacing (style-only; distinct layout per output slide).`
      : "";
  const promptExtra = [promptExtraRaw, strategyBlock, carouselExtra].filter(Boolean).join(" | ");
  const referenceImageMode = strategy.referenceImageMode;
  const endpoint = sanitizeImageEndpoint(
    formData.get("endpoint") as string | null,
    strategy.sendPixelsToFal ? defaultEditEndpoint() : defaultTextEndpoint(),
  );
  const slideCount = Math.min(
    MAX_TEACHING_CAROUSEL_SLIDE_COUNT,
    Math.max(
      MIN_TEACHING_CAROUSEL_SLIDE_COUNT,
      Number(formData.get("slide_count") || DEFAULT_TEACHING_CAROUSEL_SLIDE_COUNT),
    ),
  );
  const systemPrompt = artStyleSystemPrompt(artStyleId);

  const regenerateSlideRaw = (formData.get("slide_index") as string | null)?.trim() ?? "";
  const regenerateSlideIndex =
    regenerateSlideRaw === "" ? null : Number.parseInt(regenerateSlideRaw, 10);
  const existingPlan = parseExistingTeachingPlan(
    (formData.get("existing_plan") as string | null)?.trim() || "",
  );
  const seriesCoverUrl =
    (formData.get("series_cover_url") as string | null)?.trim() || "";
  const isSingleSlideRegen =
    regenerateSlideIndex != null &&
    Number.isInteger(regenerateSlideIndex) &&
    regenerateSlideIndex >= 0 &&
    Boolean(existingPlan?.slides[regenerateSlideIndex]);

  const tokenCost = isSingleSlideRegen
    ? TOKEN_COST.image
    : estimateTeachingCarouselTokens(slideCount);
  const { resolution: imageResolution } = clampImageResolution(
    await getUserPlan(auth.user.userId),
  );

  let chargedBalance: number | null | undefined;
  try {
    const plan: TeachingCarouselPlan = isSingleSlideRegen
      ? existingPlan!
      : await planTeachingCarousel({
          visualStyleId: visualStyle,
          promotionMode,
          artStyleId,
          promptMarket: promptMarket,
          product,
          business,
          headline,
          subline,
          offer,
          promptExtra,
          slideCount,
          hasProductPhoto: hasProduct,
          referenceStrategyKind:
            strategy.kind === "layout-transfer"
              ? "layout-transfer"
              : strategy.kind === "style-only"
                ? "style-only"
                : "none",
          carouselSlides: brief?.carouselSlides,
        });

    const charged = await chargeTokens(auth.user.userId, tokenCost, {
      kind: isSingleSlideRegen ? "image" : "teaching_carousel",
    });
    if ("error" in charged) return charged.error;
    chargedBalance = charged.balanceAfter;
    const balanceAfter = charged.balanceAfter;

    const vars = buildPromptVariables({
      product,
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
      strategy.useReferenceConceptPrompts ? "reference-concept" : "promo-ai",
      { promotionMode, workflowMode: "image-only" },
    );

    let imageUrlsForFal: string[] | null = null;
    if (strategy.sendPixelsToFal) {
      if (strategy.useDualImage && hasStyle && hasProduct) {
        imageUrlsForFal = await buildFalLayoutTransferImageUrls({
          upload: (f) => fal.storage.upload(f),
          styleRef: styleRef as File,
          productRef: reference as File,
          productAngles: productAngleFiles,
        });
      } else {
        imageUrlsForFal = [];
        if (hasProduct) {
          imageUrlsForFal.push(await fal.storage.upload(reference as File));
          for (const angle of productAngleFiles) {
            imageUrlsForFal.push(await fal.storage.upload(angle));
          }
        } else if (hasStyle) {
          imageUrlsForFal.push(await fal.storage.upload(styleRef as File));
        }
        if (!imageUrlsForFal.length) imageUrlsForFal = null;
      }
    }

    const dualHint =
      strategy.useDualImage && hasStyle && hasProduct
        ? dualProductIdentityHint(productAngleFiles.length > 0)
        : "";

    type SlideOut = {
      role: string;
      title: string;
      headline: string;
      subline: string;
      imageUrl: string;
      index: number;
    };

    async function generateOneSlide(
      slide: TeachingCarouselSlide,
      urls: string[] | null,
      extraHints: string[],
    ): Promise<SlideOut> {
      const carouselSlideRef = brief?.carouselSlides?.[slide.index - 1];
      const prompt = [
        buildTeachingCarouselSlideImagePrompt(
          vars,
          plan,
          slide,
          plan.slides.length,
          promptMode,
          null,
          referenceImageMode,
          {
            visualStyleId: visualStyle,
            referenceConcept: strategy.useReferenceConceptPrompts,
            carouselSlideRef,
            brandKit,
            hasProductPhoto: hasProduct,
            productName: product,
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
        throw new Error(`Image URL missing for slide ${slide.index}.`);
      }
      return {
        index: slide.index,
        role: slide.role,
        title: slide.title,
        headline: slide.title,
        subline: slide.body,
        imageUrl: outUrls[0],
      };
    }

    if (isSingleSlideRegen) {
      const target = plan.slides[regenerateSlideIndex!]!;
      const urls =
        regenerateSlideIndex! > 0 && seriesCoverUrl.startsWith("http") && imageUrlsForFal?.length
          ? [...imageUrlsForFal, seriesCoverUrl]
          : imageUrlsForFal;
      const hints = [
        dualHint,
        regenerateSlideIndex! > 0 && seriesCoverUrl.startsWith("http")
          ? carouselCoverSeriesAnchorHint()
          : "",
      ];
      const one = await generateOneSlide(target, urls, hints);
      const durableUrls = await persistAndDurablizeMany({
        clerkId: auth.user.userId,
        kind: "image",
        sourceUrls: [one.imageUrl],
        fallbackUrls: [one.imageUrl],
        prompt: `teaching-carousel-slide-${regenerateSlideIndex! + 1}`,
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
        mode: "teaching-carousel-slide",
        tokensCharged: tokenCost,
        creditBalance: balanceAfter,
      });
    }

    const ordered = [...plan.slides].sort((a, b) => a.index - b.index);
    const coverSlide = ordered[0];
    const restSlides = ordered.slice(1);

    // Cover first when we have product pixels — later slides see cover as a series
    // anchor so tip cards stop inventing mascots / wrong jewelry colors independently.
    let slideResults: SlideOut[];
    if (hasProduct && imageUrlsForFal?.length && coverSlide && restSlides.length > 0) {
      const coverOut = await generateOneSlide(coverSlide, imageUrlsForFal, [dualHint]);
      const anchoredUrls = [...imageUrlsForFal, coverOut.imageUrl];
      const coverHint = carouselCoverSeriesAnchorHint();
      const restOut = await Promise.all(
        restSlides.map((slide) => generateOneSlide(slide, anchoredUrls, [dualHint, coverHint])),
      );
      slideResults = [coverOut, ...restOut].sort((a, b) => a.index - b.index);
    } else {
      slideResults = await Promise.all(
        ordered.map((slide) => generateOneSlide(slide, imageUrlsForFal, [dualHint])),
      );
    }
    const slides = slideResults.map(({ index: _i, ...rest }) => rest);

    const falUrls = slides.map((s) => s.imageUrl);
    const archivedUrls = await archiveCampaignSlidesToPipeline(request, falUrls);
    const durableUrls = await persistAndDurablizeMany({
      clerkId: auth.user.userId,
      kind: "image",
      sourceUrls: falUrls,
      fallbackUrls: archivedUrls.length === falUrls.length ? archivedUrls : falUrls,
      prompt: "teaching-carousel",
    });
    const archivedSlides = slides.map((slide, index) => ({
      ...slide,
      imageUrl: durableUrls[index] ?? archivedUrls[index] ?? slide.imageUrl,
    }));

    await trackUsage(auth.user.userId, "campaign");
    return NextResponse.json({
      plan,
      slides: archivedSlides,
      imageUrl: archivedSlides[0]?.imageUrl,
      imageUrls: archivedSlides.map((s) => s.imageUrl),
      endpoint,
      mode: "teaching-carousel",
      slideCount: archivedSlides.length,
      artStyle: artStyleId,
      referenceMode: referenceImageMode,
      referenceStrategy: strategy.kind,
      tokensCharged: tokenCost,
      creditBalance: balanceAfter,
    });
  } catch (e: unknown) {
    if (chargedBalance !== undefined) {
      await refundTokens(auth.user.userId, tokenCost, {
        kind: isSingleSlideRegen ? "image" : "teaching_carousel",
        reason: "generation_failed",
      });
    }
    const message = e instanceof Error ? e.message : formatFalError(e);
    const status =
      message.includes("DEEPSEEK_API_KEY") || message.includes("DeepSeek API") || message.includes("balance")
        ? 503
        : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
