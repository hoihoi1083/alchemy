import { fal } from "@fal-ai/client";
import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/require-app-user";
import { analyzeConceptReferenceImage } from "@/lib/concept-image-vision";
import type { ImageCreativeMode } from "@/lib/creative-workflow";
import type { ImageOutputMode } from "@/lib/image-output-mode";
import { isPromotionMode } from "@/lib/promotion-mode";
import { resolveReferenceStrategy } from "@/lib/reference-strategy";
import type { VisualStyleId } from "@/lib/visual-styles";
import {
  briefFromConceptVision,
  briefFromUserTextOnly,
  mergeUserReferenceBrief,
  overrideBriefForContentResearch,
} from "@/lib/user-reference-brief";
import { isContentResearchStyleExtra } from "@/lib/content-research-promote";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;

  const key = process.env.FAL_KEY?.trim();
  if (!key) {
    return NextResponse.json(
      { error: "Reference analysis is temporarily unavailable." },
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

  const ref = formData.get("reference_image");
  if (!(ref instanceof File) || ref.size === 0) {
    return NextResponse.json({ error: "Upload a reference image to analyze." }, { status: 400 });
  }

  const conceptIdea = String(formData.get("conceptIdea") ?? "").trim();
  const headline = String(formData.get("headline") ?? "").trim();
  const subline = String(formData.get("subline") ?? "").trim();
  const product = String(formData.get("product") ?? "").trim();
  const promptExtra = String(formData.get("prompt_extra") ?? "").trim();
  const promotionModeRaw = String(formData.get("promotion_mode") ?? "physical").trim();
  const promotionMode = isPromotionMode(promotionModeRaw) ? promotionModeRaw : "physical";
  const imageOutputMode = (String(formData.get("image_output_mode") ?? "single").trim() ||
    "single") as ImageOutputMode;
  const visualStyleId = (String(formData.get("visual_style") ?? "product").trim() ||
    "product") as VisualStyleId;
  const imageCreativeMode = (String(formData.get("image_creative_mode") ?? "promo-ai").trim() ||
    "promo-ai") as ImageCreativeMode;
  const hasProductPhoto = String(formData.get("has_product_photo") ?? "") === "1";

  try {
    const imageUrl = await fal.storage.upload(ref);
    const vision = await analyzeConceptReferenceImage({
      imageUrl,
      conceptIdea: conceptIdea || undefined,
    });
    const fromText = briefFromUserTextOnly({ conceptIdea, headline, subline, promptExtra });
    let brief = mergeUserReferenceBrief(
      briefFromConceptVision(vision, { conceptIdea, headline, subline }),
      fromText,
    );
    if (isContentResearchStyleExtra(promptExtra)) {
      brief = overrideBriefForContentResearch(brief, {
        product: product || headline,
        headline,
        subline,
        conceptIdea,
      });
    }

    const strategy = resolveReferenceStrategy({
      promotionMode,
      imageOutputMode,
      visualStyleId,
      imageCreativeMode,
      hasReferenceUpload: true,
      hasProductPhoto,
      hasReferenceBrief: true,
    });

    return NextResponse.json({ brief, strategy, vision });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Reference analysis failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
