import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/require-app-user";
import { assertFreeDeepSeekQuota } from "@/lib/rate-limit-deepseek";
import {
  parseSocialDripMetaphorPick,
  planSocialDripMetaphor,
} from "@/lib/social-drip";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;
  const quota = await assertFreeDeepSeekQuota(auth.user.userId);
  if (!quota.ok) return quota.response;

  let body: {
    product?: string;
    conceptIdea?: string;
    headline?: string;
    subline?: string;
    business?: string;
    brandName?: string;
    promotionMode?: "physical" | "concept";
    pick?: string;
    locale?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const product = body.product?.trim() || "";
  const conceptIdea = body.conceptIdea?.trim() || "";
  const conceptMode = body.promotionMode === "concept";
  if (!product && !conceptIdea && !body.headline?.trim()) {
    return NextResponse.json(
      { error: "Add a product name, topic, or headline first." },
      { status: 400 },
    );
  }

  try {
    const plan = await planSocialDripMetaphor({
      product,
      conceptIdea,
      headline: body.headline,
      subline: body.subline,
      business: body.business,
      brandName: body.brandName || body.business,
      conceptMode,
      pick: parseSocialDripMetaphorPick(body.pick),
      locale: body.locale,
    });
    return NextResponse.json({
      plan,
      sourceNote:
        plan.source === "deepseek"
          ? "Social-drip metaphor (AI)"
          : plan.source === "user"
            ? "Social-drip metaphor (user override)"
            : "Social-drip metaphor (heuristic fallback)",
    });
  } catch (e: unknown) {
    const message =
      e instanceof Error ? e.message : "Social-drip planning failed.";
    const status =
      message.includes("DEEPSEEK_API_KEY") ||
      message.includes("DeepSeek API") ||
      message.includes("balance")
        ? 503
        : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
