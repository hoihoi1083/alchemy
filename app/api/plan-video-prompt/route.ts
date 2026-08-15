import type { BrandProfile } from "@/lib/brand-profile";
import {
  planCreativeVideoPrompt,
  planProductVideoPrompt,
  planVideoPrompt,
} from "@/lib/video-prompt-plan";
import { resolveArtStyleId, type ArtStyleId } from "@/lib/art-style";
import type { SubjectFraming } from "@/lib/prompt-variables";
import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/require-app-user";
import { assertFreeDeepSeekQuota } from "@/lib/rate-limit-deepseek";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;
  const quota = await assertFreeDeepSeekQuota(auth.user.userId);
  if (!quota.ok) return quota.response;

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
    artStyleId?: ArtStyleId | string;
    subjectFraming?: SubjectFraming | string;
    promptExtra?: string;
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
    artStyleId: resolveArtStyleId(body.artStyleId),
    subjectFraming: body.subjectFraming,
    promptExtra: body.promptExtra,
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
        brandProfile: body.brandProfile,
      });
      return NextResponse.json({
        ...plan,
        sourceNote: "Creative video motion prompt (AI)",
      });
    }

    if (mode === "brand") {
      const profile = body.brandProfile;
      if (profile?.businessName) {
        const plan = await planVideoPrompt({ brandProfile: profile, ...shared });
        return NextResponse.json({
          ...plan,
          sourceNote: "Video motion prompt from brand analysis (AI)",
        });
      }
      // No brand analysis — fall through to product-context planner.
    }

    const plan = await planProductVideoPrompt(shared);
    return NextResponse.json({
      ...plan,
      sourceNote: "Video motion prompt from product context (AI)",
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
