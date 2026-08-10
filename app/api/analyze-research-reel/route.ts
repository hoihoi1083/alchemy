import { fal } from "@fal-ai/client";
import { NextResponse } from "next/server";
import { chargeTokens, refundTokens } from "@/lib/billing/charge";
import { TOKEN_COST } from "@/lib/billing/token-costs";
import { requireAppUser } from "@/lib/require-app-user";
import { analyzeResearchReelFromVideo } from "@/lib/reel-video-analysis";
import { researchReelAnalysisPromptBlock } from "@/lib/reel-analysis-types";
import { planVideoStoryboardFromReelAnalysis } from "@/lib/video-storyboard-plan";
import type { PromptMarket, SubjectFraming } from "@/lib/prompt-variables";
import { isPromotionMode } from "@/lib/promotion-mode";
import { wizardPromoteName } from "@/lib/wizard-promote-name";
import { resolveArtStyleId } from "@/lib/art-style";
import { parseStoryboardSceneCount } from "@/lib/ad-pack-preferences";
import type { ReferenceStrategyKind } from "@/lib/reference-strategy";
import { parseBrandKit } from "@/lib/brand-kit";
import { parseImageTextMode } from "@/lib/image-text-mode";

export const runtime = "nodejs";
export const maxDuration = 180;

export async function POST(request: Request) {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;

  const key = process.env.FAL_KEY?.trim();
  if (!key) {
    return NextResponse.json(
      { error: "Reel analysis is temporarily unavailable." },
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

  const video = formData.get("reference_video");
  if (!(video instanceof File) || video.size === 0) {
    return NextResponse.json({ error: "Upload a reference reel MP4." }, { status: 400 });
  }

  const promotionModeRaw = String(formData.get("promotion_mode") ?? "").trim();
  const promotionMode = isPromotionMode(promotionModeRaw) ? promotionModeRaw : "physical";
  const headline = String(formData.get("headline") ?? "").trim();
  const subline = String(formData.get("subline") ?? "").trim();
  const offer = String(formData.get("offer") ?? "").trim();
  const business = String(formData.get("business") ?? "").trim();
  const promptExtra = String(formData.get("prompt_extra") ?? "").trim();
  const artStyleId = resolveArtStyleId(String(formData.get("art_style") ?? "").trim());
  const subjectFraming = (String(formData.get("subject_framing") ?? "auto").trim() ||
    "auto") as SubjectFraming;
  const referenceStrategyKind = String(formData.get("reference_strategy_kind") ?? "").trim() as
    | ReferenceStrategyKind
    | "";
  const sceneCountTarget = parseStoryboardSceneCount(
    String(formData.get("scene_count") ?? "auto"),
  );
  const product = wizardPromoteName({
    promotionMode,
    product: String(formData.get("product_name") ?? "").trim(),
    headline,
    conceptIdea: String(formData.get("conceptIdea") ?? "").trim(),
  });
  if (!product) {
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

  const promptMarket = (String(formData.get("prompt_market") ?? "hk").trim() ||
    "hk") as PromptMarket;
  const outputDurationRaw = Number(
    String(formData.get("output_duration_sec") ?? "").trim(),
  );
  const outputDurationSec =
    Number.isFinite(outputDurationRaw) && outputDurationRaw >= 4 && outputDurationRaw <= 15
      ? Math.round(outputDurationRaw)
      : 8;
  const planStoryboard =
    String(formData.get("plan_storyboard") ?? "true").trim() !== "false";

  // fal vision (~image-class) + DeepSeek plan(s). Bill before vendor spend.
  const tokenCost =
    TOKEN_COST.image + TOKEN_COST.plan + (planStoryboard ? TOKEN_COST.plan : 0);
  const charged = await chargeTokens(auth.user.userId, tokenCost, {
    kind: "research_reel",
    planStoryboard,
  });
  if ("error" in charged) return charged.error;

  try {
    const buffer = Buffer.from(await video.arrayBuffer());
    const result = await analyzeResearchReelFromVideo({
      videoBytes: buffer,
      product,
      headline,
      subline,
      offer,
      promptExtra,
      market: promptMarket,
      outputDurationSec,
      conceptMode: promotionMode === "concept",
    });

    let storyboardPlan:
      | Awaited<ReturnType<typeof planVideoStoryboardFromReelAnalysis>>
      | undefined;
    let storyboardPlanError: string | undefined;
    if (planStoryboard) {
      try {
        storyboardPlan = await planVideoStoryboardFromReelAnalysis({
          analysis: result.analysis,
          product,
          business,
          headline,
          subline,
          offer,
          promptExtra,
          durationSec: outputDurationSec,
          market: promptMarket,
          promotionMode,
          artStyleId,
          framing: subjectFraming,
          referenceStrategyKind:
            referenceStrategyKind === "layout-transfer" ||
            referenceStrategyKind === "style-only" ||
            referenceStrategyKind === "product-clone" ||
            referenceStrategyKind === "mood-only"
              ? referenceStrategyKind
              : undefined,
          sceneCountTarget,
          imageTextMode: parseImageTextMode(
            formData.get("image_text_mode") as string | null,
          ),
          useBrandLogo: (() => {
            const brandKitRaw = (formData.get("brand_kit") as string | null)?.trim() || "";
            if (!brandKitRaw) return false;
            try {
              const kit = parseBrandKit(JSON.parse(brandKitRaw));
              return Boolean(kit.useBrandLogo && kit.logoUrl?.trim());
            } catch {
              return false;
            }
          })(),
        });
      } catch (planErr: unknown) {
        // Reel analysis already succeeded — don't 502 the whole request on plan timeout.
        storyboardPlanError =
          planErr instanceof Error ? planErr.message : "Storyboard plan failed.";
        console.warn("[analyze-research-reel] storyboard plan failed:", storyboardPlanError);
        await refundTokens(auth.user.userId, TOKEN_COST.plan, {
          kind: "research_reel",
          reason: "storyboard_plan_failed",
        });
      }
    }

    return NextResponse.json({
      analysis: result.analysis,
      ...(storyboardPlan ? { storyboardPlan } : {}),
      ...(storyboardPlanError ? { storyboardPlanError } : {}),
      referenceVideoUrl: result.referenceVideoUrl,
      referenceDigestMontage: result.referenceDigestMontage,
      sourceDurationSec: result.sourceDurationSec,
      referenceDurationSec: result.referenceDurationSec,
      styleReferenceFrameUrl: result.styleReferenceFrameUrl ?? null,
      promptBlock: researchReelAnalysisPromptBlock(result.analysis),
      tokensCharged: tokenCost,
      creditBalance: charged.balanceAfter,
    });
  } catch (e: unknown) {
    await refundTokens(auth.user.userId, tokenCost, {
      kind: "research_reel",
      reason: "analysis_failed",
    });
    const message = e instanceof Error ? e.message : "Reel analysis failed.";
    console.error("[analyze-research-reel] failed:", message);
    const status =
      message.includes("ffmpeg") || message.includes("DEEPSEEK_API_KEY") ? 503 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
