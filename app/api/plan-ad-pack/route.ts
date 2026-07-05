import { NextResponse } from "next/server";
import { planAdPack } from "@/lib/ad-pack-plan";
import type { PromptMarket } from "@/lib/prompt-variables";
import type { MusicMood } from "@/lib/ad-pack-preferences";
import type { StoryboardScenePlan } from "@/lib/video-storyboard-types";
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
    promptMarket?: PromptMarket;
    durationSec?: number;
    brandProfile?: unknown;
    videoPrompt?: string;
    promptExtra?: string;
    storyboardScenes?: StoryboardScenePlan[];
    musicMood?: MusicMood;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: SERVER_ERRORS.invalidInput }, { status: 400 });
  }

  try {
    const plan = await planAdPack({
      product: body.product ?? "",
      headline: body.headline ?? "",
      subline: body.subline ?? "",
      business: body.business ?? "",
      offer: body.offer ?? "",
      promptMarket: body.promptMarket ?? "hk",
      durationSec: body.durationSec ?? 10,
      brandProfile: body.brandProfile as Parameters<typeof planAdPack>[0]["brandProfile"],
      videoPrompt: body.videoPrompt,
      promptExtra: body.promptExtra,
      storyboardScenes: body.storyboardScenes,
      musicMood: body.musicMood,
    });
    return NextResponse.json({ plan });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : SERVER_ERRORS.generationFailed;
    const status = message.includes("DEEPSEEK") ? 503 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
