import { NextResponse } from "next/server";
import { VOICEOVER_LOCALES, type VoiceoverLocale } from "@/lib/ad-pack-preferences";
import { chargeTokens, refundTokens } from "@/lib/billing/charge";
import { TOKEN_COST } from "@/lib/billing/token-costs";
import { planCaptionVoice } from "@/lib/plan-caption-voice";
import { requireAppUser } from "@/lib/require-app-user";
import { SERVER_ERRORS } from "@/lib/api/server-errors";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;

  let body: {
    topic?: string;
    locale?: string;
    video_duration_sec?: number;
    line_count?: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: SERVER_ERRORS.invalidInput }, { status: 400 });
  }

  const topic = body.topic?.trim() ?? "";
  if (!topic) {
    return NextResponse.json({ error: "topic is required." }, { status: 400 });
  }

  const locale = (body.locale?.trim() || "hk") as VoiceoverLocale;
  if (!VOICEOVER_LOCALES.includes(locale)) {
    return NextResponse.json({ error: "Invalid locale." }, { status: 400 });
  }

  const videoDurationSec = Number(body.video_duration_sec);
  if (!Number.isFinite(videoDurationSec) || videoDurationSec < 2) {
    return NextResponse.json(
      { error: "video_duration_sec must be at least 2." },
      { status: 400 },
    );
  }

  const tokenCost = TOKEN_COST.plan;
  const charged = await chargeTokens(auth.user.userId, tokenCost, {
    kind: "caption_plan",
  });
  if ("error" in charged) return charged.error;

  try {
    const result = await planCaptionVoice({
      topic,
      locale,
      videoDurationSec,
      lineCount: body.line_count,
    });
    return NextResponse.json({
      ...result,
      tokensCharged: tokenCost,
      creditBalance: charged.balanceAfter,
    });
  } catch (e: unknown) {
    await refundTokens(auth.user.userId, tokenCost, {
      kind: "caption_plan",
      reason: "plan_failed",
    });
    const message = e instanceof Error ? e.message : SERVER_ERRORS.generationFailed;
    const status =
      message.includes("DEEPSEEK") || message.includes("DeepSeek") ? 503 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
