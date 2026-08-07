import { fal } from "@fal-ai/client";
import { NextResponse } from "next/server";
import { chargeTokens, refundTokens } from "@/lib/billing/charge";
import { clampImageResolution } from "@/lib/billing/entitlements";
import { getUserPlan } from "@/lib/billing/get-user-plan";
import { estimateImageTokens, TOKEN_COST } from "@/lib/billing/token-costs";
import { requireAppUser, trackUsage } from "@/lib/require-app-user";
import { parseStoryboardSceneCount } from "@/lib/ad-pack-preferences";
import type { BrandProfile } from "@/lib/brand-profile";
import { parseBrandKit } from "@/lib/brand-kit";
import { brandKitForGeneration, brandKitWantsLogo } from "@/lib/brand-merge";
import { uploadBrandKitLogoToFal } from "@/lib/brand-kit-fal";
import {
  archiveImagesWithBrandLogo,
  CINEMATIC_LOGO_PLACEMENT,
  CINEMATIC_LOGO_SIZE_RATIO,
} from "@/lib/brand-logo-composite";
import {
  defaultEditEndpoint,
  defaultTextEndpoint,
  resolveEditEndpointWhenNeeded,
} from "@/lib/image-endpoints";
import {
  buildStoryboardLogoModeAPrompt,
  IMAGE_LOGO_REFINE_SYSTEM_PROMPT,
} from "@/lib/image-refine-prompt";
import { persistAndDurablizeMany } from "@/lib/storage/durable-media";
import {
  buildPromptVariables,
  buildStoryboardSceneImagePrompt,
  type PromptMarket,
  type SubjectFraming,
} from "@/lib/prompt-variables";
import { mergePromptExtra, type VisualStyleId } from "@/lib/visual-styles";
import { resolveArtStyleId, artStyleSystemPrompt } from "@/lib/art-style";
import { planVideoStoryboard, parseVideoStoryboardPlan } from "@/lib/video-storyboard-plan";
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
import { mapPool } from "@/lib/async-pool";
import { formatFalGenerationError } from "@/lib/fal-errors";
import {
  isFalContentPolicyThrowable,
  looksLikeSpaOrBeautyBrief,
  softenStoryboardStillPromptForModeration,
  spaSafeStillFallbackPrompt,
} from "@/lib/seedance-moderation";

export const runtime = "nodejs";
/** Multi-scene Nano Banana can take 2–3 min each; client batches keep each request under this. */
export const maxDuration = 300;

