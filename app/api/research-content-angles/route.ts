import { NextResponse } from "next/server";
import { isContentPlatform, planContentResearch } from "@/lib/content-research-plan";
import { requireAppUser } from "@/lib/require-app-user";
import type { PromptMarket } from "@/lib/prompt-variables";

export const runtime = "nodejs";
export const maxDuration = 120;

type ResearchBody = {
  topic?: string;
  platform?: string;
  market?: PromptMarket;
  promotionMode?: "physical" | "concept";
  product?: string;
  business?: string;
  usePlaybookOnly?: boolean;
  mediaFilter?: "image" | "video";
};

export async function POST(request: Request) {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;

  let body: ResearchBody;
  try {
    body = (await request.json()) as ResearchBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const topic = String(body.topic ?? body.product ?? "").trim();
  const platform = String(body.platform ?? "").trim();

  if (!topic) {
    return NextResponse.json({ error: "Enter a product or topic." }, { status: 400 });
  }
  if (!isContentPlatform(platform)) {
    return NextResponse.json({ error: "Pick a supported platform." }, { status: 400 });
  }

  try {
    const usePlaybookOnly = Boolean(body.usePlaybookOnly);
    const plan = await planContentResearch({
      topic,
      platform,
      market:
        body.market === "hk" || body.market === "cn" || body.market === "en"
          ? body.market
          : "hk",
      promotionMode:
        body.promotionMode === "physical" || body.promotionMode === "concept"
          ? body.promotionMode
          : "concept",
      product: body.product?.trim(),
      business: body.business?.trim(),
      usePlaybookOnly,
      mediaFilter: body.mediaFilter === "image" || body.mediaFilter === "video" ? body.mediaFilter : undefined,
    });
    const filterNote =
      plan.mediaFilter === "image"
        ? " · image/carousel posts only"
        : plan.mediaFilter === "video"
          ? " · video/reels only"
          : "";
    const sourceNote =
      plan.researchMode === "live-web"
        ? plan.searchProvider === "justoneapi"
          ? `${plan.platformLabel} 貼文搜尋 (Just One API) — ${plan.posts?.length ?? 0} posts · ${plan.candidates.length} directions${filterNote} · DeepSeek synthesis`
          : `Live web research (${plan.searchProvider}) — ${plan.sources?.length ?? 0} sources${filterNote} · DeepSeek synthesis`
        : "AI playbook suggestions (no web search)";
    return NextResponse.json({
      plan,
      sourceNote,
      researchWarning: plan.researchWarning ?? null,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Content research failed.";
    const status =
      message.includes("DEEPSEEK_API_KEY") ||
      message.includes("DeepSeek API") ||
      message.includes("balance")
        ? 503
        : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
