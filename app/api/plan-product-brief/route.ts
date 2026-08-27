import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/require-app-user";
import { assertFreeDeepSeekQuota } from "@/lib/rate-limit-deepseek";
import { planProductBrief } from "@/lib/product-brief-plan";
import { asPromptMarket } from "@/lib/prompts";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;
  const quota = await assertFreeDeepSeekQuota(auth.user.userId);
  if (!quota.ok) return quota.response;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const product = String(body.product ?? "").trim();
  if (!product) {
    return NextResponse.json({ error: "product is required" }, { status: 400 });
  }

  const market = asPromptMarket(body.market);
  const workflowMode =
    body.workflowMode === "image-only" ||
    body.workflowMode === "video-only" ||
    body.workflowMode === "combined"
      ? body.workflowMode
      : undefined;

  try {
    const draft = await planProductBrief({
      product,
      business: String(body.business ?? "").trim() || undefined,
      headline: String(body.headline ?? "").trim() || undefined,
      subline: String(body.subline ?? "").trim() || undefined,
      offer: String(body.offer ?? "").trim() || undefined,
      promptExtra: String(body.promptExtra ?? "").trim() || undefined,
      visualStyleId: String(body.visualStyleId ?? "").trim() || undefined,
      templateHint: String(body.templateHint ?? "").trim() || undefined,
      workflowMode,
      market,
    });
    return NextResponse.json({ draft });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[plan-product-brief]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
