import { NextResponse } from "next/server";
import { planContentResearchFromDirectPost } from "@/lib/content-research-direct-post";
import { detectPlatformFromPostUrl, normalizePostUrlInput } from "@/lib/content-research-post-url";
import { isContentPlatform } from "@/lib/content-research-plan";
import { requireAppUser } from "@/lib/require-app-user";
import type { PromptMarket } from "@/lib/prompt-variables";

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

  const platformOverride = String(body.platform ?? "").trim();
  const detected = detectPlatformFromPostUrl(postUrl);
  if (platformOverride && isContentPlatform(platformOverride) && detected && platformOverride !== detected) {
    return NextResponse.json(
      { error: `Link looks like ${detected}, but ${platformOverride} is selected. Clear platform or match the link.` },
      { status: 400 },
    );
  }

  try {
    const plan = await planContentResearchFromDirectPost({
      postUrl,
      topic: body.topic?.trim() || body.product?.trim(),
      product: body.product?.trim(),
      market:
        body.market === "hk" || body.market === "cn" || body.market === "en"
          ? body.market
          : "hk",
      promotionMode:
        body.promotionMode === "physical" || body.promotionMode === "concept"
          ? body.promotionMode
          : "concept",
      mediaFilter: body.mediaFilter === "image" || body.mediaFilter === "video" ? body.mediaFilter : undefined,
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
