import { ApiError, fal } from "@fal-ai/client";
import { NextResponse } from "next/server";
import { requireAppUser, trackUsage } from "@/lib/require-app-user";
import type { BrandProfile } from "@/lib/brand-profile";
import { parseBrandKit } from "@/lib/brand-kit";
import { defaultEditEndpoint, defaultTextEndpoint } from "@/lib/image-endpoints";
import {
  buildPromptVariables,
  buildStoryboardSceneImagePrompt,
  type PromptMarket,
  type SubjectFraming,
} from "@/lib/prompt-variables";
import { mergePromptExtra, type VisualStyleId } from "@/lib/visual-styles";
import { resolveArtStyleId, artStyleSystemPrompt } from "@/lib/art-style";
import { planVideoStoryboard, parseVideoStoryboardPlan } from "@/lib/video-storyboard-plan";
import type { StoryboardSceneCount } from "@/lib/ad-pack-preferences";
import type { StoryboardSceneResult, VideoStoryboardPlan } from "@/lib/video-storyboard-types";
import {
  parseStrategyFromFormData,
  referenceStrategyPromptBlock,
} from "@/lib/reference-strategy";
import { isPromotionMode } from "@/lib/promotion-mode";
import { wizardPromoteName } from "@/lib/wizard-promote-name";
import { RESEARCH_REEL_ANALYSIS_MARKER } from "@/lib/reel-analysis-types";
import type { ResearchReelAnalysis } from "@/lib/reel-analysis-types";
import { pinStoryboardPlanToReelAnalysis } from "@/lib/reel-reference-brief";

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
  return "Storyboard image generation failed";
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

function parseDurationSec(raw: string): number {
  if (raw === "auto") return 10;
  const n = parseInt(raw, 10);
  if (Number.isNaN(n)) return 10;
  return Math.min(15, Math.max(4, n));
}

