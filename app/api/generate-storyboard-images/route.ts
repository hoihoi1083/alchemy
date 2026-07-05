import { ApiError, fal } from "@fal-ai/client";
import { NextResponse } from "next/server";
import { requireAppUser, trackUsage } from "@/lib/require-app-user";
import type { BrandProfile } from "@/lib/brand-profile";
import { defaultEditEndpoint, defaultTextEndpoint } from "@/lib/image-endpoints";
import {
  buildPromptVariables,
  buildStoryboardSceneImagePrompt,
  type PromptMarket,
  type SubjectFraming,
} from "@/lib/prompt-variables";
import { mergePromptExtra, type VisualStyleId } from "@/lib/visual-styles";
import { resolveArtStyleId, artStyleSystemPrompt } from "@/lib/art-style";
import { planVideoStoryboard } from "@/lib/video-storyboard-plan";
import type { StoryboardSceneCount } from "@/lib/ad-pack-preferences";
import type { StoryboardSceneResult } from "@/lib/video-storyboard-types";
import {
  parseStrategyFromFormData,
  referenceStrategyPromptBlock,
} from "@/lib/reference-strategy";

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
  if (!hasProduct) {
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

  const productName = (formData.get("product_name") as string | null)?.trim() || "";
  if (!productName) {
    return NextResponse.json({ error: "Product name is required." }, { status: 400 });
  }

  const business = (formData.get("business") as string | null)?.trim() || "";
  const headline = (formData.get("headline") as string | null)?.trim() || "";
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
    (strategy.sendPixelsToFal ? defaultEditEndpoint() : defaultTextEndpoint());
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

  try {
    let imageUrlsForFal: string[] | null = null;
    if (strategy.sendPixelsToFal) {
      imageUrlsForFal = [];
      if (strategy.useDualImage && dualImage && hasStyle) {
        imageUrlsForFal.push(await fal.storage.upload(styleRef as File));
        imageUrlsForFal.push(await fal.storage.upload(reference as File));
      } else {
        imageUrlsForFal.push(await fal.storage.upload(reference as File));
      }
    }

    const scenes: StoryboardSceneResult[] = [];

    for (const scene of plan.scenes) {
      const prompt = buildStoryboardSceneImagePrompt(scene, plan, vars, {
        referenceConcept: strategy.useReferenceConceptPrompts,
        visualStyleId: visualStyle,
        brandProfile,
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
