import { NextResponse } from "next/server";
import { chargeTokens, refundTokens } from "@/lib/billing/charge";
import {
  estimateCaptionVideoEditTokens,
} from "@/lib/billing/token-costs";
import {
  runCaptionVideoEdit,
} from "@/lib/caption-video-edit";
import type { CaptionEditJob } from "@/lib/byteplus-seedance-edit";
import { requireAppUser } from "@/lib/require-app-user";

export const runtime = "nodejs";
export const maxDuration = 300;

const JOBS = new Set<CaptionEditJob>(["product", "scene", "style"]);

export async function POST(request: Request) {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;

  let body: {
    video_url?: string;
    image_url?: string;
    job?: string;
    note?: string;
    duration_sec?: number;
    resolution?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const videoUrl = body.video_url?.trim();
  if (!videoUrl) {
    return NextResponse.json({ error: "video_url is required." }, { status: 400 });
  }
  const job = (body.job || "product") as CaptionEditJob;
  if (!JOBS.has(job)) {
    return NextResponse.json(
      { error: "job must be product, scene, or style." },
      { status: 400 },
    );
  }

  const durationSec = Math.max(
    4,
    Math.min(15, Math.round(Number(body.duration_sec) || 8)),
  );
  const resolution =
    body.resolution === "480p" || body.resolution === "720p"
      ? body.resolution
      : "720p";
  const tokenCost = estimateCaptionVideoEditTokens(durationSec);

  const charged = await chargeTokens(auth.user.userId, tokenCost, {
    kind: "video",
    captionEditJob: job,
    resolution,
    durationSec,
  });
  if ("error" in charged) return charged.error;

  try {
    const out = await runCaptionVideoEdit({
      clerkId: auth.user.userId,
      videoUrl,
      imageUrl: body.image_url?.trim(),
      job,
      note: body.note,
      durationSec,
      resolution,
    });
    return NextResponse.json({
      videoUrl: out.videoUrl,
      provider: out.provider,
      model: out.modelOrEndpoint,
      tokensCharged: tokenCost,
      creditBalance: charged.balanceAfter,
      job,
    });
  } catch (e) {
    await refundTokens(auth.user.userId, tokenCost, {
      kind: "video",
      captionEditJob: job,
      reason: "generation_failed",
    });
    const message = e instanceof Error ? e.message : "Video edit failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
