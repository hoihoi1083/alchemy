import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/require-app-user";
import { assertFreeDeepSeekQuota } from "@/lib/rate-limit-deepseek";
import { planVideoScriptVariants } from "@/lib/plan-video-variants";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;
  const quota = await assertFreeDeepSeekQuota(auth.user.userId);
  if (!quota.ok) return quota.response;

  let body: {
    product?: string;
    headline?: string;
    subline?: string;
    business?: string;
    offer?: string;
    videoPrompt?: string;
    count?: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.product?.trim()) {
    return NextResponse.json({ error: "product is required." }, { status: 400 });
  }

  try {
    const variants = await planVideoScriptVariants({
      product: body.product,
      headline: body.headline,
      subline: body.subline,
      business: body.business,
      offer: body.offer,
      videoPrompt: body.videoPrompt,
      count: body.count,
    });
    return NextResponse.json({ variants });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Could not plan video variants.";
    const status = message.includes("DEEPSEEK") ? 503 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
