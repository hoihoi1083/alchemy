import { fal } from "@fal-ai/client";
import { NextResponse } from "next/server";
import { chargeTokens, refundTokens } from "@/lib/billing/charge";
import { TOKEN_COST } from "@/lib/billing/token-costs";
import { requireAppUser } from "@/lib/require-app-user";
import type { ResearchReelAnalysis } from "@/lib/reel-analysis-types";
import { refineResearchVideoScript } from "@/lib/video-script-refine";
import { runFlorenceDetailedCaption } from "@/lib/vision-json-repair";
import { resolvePlannerDurationSec } from "@/lib/video-duration-planner";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Fuse reel analysis + product photo + exact duration into a better DeepSeek video script.
 * Called before research R2V generate (and optionally when duration changes).
 */
export async function POST(request: Request) {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;

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
    return NextResponse.json({ error: "Research analysis has no Seedance prompt." }, { status: 400 });
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

  const tokenCost = TOKEN_COST.plan;
  const charged = await chargeTokens(auth.user.userId, tokenCost, {
    kind: "refine_research_video_script",
    durationSec,
  });
  if ("error" in charged) return charged.error;

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
    });

    return NextResponse.json({
      ...refined,
      durationSec,
      tokensCharged: tokenCost,
      creditBalance: charged.balanceAfter,
    });
  } catch (e: unknown) {
    await refundTokens(auth.user.userId, tokenCost, {
      kind: "refine_research_video_script",
      reason: "refine_failed",
    });
    const message = e instanceof Error ? e.message : "Script refine failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
