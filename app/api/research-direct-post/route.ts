import { NextResponse } from "next/server";
import { assertPlatformResearchAllowed } from "@/lib/billing/assert-platform-research";
import { planContentResearchFromDirectPost } from "@/lib/content-research-direct-post";
import { normalizePostUrlInput } from "@/lib/content-research-post-url";
import { requireAppUser } from "@/lib/require-app-user";
import { asPromptMarket, type PromptMarket } from "@/lib/prompt-variables";

export const runtime = "nodejs";
export const maxDuration = 60;

type DirectPostBody = {
  postUrl?: string;
  topic?: string;
  product?: string;
  platform?: string;
  market?: PromptMarket;
  promotionMode?: "physical" | "concept";
  mediaFilter?: "image" | "video";
};

export async function POST(request: Request) {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;
  const gated = await assertPlatformResearchAllowed(auth.user.userId);
  if (gated) return gated;

  let body: DirectPostBody;
  try {
    body = (await request.json()) as DirectPostBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const postUrl = normalizePostUrlInput(String(body.postUrl ?? ""));
  if (!postUrl) {
    return NextResponse.json({ error: "Paste a post link first." }, { status: 400 });
  }

  try {
    const plan = await planContentResearchFromDirectPost({
      postUrl,
      topic: body.topic?.trim() || body.product?.trim(),
      product: body.product?.trim(),
      market: asPromptMarket(body.market) ?? "hk",
      promotionMode:
        body.promotionMode === "physical" || body.promotionMode === "concept"
          ? body.promotionMode
          : "concept",
      // Paste-link wins: ignore keyword-search platform chips and workflow media filter.
      mediaFilter: undefined,
    });

    const filterNote =
      plan.mediaFilter === "image"
        ? " · image/carousel"
        : plan.mediaFilter === "video"
          ? " · video/reel"
          : "";

    return NextResponse.json({
      plan,
      sourceNote: `Pinned reference post (Just One API)${filterNote}`,
      researchWarning: plan.researchWarning ?? null,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Could not load this post.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
