import { fal } from "@fal-ai/client";
import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/require-app-user";
import { analyzeResearchReelFromVideo } from "@/lib/reel-video-analysis";
import { researchReelAnalysisPromptBlock } from "@/lib/reel-analysis-types";
import { planVideoStoryboardFromReelAnalysis } from "@/lib/video-storyboard-plan";
import type { PromptMarket } from "@/lib/prompt-variables";
import { isPromotionMode } from "@/lib/promotion-mode";
import { wizardPromoteName } from "@/lib/wizard-promote-name";

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
  const promptExtra = String(formData.get("prompt_extra") ?? "").trim();
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
    });

    const storyboardPlan = planStoryboard
      ? await planVideoStoryboardFromReelAnalysis({
          analysis: result.analysis,
          product,
          headline,
          subline,
          offer,
          promptExtra,
          durationSec: outputDurationSec,
          market: promptMarket,
          promotionMode,
        })
      : undefined;

    return NextResponse.json({
      analysis: result.analysis,
      ...(storyboardPlan ? { storyboardPlan } : {}),
      referenceVideoUrl: result.referenceVideoUrl,
      referenceDigestMontage: result.referenceDigestMontage,
      sourceDurationSec: result.sourceDurationSec,
      referenceDurationSec: result.referenceDurationSec,
      styleReferenceFrameUrl: result.styleReferenceFrameUrl ?? null,
      promptBlock: researchReelAnalysisPromptBlock(result.analysis),
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Reel analysis failed.";
    const status =
      message.includes("ffmpeg") || message.includes("DEEPSEEK_API_KEY") ? 503 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
