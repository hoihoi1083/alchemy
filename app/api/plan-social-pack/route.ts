import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/require-app-user";
import { assertFreeDeepSeekQuota } from "@/lib/rate-limit-deepseek";
import {
  parseSocialPackPlatform,
  planSocialPack,
} from "@/lib/social-pack-plan";

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

  const brief = String(body.brief ?? "").trim();
  if (brief.length < 8) {
    return NextResponse.json(
      { error: "Tell us what you sell or want to promote (a bit more detail)." },
      { status: 400 },
    );
  }
  if (brief.length > 4000) {
    return NextResponse.json({ error: "Brief is too long." }, { status: 400 });
  }

  const platform = parseSocialPackPlatform(body.platform);
  if (!platform) {
    return NextResponse.json(
      { error: "Pick a platform: Instagram, Facebook, or RedNote." },
      { status: 400 },
    );
  }

  try {
    const plan = await planSocialPack({
      brief,
      platform,
      imageCount: body.imageCount as number | undefined,
      hasProductPhoto: Boolean(body.hasProductPhoto),
      hasStyleRef: Boolean(body.hasStyleRef),
      market: String(body.market ?? "").trim() || undefined,
    });
    return NextResponse.json({ plan });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[plan-social-pack]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
