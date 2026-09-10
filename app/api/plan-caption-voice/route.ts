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
    start_sec?: number;
    end_sec?: number;
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
  const startSec = Number(body.start_sec);
  const endSec = Number(body.end_sec);
  const sectionMode =
    Number.isFinite(startSec) &&
    Number.isFinite(endSec) &&
    endSec > startSec + 0.4;
  const planDuration = sectionMode
    ? Math.max(2, endSec - startSec)
    : videoDurationSec;
  if (!Number.isFinite(planDuration) || planDuration < 2) {
    return NextResponse.json(
      { error: "video_duration_sec must be at least 2 (or provide start_sec/end_sec)." },
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
      videoDurationSec: planDuration,
      lineCount: sectionMode ? body.line_count ?? 1 : body.line_count,
      startSec: sectionMode ? startSec : undefined,
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