const STORYBOARD_FAL_CONCURRENCY = 2;
const STORYBOARD_CLIENT_BATCH_HINT = 2;

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
  return formatFalGenerationError(e, "Storyboard image generation failed");
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
      // Strip logo when useBrandLogo is off — Mode A / stamp must never see it.
      brandKit = brandKitForGeneration(parseBrandKit(JSON.parse(brandKitRaw)));
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
  const sceneCountTarget = parseStoryboardSceneCount(
    (formData.get("scene_count") as string | null)?.trim() || "auto",
  );
  const aspectRatio = aspectRatioForApi(
    (formData.get("aspect_ratio") as string | null)?.trim() || "9:16",
  );
  const spaBeautyBrief = looksLikeSpaOrBeautyBrief(
    productName,
    headline,
    conceptIdea,
    subline,
    offer,
    storyboardBrief,
    promptExtraRaw,
  );
  // Spa/beauty concept: style-ref face photos often trip fal input filters — use text-to-image.
  const forceConceptTextOnly =
    conceptStoryboardNoProduct && spaBeautyBrief && !hasProduct;
  // Endpoint resolved after we know whether pixels will actually be uploaded (below).
  // Client often sends /edit whenever a research style File exists in React state; if that
  // File is missing/empty on the server, honoring /edit with no image_urls → fal 422
  // "At least one image URL is required".
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
    extra: softenStoryboardStillPromptForModeration(promptExtra),
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
        conceptMode: conceptStoryboardNoProduct,
        useBrandLogo: brandKitWantsLogo(brandKit),
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

  const sceneIndexRaw = (formData.get("scene_indexes") as string | null)?.trim() || "";
  let scenesToGenerate = plan.scenes;
  if (sceneIndexRaw) {
    const wanted = new Set(
      sceneIndexRaw
        .split(/[,\s]+/)
        .map((s) => Number(s.trim()))
        .filter((n) => Number.isFinite(n) && n >= 1),
    );
    if (wanted.size > 0) {
      scenesToGenerate = plan.scenes.filter((s) => wanted.has(s.imageIndex));
    }
  }
  if (!scenesToGenerate.length) {
    return NextResponse.json({ error: "No storyboard scenes to generate." }, { status: 400 });
  }

  const brandLogoWanted = brandKitWantsLogo(brandKit);
  let brandLogoFalUrl: string | null = null;
  let logoMirrorNote: string | undefined;
  if (brandLogoWanted && brandKit) {
    try {
      brandLogoFalUrl = await uploadBrandKitLogoToFal(brandKit, {
        clerkId: auth.user.userId,
      });
    } catch (e: unknown) {
      const detail = e instanceof Error ? e.message : "Brand logo mirror failed";
      console.error("[generate-storyboard-images] brand logo → fal failed", e);
      logoMirrorNote = `Logo AI composite unavailable (${detail}); using exact PNG stamp when possible.`;
    }
  }
  // Opt-in: Mode A = textless still + Nano Banana logo edit (2× image COGS). Sharp stamp = fallback.
  const useBrandLogo = brandLogoWanted;
  const useLogoModeA = Boolean(useBrandLogo && brandLogoFalUrl);
  const passesPerScene = useLogoModeA ? 2 : 1;
  const tokenCost = estimateImageTokens({
    mode: "storyboard",
    sceneCount: scenesToGenerate.length,
    passesPerScene,
  });
  const charged = await chargeTokens(auth.user.userId, tokenCost, {
    kind: "storyboard",
    sceneCount: scenesToGenerate.length,
    logoMode: useLogoModeA ? "mode-a" : useBrandLogo ? "stamp-fallback" : "none",
    passesPerScene,
  });
  if ("error" in charged) return charged.error;
  const balanceAfter = charged.balanceAfter;
  const { resolution: imageResolution } = clampImageResolution(
    await getUserPlan(auth.user.userId),
  );
  const logoEditEndpoint = defaultEditEndpoint();

  try {
    let imageUrlsForFal: string[] | null = null;
    const storyboardStyleRef =
      (strategy.kind === "style-only" || hasReelAnalysis) &&
      hasStyle &&
      !conceptTextOnlyStoryboard &&
      !forceConceptTextOnly;
    // Always prefer product identity when the user uploaded a product photo.
    // Research style refs alone caused scene stills to clone the viral post's product.
    const dualProductAndStyle = hasProduct && hasStyle && !conceptTextOnlyStoryboard;
    if (
      (strategy.sendPixelsToFal || storyboardStyleRef || hasProduct) &&
      !conceptTextOnlyStoryboard &&
      !forceConceptTextOnly
    ) {
      imageUrlsForFal = [];
      if (strategy.useDualImage && dualImage && hasStyle && hasProduct) {
        // Layout transfer: IMAGE 1 = product identity, IMAGE 2 = style (edit models prioritize first image)
        imageUrlsForFal.push(await fal.storage.upload(reference as File));
        imageUrlsForFal.push(await fal.storage.upload(styleRef as File));
      } else if (dualProductAndStyle) {
        // Exact product identity first, then research style mood
        imageUrlsForFal.push(await fal.storage.upload(reference as File));
        imageUrlsForFal.push(await fal.storage.upload(styleRef as File));
      } else if (hasProduct) {
        imageUrlsForFal.push(await fal.storage.upload(reference as File));
      } else if (hasStyle) {
        imageUrlsForFal.push(await fal.storage.upload(styleRef as File));
      }
      if (!imageUrlsForFal.length) imageUrlsForFal = null;
    }

    const hasImageUrls = Boolean(imageUrlsForFal?.length);
    const endpoint = resolveEditEndpointWhenNeeded(
      formData.get("endpoint") as string | null,
      hasImageUrls && !forceConceptTextOnly && !conceptTextOnlyStoryboard,
    );
    const textEndpoint = defaultTextEndpoint();

    const scenes = await mapPool(
      scenesToGenerate,
      STORYBOARD_FAL_CONCURRENCY,
      async (scene) => {
        // Pass 1: normal textless storyboard still (every scene, including last).
        const prompt = buildStoryboardSceneImagePrompt(scene, plan, vars, {
          referenceConcept:
            strategy.useReferenceConceptPrompts &&
            !conceptTextOnlyStoryboard &&
            !forceConceptTextOnly,
          conceptTextOnly: conceptTextOnlyStoryboard || forceConceptTextOnly,
          storyboardStyleRef: storyboardStyleRef || dualProductAndStyle,
          dualProductAndStyle,
          textless: true,
          visualStyleId: visualStyle,
          brandProfile,
          brandKit,
          brandLogoImageIndex: null,
          hasProductImage: hasProduct,
        });

        const subscribe = async (inputPrompt: string, withImages: boolean) => {
          const useImages = withImages && hasImageUrls;
          // /edit requires image_urls — never call it without pixels (policy fallback).
          const callEndpoint = useImages ? endpoint : textEndpoint;
          return fal.subscribe(callEndpoint, {
            input: {
              prompt: inputPrompt,
              ...(useImages && imageUrlsForFal?.length
                ? { image_urls: imageUrlsForFal }
                : {}),
              aspect_ratio: aspectRatio,
              num_images: 1,
              resolution: imageResolution,
              limit_generations: true,
              ...(artStyleSystemPrompt(artStyleId)
                ? { system_prompt: artStyleSystemPrompt(artStyleId) }
                : {}),
            },
            logs: true,
          });
        };

        let result;
        try {
          result = await subscribe(prompt, hasImageUrls);
        } catch (firstErr) {
          if (!isFalContentPolicyThrowable(firstErr)) throw firstErr;
          const safePrompt = spaSafeStillFallbackPrompt({
            theme: plan.theme || productName || headline,
            role: scene.role,
            marketHint:
              promptMarket === "en"
                ? "International English-market commercial spa aesthetic."
                : "",
          });
          result = await subscribe(safePrompt, false);
        }

        let stillUrl = extractImageUrls(result.data)[0];
        if (!stillUrl) {
          throw new Error(`Image URL missing for scene ${scene.imageIndex}.`);
        }

        if (useBrandLogo && brandKit?.logoUrl?.trim()) {
          let logoIntegrated = false;
          // Mode A (preferred): second fal image job composites Brand kit logo — model picks placement.
          if (brandLogoFalUrl) {
            try {
              const logoPass = await fal.subscribe(logoEditEndpoint, {
                input: {
                  prompt: buildStoryboardLogoModeAPrompt(),
                  image_urls: [stillUrl, brandLogoFalUrl],
                  aspect_ratio: aspectRatio,
                  num_images: 1,
                  resolution: imageResolution,
                  limit_generations: true,
                  system_prompt: IMAGE_LOGO_REFINE_SYSTEM_PROMPT,
                },
                logs: true,
              });
              const logoUrl = extractImageUrls(logoPass.data)[0];
              if (logoUrl) {
                stillUrl = logoUrl;
                logoIntegrated = true;
              }
            } catch (logoErr) {
              console.error(
                `[generate-storyboard-images] Mode A logo pass failed scene ${scene.imageIndex}`,
                logoErr,
              );
            }
          }
          // Fallback: exact PNG sharp corner stamp if Mode A unavailable/failed.
          if (!logoIntegrated) {
            try {
              const stamped = await archiveImagesWithBrandLogo(
                request,
                [stillUrl],
                brandKit,
                auth.user.userId,
                {
                  placement: CINEMATIC_LOGO_PLACEMENT,
                  fileName: "generated.png",
                  sizeRatio: CINEMATIC_LOGO_SIZE_RATIO,
                },
              );
              if (stamped.logoStamped && stamped.urls[0]) {
                stillUrl = stamped.urls[0];
              }
            } catch (stampErr) {
              console.error(
                `[generate-storyboard-images] Logo stamp fallback failed scene ${scene.imageIndex}`,
                stampErr,
              );
            }
          }
          return {
            imageIndex: scene.imageIndex,
            role: scene.role,
            startSec: scene.startSec,
            endSec: scene.endSec,
            sceneDescriptionZh: scene.sceneDescriptionZh,
            onImageCopyZh: scene.onImageCopyZh,
            imageUrl: stillUrl,
            imagePrompt: scene.imagePrompt,
            /** True only when the 2nd fal (logo edit) job succeeded — used for surcharge refund. */
            modeALogoApplied: logoIntegrated,
          };
        }

        return {
          imageIndex: scene.imageIndex,
          role: scene.role,
          startSec: scene.startSec,
          endSec: scene.endSec,
          sceneDescriptionZh: scene.sceneDescriptionZh,
          onImageCopyZh: scene.onImageCopyZh,
          imageUrl: stillUrl,
          imagePrompt: scene.imagePrompt,
          modeALogoApplied: false,
        };
      },
    );

    let tokensCharged = tokenCost;
    let balanceForClient = balanceAfter;
    if (useLogoModeA) {
      const modeAMisses = scenes.filter((s) => !s.modeALogoApplied).length;
      if (modeAMisses > 0) {
        const refundAmount = TOKEN_COST.storyboard_scene * modeAMisses;
        const afterRefund = await refundTokens(auth.user.userId, refundAmount, {
          kind: "storyboard",
          reason: "mode_a_unused_pass",
          modeAMisses,
        });
        tokensCharged = Math.max(0, tokenCost - refundAmount);
        if (typeof afterRefund === "number") balanceForClient = afterRefund;
      }
    }

    const falUrls = scenes.map((s) => s.imageUrl);
    const durableUrls = await persistAndDurablizeMany({
      clerkId: auth.user.userId,
      kind: "image",
      sourceUrls: falUrls,
      fallbackUrls: falUrls,
      prompt: useLogoModeA ? "storyboard-mode-a" : useBrandLogo ? "storyboard-logo-stamp" : "storyboard",
    });
    const durableScenes = scenes.map((scene, index) => ({
      imageIndex: scene.imageIndex,
      role: scene.role,
      startSec: scene.startSec,
      endSec: scene.endSec,
      sceneDescriptionZh: scene.sceneDescriptionZh,
      onImageCopyZh: scene.onImageCopyZh,
      imageUrl: durableUrls[index] ?? scene.imageUrl,
      imagePrompt: scene.imagePrompt,
    }));
    const imageUrls = durableScenes.map((s) => s.imageUrl);
    await trackUsage(auth.user.userId, "storyboard");
    return NextResponse.json({
      plan,
      scenes: durableScenes,
      seedancePrompt: plan.seedancePrompt,
      imageUrl: imageUrls[0],
      imageUrls,
      endpoint: useLogoModeA ? `${endpoint}+${logoEditEndpoint}` : endpoint,
      mode: "storyboard",
      sceneCount: scenes.length,
      totalPlanScenes: plan.scenes.length,
      batchHint: STORYBOARD_CLIENT_BATCH_HINT,
      referenceStrategy: strategy.kind,
      tokensCharged,
      creditBalance: balanceForClient,
      logoMode: useLogoModeA ? "mode-a" : useBrandLogo ? "stamp-fallback" : "none",
      logoIntegrated: useBrandLogo,
      ...(logoMirrorNote ? { logoNote: logoMirrorNote } : {}),
    });
  } catch (e: unknown) {
    await refundTokens(auth.user.userId, tokenCost, {
      kind: "storyboard",
      reason: "generation_failed",
    });
    return NextResponse.json({ error: formatFalError(e) }, { status: 502 });
  }
}
