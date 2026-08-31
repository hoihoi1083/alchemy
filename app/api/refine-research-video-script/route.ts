import { fal } from "@fal-ai/client";
import { NextResponse } from "next/server";
import { assertPlatformResearchAllowed } from "@/lib/billing/assert-platform-research";
import { requireAppUser } from "@/lib/require-app-user";
import type { ResearchReelAnalysis } from "@/lib/reel-analysis-types";
import { refineResearchVideoScript } from "@/lib/video-script-refine";
import { runFlorenceDetailedCaption } from "@/lib/vision-json-repair";
import { resolvePlannerDurationSec } from "@/lib/video-duration-planner";
import { isPromotionMode } from "@/lib/promotion-mode";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Fuse reel analysis + product photo + exact duration into a better DeepSeek video script.
 * Included with Standard+ Platform research (no token charge).
 */
export async function POST(request: Request) {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;
  const gated = await assertPlatformResearchAllowed(auth.user.userId);
  if (gated) return gated;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const analysisRaw = (formData.get("research_reel_analysis") as string | null)?.trim();
  if (!analysisRaw) {
    return NextResponse.json({ error: "Missing research reel analysis." }, { status: 400 });
  }

  let analysis: ResearchReelAnalysis;
  try {
    analysis = JSON.parse(analysisRaw) as ResearchReelAnalysis;
  } catch {
    return NextResponse.json({ error: "Invalid research reel analysis JSON." }, { status: 400 });
  }
  if (!analysis?.seedancePrompt?.trim()) {
    return NextResponse.json({ error: "Research analysis has no motion prompt." }, { status: 400 });
  }

  const product =
    (formData.get("product_name") as string | null)?.trim() ||
    (formData.get("headline") as string | null)?.trim() ||
    "";
  if (!product) {
    return NextResponse.json({ error: "Product or headline is required." }, { status: 400 });
  }

  const durationSec = resolvePlannerDurationSec(
    (formData.get("duration") as string | null)?.trim() || undefined,
    8,
  );
  const headline = (formData.get("headline") as string | null)?.trim() || "";
  const subline = (formData.get("subline") as string | null)?.trim() || "";
  const offer = (formData.get("offer") as string | null)?.trim() || "";
  const promotionModeRaw = String(formData.get("promotion_mode") ?? "").trim();
  const conceptMode =
    isPromotionMode(promotionModeRaw) && promotionModeRaw === "concept";

  try {
    let productVisionNote = "";
    const productFile = formData.get("product_photo") as File | null;
    const productUrl = (formData.get("product_photo_url") as string | null)?.trim();
    const key = process.env.FAL_KEY?.trim();
    if (key && (productFile?.size || productUrl)) {
      fal.config({ credentials: key });
      try {
        let imageUrl = productUrl || "";
        if (!imageUrl && productFile && productFile.size > 0) {
          imageUrl = await fal.storage.upload(productFile);
        }
        if (imageUrl) {
          productVisionNote = await runFlorenceDetailedCaption(imageUrl);
        }
      } catch (visionErr) {
        console.warn("[refine-research-video-script] product vision skipped:", visionErr);
      }
    }

    const refined = await refineResearchVideoScript({
      analysis,
      durationSec,
      product,
      headline,
      subline,
      offer,
      productVisionNote: productVisionNote || undefined,
      conceptMode,
    });

    return NextResponse.json({
      ...refined,
      durationSec,
      tokensCharged: 0,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Script refine failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
