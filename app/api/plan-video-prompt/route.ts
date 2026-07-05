import type { BrandProfile } from "@/lib/brand-profile";
import {
  planCreativeVideoPrompt,
  planProductVideoPrompt,
  planVideoPrompt,
} from "@/lib/video-prompt-plan";
import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/require-app-user";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;

  let body: {
    mode?: "brand" | "creative" | "product";
    brandProfile?: BrandProfile;
    creativeBrief?: string;
    product?: string;
    business?: string;
    headline?: string;
    subline?: string;
    offer?: string;
    duration?: string;
    hasReferenceVideo?: boolean;
    textToVideo?: boolean;
    promotionMode?: "physical" | "concept";
    hasKeyframe?: boolean;
    imageVisionNote?: string;
    conceptIdea?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const mode =
    body.mode === "creative" || body.mode === "brand" || body.mode === "product"
      ? body.mode
      : "product";
  const shared = {
    product: body.product,
    business: body.business,
    headline: body.headline,
    subline: body.subline,
    offer: body.offer,
    duration: body.duration,
    hasReferenceVideo: body.hasReferenceVideo,
  };

  try {
    if (mode === "creative") {
      const brief = body.creativeBrief?.trim() || "";
      if (!brief) {
        return NextResponse.json(
          { error: "Describe your creative video idea first." },
          { status: 400 },
        );
      }
      const plan = await planCreativeVideoPrompt({
        creativeBrief: brief,
        ...shared,
        textToVideo: Boolean(body.textToVideo),
        promotionMode: body.promotionMode,
        hasKeyframe: Boolean(body.hasKeyframe),
        imageVisionNote: body.imageVisionNote,
        conceptIdea: body.conceptIdea,
      });
      return NextResponse.json({
        ...plan,
        sourceNote: "Seedance creative video prompt (DeepSeek)",
      });
    }

    if (mode === "brand") {
      const profile = body.brandProfile;
      if (!profile?.businessName) {
        return NextResponse.json(
          { error: "Analyze the brand first (website or social hint)." },
          { status: 400 },
        );
      }
      const plan = await planVideoPrompt({ brandProfile: profile, ...shared });
      return NextResponse.json({
        ...plan,
        sourceNote: "Seedance video prompt from brand analysis (DeepSeek)",
      });
    }

    const plan = await planProductVideoPrompt(shared);
    return NextResponse.json({
      ...plan,
      sourceNote: "Seedance video prompt from product context (DeepSeek)",
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Video prompt planning failed.";
    const status =
      message.includes("DEEPSEEK_API_KEY") ||
      message.includes("DeepSeek API") ||
      message.includes("balance")
        ? 503
        : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
