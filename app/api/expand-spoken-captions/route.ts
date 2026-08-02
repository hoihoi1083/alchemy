import { NextResponse } from "next/server";
import type { CaptionLine } from "@/lib/ad-pack-types";
import { VOICEOVER_LOCALES, type VoiceoverLocale } from "@/lib/ad-pack-preferences";
import { chargeTokens, refundTokens } from "@/lib/billing/charge";
import { TOKEN_COST } from "@/lib/billing/token-costs";
import { expandSpokenForCaptions } from "@/lib/expand-spoken-captions";
import { requireAppUser } from "@/lib/require-app-user";
import { SERVER_ERRORS } from "@/lib/api/server-errors";

export const runtime = "nodejs";
export const maxDuration = 60;

function parseCaptionLines(raw: unknown): CaptionLine[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const text = String((row as { text?: unknown }).text ?? "").trim();
      if (!text) return null;
      const startSec = Math.max(0, Number((row as { startSec?: unknown }).startSec) || 0);
      const endSec = Math.max(
        startSec + 0.2,
        Number((row as { endSec?: unknown }).endSec) || startSec + 2,
      );
      const spokenRaw = String((row as { spokenText?: unknown }).spokenText ?? "").trim();
      return {
        startSec,
        endSec,
        text,
        ...(spokenRaw ? { spokenText: spokenRaw } : {}),
      } satisfies CaptionLine;
    })
    .filter(Boolean) as CaptionLine[];
}

export async function POST(request: Request) {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;

  let body: {
    caption_lines?: unknown;
    locale?: string;
    product?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: SERVER_ERRORS.invalidInput }, { status: 400 });
  }

  const captionLines = parseCaptionLines(body.caption_lines);
  if (captionLines.length < 1) {
    return NextResponse.json(
      { error: "caption_lines with text is required." },
      { status: 400 },
    );
  }

  const locale = (body.locale?.trim() || "hk") as VoiceoverLocale;
  if (!VOICEOVER_LOCALES.includes(locale)) {
    return NextResponse.json({ error: "Invalid locale." }, { status: 400 });
  }

  const tokenCost = TOKEN_COST.plan;
  const charged = await chargeTokens(auth.user.userId, tokenCost, {
    kind: "caption_expand_spoken",
  });
  if ("error" in charged) return charged.error;

  try {
    const result = await expandSpokenForCaptions({
      captionLines,
      locale,
      product: body.product,
    });
    return NextResponse.json({
      ...result,
      tokensCharged: tokenCost,
      creditBalance: charged.balanceAfter,
    });
  } catch (e: unknown) {
    await refundTokens(auth.user.userId, tokenCost, {
      kind: "caption_expand_spoken",
      reason: "expand_failed",
    });
    const message = e instanceof Error ? e.message : SERVER_ERRORS.generationFailed;
    const status =
      message.includes("DEEPSEEK") || message.includes("DeepSeek") ? 503 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
