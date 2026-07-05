import { NextResponse } from "next/server";
import { clampCinematicSceneCount } from "@/lib/cinematic-scene-config";
import { planCinematicReel } from "@/lib/cinematic-reel-plan";
import { resolveArtStyleId } from "@/lib/art-style";
import type { PromptMarket } from "@/lib/prompt-variables";
import { requireAppUser } from "@/lib/require-app-user";
import { SERVER_ERRORS } from "@/lib/api/server-errors";

export const runtime = "nodejs";
export const maxDuration = 90;

export async function POST(request: Request) {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;

  let body: {
    product?: string;
    headline?: string;
    subline?: string;
    business?: string;
    offer?: string;
    creativeBrief?: string;
    promptExtra?: string;
    promptMarket?: PromptMarket;
    referenceImageNote?: string;
    sceneCount?: number;
    artStyleId?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: SERVER_ERRORS.invalidInput }, { status: 400 });
  }

  const creativeBrief = body.creativeBrief?.trim() || body.headline?.trim() || "";
  if (!creativeBrief) {
    return NextResponse.json({ error: "Creative brief or headline is required." }, { status: 400 });
  }

  try {
    const sceneCount = clampCinematicSceneCount(body.sceneCount ?? 3);
    const plan = await planCinematicReel(
      {
        product: body.product ?? "",
        headline: body.headline ?? "",
        subline: body.subline ?? "",
        business: body.business ?? "",
        offer: body.offer ?? "",
        creativeBrief,
        promptExtra: body.promptExtra ?? "",
        market: body.promptMarket ?? "hk",
        referenceImageNote: body.referenceImageNote,
        artStyleId: resolveArtStyleId(body.artStyleId),
      },
      sceneCount,
    );
    return NextResponse.json({ plan });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : SERVER_ERRORS.generationFailed;
    const status = message.includes("DEEPSEEK") ? 503 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
