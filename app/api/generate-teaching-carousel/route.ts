import { ApiError, fal } from "@fal-ai/client";
import { NextResponse } from "next/server";
import { requireAppUser, trackUsage } from "@/lib/require-app-user";
import { defaultEditEndpoint, defaultTextEndpoint } from "@/lib/image-endpoints";
import {
  buildPromptVariables,
  buildTeachingCarouselSlideImagePrompt,
  resolveImagePromptMode,
  type PromptMarket,
  type SubjectFraming,
} from "@/lib/prompt-variables";
import { DEFAULT_TEACHING_CAROUSEL_SLIDE_COUNT, MAX_TEACHING_CAROUSEL_SLIDE_COUNT } from "@/lib/teaching-carousel-types";
import { planTeachingCarousel } from "@/lib/teaching-carousel-plan";
import { isPromotionMode } from "@/lib/promotion-mode";
import {
  parseStrategyFromFormData,
  referenceStrategyPromptBlock,
} from "@/lib/reference-strategy";
import type { VisualStyleId } from "@/lib/visual-styles";
import { artStyleSystemPrompt, resolveArtStyleId } from "@/lib/art-style";

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
    "hk") as PromptMarket;
  const subjectFraming = ((formData.get("subject_framing") as string | null)?.trim() ||
    "auto") as SubjectFraming;
  const aspectRatio = aspectRatioForApi(
    (formData.get("aspect_ratio") as string | null)?.trim() || "4:5",
  );
  const reference = formData.get("reference_image");
  const styleRef = formData.get("style_reference_image");
  const hasProduct = reference instanceof File && reference.size > 0;
  const hasStyle = styleRef instanceof File && styleRef.size > 0;
  const { strategy, brief } = parseStrategyFromFormData(formData);
  const strategyBlock = brief ? referenceStrategyPromptBlock(brief, strategy) : "";
  const carouselRefs = formData
    .getAll("carousel_reference_images")
    .filter((f): f is File => f instanceof File && f.size > 0);
  const carouselExtra =
    carouselRefs.length > 0
      ? `Reference carousel has ${1 + carouselRefs.length} slides in order — match palette, typography rhythm, and pacing (style-only; distinct layout per output slide).`
      : "";
  const promptExtra = [promptExtraRaw, strategyBlock, carouselExtra].filter(Boolean).join(" | ");
  const referenceImageMode = strategy.referenceImageMode;
  const endpoint =
    (formData.get("endpoint") as string | null)?.trim() ||
    (strategy.sendPixelsToFal ? defaultEditEndpoint() : defaultTextEndpoint());
  const slideCount = Math.min(
    MAX_TEACHING_CAROUSEL_SLIDE_COUNT,
    Math.max(DEFAULT_TEACHING_CAROUSEL_SLIDE_COUNT, Number(formData.get("slide_count") || DEFAULT_TEACHING_CAROUSEL_SLIDE_COUNT)),
  );
  const systemPrompt = artStyleSystemPrompt(artStyleId);

  try {
    const plan = await planTeachingCarousel({
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
    });
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
      imageUrlsForFal = [];
      if (strategy.useDualImage && hasStyle && hasProduct) {
        imageUrlsForFal.push(await fal.storage.upload(styleRef as File));
        imageUrlsForFal.push(await fal.storage.upload(reference as File));
      } else if (hasProduct) {
        imageUrlsForFal.push(await fal.storage.upload(reference as File));
      } else if (hasStyle) {
        imageUrlsForFal.push(await fal.storage.upload(styleRef as File));
      }
    }

    const slides: Array<{
      role: string;
      title: string;
      headline: string;
      subline: string;
      imageUrl: string;
    }> = [];

    for (const slide of plan.slides) {
      const prompt = buildTeachingCarouselSlideImagePrompt(
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
        },
      );

      const result = await fal.subscribe(endpoint, {
        input: {
          prompt,
          ...(imageUrlsForFal?.length ? { image_urls: imageUrlsForFal } : {}),
          aspect_ratio: aspectRatio,
          num_images: 1,
          resolution: "1K" as const,
          limit_generations: true,
          ...(systemPrompt ? { system_prompt: systemPrompt } : {}),
        },
        logs: true,
      });
      const outUrls = extractImageUrls(result.data);
      if (!outUrls[0]) {
        return NextResponse.json(
          { error: `Image URL missing for slide ${slide.index}.`, raw: result.data },
          { status: 502 },
        );
      }
      slides.push({
        role: slide.role,
        title: slide.title,
        headline: slide.title,
        subline: slide.body,
        imageUrl: outUrls[0],
      });
    }

    await trackUsage(auth.user.userId, "campaign");
    return NextResponse.json({
      plan,
      slides,
      imageUrl: slides[0]?.imageUrl,
      imageUrls: slides.map((s) => s.imageUrl),
      endpoint,
      mode: "teaching-carousel",
      slideCount: slides.length,
      artStyle: artStyleId,
      referenceMode: referenceImageMode,
      referenceStrategy: strategy.kind,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : formatFalError(e);
    const status =
      message.includes("DEEPSEEK_API_KEY") || message.includes("DeepSeek API") || message.includes("balance")
        ? 503
        : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
