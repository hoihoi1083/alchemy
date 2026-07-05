import { ApiError, fal } from "@fal-ai/client";
import { NextResponse } from "next/server";
import { requireAppUser, trackUsage } from "@/lib/require-app-user";
import type { BrandProfile } from "@/lib/brand-profile";
import {
  buildPromptVariables,
  buildWizardImagePrompt,
  resolveImagePromptMode,
} from "@/lib/prompt-variables";
import type { PromptMarket, SubjectFraming } from "@/lib/prompt-variables";
import { defaultEditEndpoint, defaultTextEndpoint } from "@/lib/image-endpoints";
import {
  IMAGE_LOGO_REFINE_SYSTEM_PROMPT,
  IMAGE_REFINE_SYSTEM_PROMPT,
  buildLogoRefinePrompt,
  isSameImageAsset,
  type LogoPlacement,
} from "@/lib/image-refine-prompt";
import { IMAGE_CANVAS_COMPOSE_SYSTEM_PROMPT } from "@/lib/pro-canvas-compose";
import type { VisualStyleId } from "@/lib/visual-styles";
import type { PromotionMode } from "@/lib/promotion-mode";
import type { WorkflowMode } from "@/lib/workflow-mode";
import { isPromotionMode } from "@/lib/promotion-mode";
import {
  parseStrategyFromFormData,
  referenceStrategyPromptBlock,
} from "@/lib/reference-strategy";
import { resolveArtStyleId, artStyleSystemPrompt } from "@/lib/art-style";

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
  if (e instanceof ApiError) {
    return `${e.message}${e.requestId ? ` (fal request: ${e.requestId})` : ""}`;
  }
  if (e && typeof e === "object" && "message" in e) {
    return String((e as { message: unknown }).message);
  }
  return "Image generation failed";
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
  opts?: { limitGenerations?: boolean; systemPrompt?: string },
): Record<string, unknown> {
  const input: Record<string, unknown> = {
    prompt,
    image_urls: imageUrls,
    aspect_ratio: aspectRatio,
    num_images: numImages,
    resolution: "1K" as const,
    limit_generations: opts?.limitGenerations ?? true,
  };
  if (opts?.systemPrompt?.trim()) {
    input.system_prompt = opts.systemPrompt.trim();
  }
  return input;
}

