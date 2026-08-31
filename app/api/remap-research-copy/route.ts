import { NextResponse } from "next/server";
import { assertPlatformResearchAllowed } from "@/lib/billing/assert-platform-research";
import { requireAppUser } from "@/lib/require-app-user";
import { assertFreeDeepSeekQuota } from "@/lib/rate-limit-deepseek";
import { remapResearchCopyToSubject } from "@/lib/research-copy-remap";
import { asPromptMarket } from "@/lib/prompts";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;
  const gated = await assertPlatformResearchAllowed(auth.user.userId);
  if (gated) return gated;
  const quota = await assertFreeDeepSeekQuota(auth.user.userId);
  if (!quota.ok) return quota.response;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const productOrConcept = String(body.productOrConcept ?? "").trim();
  if (!productOrConcept) {
    return NextResponse.json(
      { error: "productOrConcept is required" },
      { status: 400 },
    );
  }

  const promotionMode =
    body.promotionMode === "concept" ? "concept" : "physical";
  const market = asPromptMarket(body.market);

  const bullets = Array.isArray(body.referenceBullets)
    ? body.referenceBullets.map((b) => String(b).trim()).filter(Boolean)
    : undefined;

  try {
    const draft = await remapResearchCopyToSubject({
      promotionMode,
      productOrConcept,
      market,
      referenceTitle: String(body.referenceTitle ?? "").trim() || undefined,
      referenceHook: String(body.referenceHook ?? "").trim() || undefined,
      referenceBullets: bullets,
      referenceCta: String(body.referenceCta ?? "").trim() || undefined,
      referenceSnippet: String(body.referenceSnippet ?? "").trim() || undefined,
      existingHeadline: String(body.existingHeadline ?? "").trim() || undefined,
      existingSubline: String(body.existingSubline ?? "").trim() || undefined,
      existingOffer: String(body.existingOffer ?? "").trim() || undefined,
    });
    return NextResponse.json({ draft });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[remap-research-copy]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
