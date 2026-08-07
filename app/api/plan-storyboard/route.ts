import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/require-app-user";
import { assertFreeDeepSeekQuota } from "@/lib/rate-limit-deepseek";
import type { PromptMarket, SubjectFraming } from "@/lib/prompt-variables";
import { planVideoStoryboard } from "@/lib/video-storyboard-plan";
import type { BrandProfile } from "@/lib/brand-profile";
import { parseBrandKit } from "@/lib/brand-kit";
import { parseStoryboardSceneCount } from "@/lib/ad-pack-preferences";
import { brandKitWantsLogo } from "@/lib/brand-merge";
import { mergePromptExtra, type VisualStyleId } from "@/lib/visual-styles";
import { resolveArtStyleId } from "@/lib/art-style";
import { parseStrategyFromFormData } from "@/lib/reference-strategy";
import { isPromotionMode } from "@/lib/promotion-mode";
import { wizardPromoteName } from "@/lib/wizard-promote-name";

export const runtime = "nodejs";
export const maxDuration = 90;

export async function POST(request: Request) {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;
  const quota = await assertFreeDeepSeekQuota(auth.user.userId);
  if (!quota.ok) return quota.response;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const promotionModeRaw = String(formData.get("promotion_mode") ?? "").trim();
  const promotionMode = isPromotionMode(promotionModeRaw) ? promotionModeRaw : "physical";
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

  const business = (formData.get("business") as string | null)?.trim() || "";
  const subline = (formData.get("subline") as string | null)?.trim() || "";
  const offer = (formData.get("offer") as string | null)?.trim() || "";
  const storyboardBrief = (formData.get("storyboard_brief") as string | null)?.trim() || "";
  const promptMarket = ((formData.get("prompt_market") as string | null)?.trim() ||
    "en") as PromptMarket;
  const subjectFraming = ((formData.get("subject_framing") as string | null)?.trim() ||
    "auto") as SubjectFraming;
  const promptExtra = (formData.get("prompt_extra") as string | null)?.trim() || "";
  const durationRaw = (formData.get("duration") as string | null)?.trim() || "8";
  const durationSec = (() => {
    if (durationRaw === "auto") return 10;
    const n = parseInt(durationRaw, 10);
    if (Number.isNaN(n)) return 10;
    return Math.min(15, Math.max(4, n));
  })();
  const sceneCountTarget = parseStoryboardSceneCount(
    (formData.get("scene_count") as string | null)?.trim() || "auto",
  );
  const visualStyle = ((formData.get("visual_style") as string | null)?.trim() ||
    "storyboard-video") as VisualStyleId;
  const artStyleId = resolveArtStyleId((formData.get("art_style") as string | null)?.trim());
  const styleHint = mergePromptExtra(visualStyle, promptExtra);
  const { strategy } = parseStrategyFromFormData(formData);

  let brandProfile: BrandProfile | null = null;
  const brandProfileRaw = (formData.get("brand_profile") as string | null)?.trim() || "";
  if (brandProfileRaw) {
    try {
      brandProfile = JSON.parse(brandProfileRaw) as BrandProfile;
    } catch {
      /* ignore */
    }
  }

  let useBrandLogo = false;
  const brandKitRaw = (formData.get("brand_kit") as string | null)?.trim() || "";
  if (brandKitRaw) {
    try {
      const kit = parseBrandKit(JSON.parse(brandKitRaw));
      useBrandLogo = brandKitWantsLogo(kit);
    } catch {
      /* ignore */
    }
  }

  try {
    const plan = await planVideoStoryboard({
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
      useBrandLogo,
      conceptMode: promotionMode === "concept",
    });
    return NextResponse.json({ plan, seedancePrompt: plan.seedancePrompt });
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