export async function POST(request: Request) {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;

  const key = process.env.FAL_KEY?.trim();
  if (!key) {
    return NextResponse.json(
      { error: "Storyboard generation is temporarily unavailable. Please try again later." },
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
  const promotionModeRaw = String(formData.get("promotion_mode") ?? "").trim();
  const promotionMode = isPromotionMode(promotionModeRaw) ? promotionModeRaw : "physical";
  const planRawEarly = (formData.get("storyboard_plan") as string | null)?.trim();
  const reelAnalysisRaw = (formData.get("research_reel_analysis") as string | null)?.trim();
  const conceptStoryboardNoProduct = promotionMode === "concept";
  const conceptTextOnlyStoryboard =
    conceptStoryboardNoProduct && !hasProduct && !hasStyle;
  if (!hasProduct && !conceptStoryboardNoProduct) {
    return NextResponse.json(
      { error: "Upload a product photo for storyboard generation." },
      { status: 400 },
    );
  }

  const { strategy, brief } = parseStrategyFromFormData(formData);
  const dualImage = strategy.useDualImage;

  const visualStyle = ((formData.get("visual_style") as string | null)?.trim() ||
    "storyboard-video") as VisualStyleId;
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
  let brandKit = null;
  if (brandKitRaw) {
    try {
      brandKit = parseBrandKit(JSON.parse(brandKitRaw));
    } catch {
      return NextResponse.json({ error: "Invalid brand kit data." }, { status: 400 });
    }
  }

  const business = (formData.get("business") as string | null)?.trim() || "";
  const headline = (formData.get("headline") as string | null)?.trim() || "";
  const conceptIdea = (formData.get("concept_idea") as string | null)?.trim() || "";
  const productName = wizardPromoteName({
    promotionMode,
    product: (formData.get("product_name") as string | null)?.trim() || "",
    headline,
    conceptIdea,
  });
  if (!productName) {
    return NextResponse.json(
      {
        error:
          promotionMode === "concept"
            ? "Headline or concept idea is required."
            : "Product name is required.",
      },
      { status: 400 },
    );
  }

  const subline = (formData.get("subline") as string | null)?.trim() || "";
  const offer = (formData.get("offer") as string | null)?.trim() || "";
  const storyboardBrief = (formData.get("storyboard_brief") as string | null)?.trim() || "";
  const promptMarket = ((formData.get("prompt_market") as string | null)?.trim() ||
    "en") as PromptMarket;
  const subjectFraming = ((formData.get("subject_framing") as string | null)?.trim() ||
    "auto") as SubjectFraming;
  const promptExtraRaw = (formData.get("prompt_extra") as string | null)?.trim() || "";
  const strategyBlock = brief ? referenceStrategyPromptBlock(brief, strategy) : "";
  const promptExtra = [promptExtraRaw, strategyBlock].filter(Boolean).join(" | ");
  const hasReelAnalysis =
    Boolean(reelAnalysisRaw) || promptExtra.includes(RESEARCH_REEL_ANALYSIS_MARKER);
  const durationSec = parseDurationSec(
    (formData.get("duration") as string | null)?.trim() || "8",
  );
  const sceneCountRaw = (formData.get("scene_count") as string | null)?.trim() || "auto";
  const sceneCountTarget = (
    ["auto", "4", "5", "6", "7"].includes(sceneCountRaw) ? sceneCountRaw : "auto"
  ) as StoryboardSceneCount;
  const aspectRatio = aspectRatioForApi(
    (formData.get("aspect_ratio") as string | null)?.trim() || "9:16",
  );
  const endpoint =
    (formData.get("endpoint") as string | null)?.trim() ||
    (conceptTextOnlyStoryboard || (!strategy.sendPixelsToFal && !hasStyle)
      ? defaultTextEndpoint()
      : defaultEditEndpoint());
  const artStyleId = resolveArtStyleId((formData.get("art_style") as string | null)?.trim());
  const styleHint = mergePromptExtra(visualStyle, promptExtra);

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

  let plan;
  const planRaw = planRawEarly;
  if (planRaw) {
    try {
      const parsed = JSON.parse(planRaw) as Partial<VideoStoryboardPlan>;
      plan = parseVideoStoryboardPlan(parsed, durationSec, sceneCountTarget);
    } catch {
      return NextResponse.json({ error: "Invalid storyboard plan data." }, { status: 400 });
    }
  } else {
    try {
      plan = await planVideoStoryboard({
        product: productName,
        business,
        headline,
        subline,
        offer,
        storyboardBrief,
        durationSec,
        sceneCountTarget,
        market: promptMarket,
        framing: subjectFraming,
        promptExtra,
        styleHint,
        brandProfile,
        artStyleId,
        referenceStrategyKind: strategy.kind,
      });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Storyboard planning failed.";
      const status =
        message.includes("DEEPSEEK_API_KEY") ||
        message.includes("DeepSeek API") ||
        message.includes("balance")
          ? 503
          : 400;
      return NextResponse.json({ error: message }, { status });
    }
  }

  if (hasReelAnalysis && reelAnalysisRaw) {
    try {
      const reelAnalysis = JSON.parse(reelAnalysisRaw) as ResearchReelAnalysis;
      plan = pinStoryboardPlanToReelAnalysis(
        plan,
        reelAnalysis,
        headline || conceptIdea || productName,
      );
    } catch {
      /* keep unpinned plan */
    }
  } else if (hasReelAnalysis && promptExtra.includes(RESEARCH_REEL_ANALYSIS_MARKER)) {
    /* marker-only path: plan should already be pinned client-side */
  }

  try {
    let imageUrlsForFal: string[] | null = null;
    const storyboardStyleRef =
      (strategy.kind === "style-only" || hasReelAnalysis) &&
      hasStyle &&
      !conceptTextOnlyStoryboard;
    if (
      (strategy.sendPixelsToFal || storyboardStyleRef) &&
      !conceptTextOnlyStoryboard
    ) {
      imageUrlsForFal = [];
      if (strategy.useDualImage && dualImage && hasStyle && hasProduct) {
        imageUrlsForFal.push(await fal.storage.upload(styleRef as File));
        imageUrlsForFal.push(await fal.storage.upload(reference as File));
      } else if (hasStyle) {
        imageUrlsForFal.push(await fal.storage.upload(styleRef as File));
      } else if (hasProduct) {
        imageUrlsForFal.push(await fal.storage.upload(reference as File));
      }
    }

    const scenes: StoryboardSceneResult[] = [];

    for (const scene of plan.scenes) {
      const prompt = buildStoryboardSceneImagePrompt(scene, plan, vars, {
        referenceConcept: strategy.useReferenceConceptPrompts && !conceptTextOnlyStoryboard,
        conceptTextOnly: conceptTextOnlyStoryboard,
        storyboardStyleRef,
        visualStyleId: visualStyle,
        brandProfile,
        brandKit,
      });

      const result = await fal.subscribe(endpoint, {
        input: {
          prompt,
          ...(imageUrlsForFal?.length ? { image_urls: imageUrlsForFal } : {}),
          aspect_ratio: aspectRatio,
          num_images: 1,
          resolution: "1K" as const,
          limit_generations: true,
          ...(artStyleSystemPrompt(artStyleId)
            ? { system_prompt: artStyleSystemPrompt(artStyleId) }
            : {}),
        },
        logs: true,
      });

      const outUrls = extractImageUrls(result.data);
      if (!outUrls[0]) {
        return NextResponse.json(
          { error: `Image URL missing for scene ${scene.imageIndex}.`, raw: result.data },
          { status: 502 },
        );
      }

      scenes.push({
        imageIndex: scene.imageIndex,
        role: scene.role,
        startSec: scene.startSec,
        endSec: scene.endSec,
        sceneDescriptionZh: scene.sceneDescriptionZh,
        onImageCopyZh: scene.onImageCopyZh,
        imageUrl: outUrls[0],
        imagePrompt: scene.imagePrompt,
      });
    }

    const imageUrls = scenes.map((s) => s.imageUrl);
    await trackUsage(auth.user.userId, "storyboard");
    return NextResponse.json({
      plan,
      scenes,
      seedancePrompt: plan.seedancePrompt,
      imageUrl: imageUrls[0],
      imageUrls,
      endpoint,
      mode: "storyboard",
      sceneCount: scenes.length,
      referenceStrategy: strategy.kind,
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: formatFalError(e) }, { status: 502 });
  }
}
