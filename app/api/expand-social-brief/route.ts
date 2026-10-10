import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/require-app-user";
import { assertFreeDeepSeekQuota } from "@/lib/rate-limit-deepseek";
import { expandSocialBrief } from "@/lib/social-brief-expand";
import { parseSocialPackPlatform } from "@/lib/social-pack-plan";

export const runtime = "nodejs";
export const maxDuration = 45;

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

  const seed = String(body.seed ?? body.brief ?? "").trim();
  if (seed.length < 2) {
    return NextResponse.json(
      { error: "Describe the product or concept first." },
      { status: 400 },
    );
  }
  if (seed.length > 4000) {
    return NextResponse.json({ error: "Text is too long." }, { status: 400 });
  }

  const platform = parseSocialPackPlatform(body.platform) ?? "instagram";

  try {
    const brief = await expandSocialBrief({
      seed,
      platform,
      market: String(body.market ?? "").trim() || undefined,
    });
    return NextResponse.json({ brief });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[expand-social-brief]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