async function mirrorImageToFalStorage(url: string): Promise<string> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Could not fetch source image for refine (${res.status}).`);
  }
  const contentType = res.headers.get("content-type")?.split(";")[0]?.trim() || "image/png";
  const bytes = await res.arrayBuffer();
  const file = new File([bytes], "refine-source.png", { type: contentType });
  return fal.storage.upload(file);
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

async function runRefineEdit(opts: {
  endpoint: string;
  prompt: string;
  aspectRatio: string;
  numImages: number;
  imageUrls: string[];
  systemPrompt: string;
  userId: string;
  refineSources: string[];
}): Promise<NextResponse> {
  const hostedUrls = await Promise.all(opts.imageUrls.map((url) => mirrorImageToFalStorage(url)));
  const result = await fal.subscribe(opts.endpoint, {
    input: {
      ...banana2Input(opts.prompt, hostedUrls, opts.aspectRatio, opts.numImages, {
        limitGenerations: false,
        systemPrompt: opts.systemPrompt,
      }),
      seed: Math.floor(Math.random() * 2_147_483_647),
    },
    logs: true,
  });
  const outUrls = extractImageUrls(result.data);
  if (!outUrls.length) {
    return NextResponse.json(
      {
        error:
          "Image URL missing in model response. Check endpoint and schema on fal.ai model page.",
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
    return NextResponse.json(
      {
        error:
          "The model returned the same image. Try a more specific fix note (e.g. “remove the logo in the top-right corner”).",
      },
      { status: 502 },
    );
  }

  await trackUsage(opts.userId, "image");
  return NextResponse.json({
    imageUrl: outUrls[0],
    imageUrls: outUrls,
    requestId: result.requestId,
    endpoint: opts.endpoint,
    mode: "refine",
    variantCount: outUrls.length,
  });
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
      const endpoint = (formData.get("endpoint") as string | null)?.trim() || defaultEditEndpoint();
      const aspectRatio = aspectRatioForApi(
        (formData.get("aspect_ratio") as string | null)?.trim() || "auto",
      );
      const numImages = parseNumImages((formData.get("num_images") as string | null)?.trim() ?? "1");

      if (!sourceUrl.startsWith("http")) {
        return NextResponse.json({ error: "Generate an AI image first, then add a logo." }, { status: 400 });
      }
      if (!hasLogo) {
        return NextResponse.json({ error: "Upload a logo image (PNG with transparency works best)." }, { status: 400 });
      }
      if (!endpoint.includes("/edit")) {
        return NextResponse.json(
          { error: "Logo refine requires an edit endpoint (e.g. nano-banana-2/edit)." },
          { status: 400 },
        );
      }

      try {
        const logoUrl = await fal.storage.upload(logoFile as File);
        const prompt = buildLogoRefinePrompt({ placement, userNote });
        return await runRefineEdit({
          endpoint,
          prompt,
          aspectRatio,
          numImages,
          imageUrls: [sourceUrl, logoUrl],
          systemPrompt: IMAGE_LOGO_REFINE_SYSTEM_PROMPT,
          userId: auth.user.userId,
          refineSources: [sourceUrl, logoUrl],
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

    if (!hasProduct && !hasStyle) {
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
    const { strategy, brief } = parseStrategyFromFormData(formData);
    const strategyBlock = brief ? referenceStrategyPromptBlock(brief, strategy) : "";
    const promptExtra = [promptExtraRaw, strategyBlock].filter(Boolean).join(" | ");
    const artStyleId = resolveArtStyleId((formData.get("art_style") as string | null)?.trim());
    const headline = (formData.get("headline") as string | null)?.trim() || "";
    const subline = (formData.get("subline") as string | null)?.trim() || "";
    const offer = (formData.get("offer") as string | null)?.trim() || "";
    const clientPrompt = (formData.get("prompt") as string | null)?.trim() || "";

    const aspectRatio = aspectRatioForApi(
      (formData.get("aspect_ratio") as string | null)?.trim() || "9:16",
    );
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

    const endpoint =
      (formData.get("endpoint") as string | null)?.trim() ||
      (strategy.sendPixelsToFal ? defaultEditEndpoint() : defaultTextEndpoint());

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
    const promptMode = resolveImagePromptMode(
      visualStyle,
      useReferenceConcept ? "reference-concept" : creativeMode,
      { promotionMode, workflowMode },
    );
    if (
      (promptMode === "brand-fit" || visualStyle === "brand-campaign") &&
      !brandProfile?.businessName &&
      promotionMode !== "concept"
    ) {
      return NextResponse.json(
        { error: "Analyze the brand first (website or social hint)." },
        { status: 400 },
      );
    }
    const builtPrompt = buildWizardImagePrompt(
      vars,
      promptMode,
      brandProfile,
      visualStyle as VisualStyleId,
    );
    const finalPrompt = clientPrompt || builtPrompt;

    try {
      const imageUrls: string[] = [];
      if (strategy.sendPixelsToFal) {
        if (useReferenceConcept && dualImage) {
          if (hasStyle) imageUrls.push(await fal.storage.upload(styleRef as File));
          if (hasProduct) imageUrls.push(await fal.storage.upload(reference as File));
        } else if (hasProduct) {
          imageUrls.push(await fal.storage.upload(reference as File));
        } else if (hasStyle) {
          imageUrls.push(await fal.storage.upload(styleRef as File));
        }
      }

      const result = await fal.subscribe(endpoint, {
        input: banana2Input(finalPrompt, imageUrls, aspectRatio, numImages, {
          systemPrompt: artStyleSystemPrompt(artStyleId),
        }),
        logs: true,
      });
      const outUrls = extractImageUrls(result.data);
      if (!outUrls.length) {
        return NextResponse.json(
          {
            error: "Image URL missing in model response.",
            raw: result.data,
          },
          { status: 502 },
        );
      }

      await trackUsage(auth.user.userId, "image");
      return NextResponse.json({
        imageUrl: outUrls[0],
        imageUrls: outUrls,
        requestId: result.requestId,
        endpoint,
        mode: "edit",
        creativeMode: useReferenceConcept ? "reference-concept" : "promo-ai",
        imageCount: imageUrls.length,
        variantCount: outUrls.length,
      });
    } catch (e: unknown) {
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
  const endpoint = body?.endpoint?.trim() || defaultTextEndpoint();
  const apiMode = body?.mode?.trim();
  const isCompose = apiMode === "compose";
  const isRefine = apiMode === "refine" || (!isCompose && (body?.image_urls?.length ?? 0) > 0);
  const aspectRatio = aspectRatioForApi(
    body?.aspect_ratio?.trim() || (isRefine ? "auto" : "9:16"),
  );
  const numImages = Math.min(4, Math.max(1, body?.num_images ?? 1));
  const imageUrls = (body?.image_urls ?? []).filter(
    (u): u is string => typeof u === "string" && u.startsWith("http"),
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

  try {
    if (imageUrls.length > 0) {
      const systemPrompt = isCompose
        ? IMAGE_CANVAS_COMPOSE_SYSTEM_PROMPT
        : IMAGE_REFINE_SYSTEM_PROMPT;
      return await runRefineEdit({
        endpoint,
        prompt,
        aspectRatio,
        numImages,
        imageUrls,
        systemPrompt,
        userId: auth.user.userId,
        refineSources: imageUrls,
      });
    }

    const result = await fal.subscribe(endpoint, {
      input: { prompt, aspect_ratio: aspectRatio, num_images: numImages },
      logs: true,
    });
    const outUrls = extractImageUrls(result.data);
    if (!outUrls.length) {
      return NextResponse.json(
        {
          error:
            "Image URL missing in model response. Check endpoint and schema on fal.ai model page.",
          raw: result.data,
        },
        { status: 502 },
      );
    }

    await trackUsage(auth.user.userId, "image");
    return NextResponse.json({
      imageUrl: outUrls[0],
      imageUrls: outUrls,
      requestId: result.requestId,
      endpoint,
      mode: "text",
      variantCount: outUrls.length,
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: formatFalError(e) }, { status: 502 });
  }
}
