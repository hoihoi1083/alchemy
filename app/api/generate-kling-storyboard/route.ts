import { fal } from "@fal-ai/client";
import { NextResponse } from "next/server";
import { chargeTokens, refundTokens } from "@/lib/billing/charge";
import {
  collectKlingFallbackImageUrls,
  formatKlingFalError,
  klingStoryboardTokenCost,
  resolveKlingClipDurations,
  runKlingStoryboardFallback,
  type KlingSceneMeta,
} from "@/lib/kling-storyboard-run";
import { requireAppUser, trackUsage } from "@/lib/require-app-user";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Seedance face-policy fallback: animate each storyboard still with Kling I2V, then stitch.
 * Charged at Kling COGS-aligned tokens (cheaper than Seedance R2V for multi-scene).
 *
 * Accepts either multipart `images` files or `reference_image_urls` (preferred — avoids
 * Vercel 413 when re-uploading multi-MB scene PNGs).
 */
export async function POST(request: Request) {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;

  const key = process.env.FAL_KEY?.trim();
  if (!key) {
    return NextResponse.json(
      { error: "Video generation is temporarily unavailable. Please try again later." },
      { status: 503 },
    );
  }
  fal.config({ credentials: key });

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  let imageUrls: string[];
  try {
    imageUrls = await collectKlingFallbackImageUrls(formData);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to read storyboard images.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (!imageUrls.length) {
    return NextResponse.json(
      { error: "Upload at least one storyboard scene image." },
      { status: 400 },
    );
  }
  if (imageUrls.length > 9) {
    return NextResponse.json({ error: "At most 9 storyboard scenes." }, { status: 400 });
  }

  const theme = (formData.get("theme") as string | null)?.trim() || "";
  const totalDurationRaw = (formData.get("total_duration_sec") as string | null)?.trim();
  const totalDurationSec = totalDurationRaw ? Number(totalDurationRaw) || 8 : 8;

  let scenesMeta: KlingSceneMeta[] = [];
  const metaRaw = (formData.get("scenes_meta") as string | null)?.trim();
  if (metaRaw) {
    try {
      const parsed = JSON.parse(metaRaw) as unknown;
      if (Array.isArray(parsed)) scenesMeta = parsed as KlingSceneMeta[];
    } catch {
      /* ignore */
    }
  }

  const clipDurations = resolveKlingClipDurations(
    imageUrls.length,
    totalDurationSec,
    scenesMeta,
  );
  const tokenCost = klingStoryboardTokenCost(clipDurations);

  const charged = await chargeTokens(auth.user.userId, tokenCost, {
    kind: "kling_storyboard_fallback",
    sceneCount: imageUrls.length,
    clipDurations,
  });
  if ("error" in charged) return charged.error;
  const balanceAfter = charged.balanceAfter;

  try {
    const result = await runKlingStoryboardFallback({
      request,
      clerkId: auth.user.userId,
      imageUrls,
      theme,
      totalDurationSec,
      scenesMeta,
    });
    await trackUsage(auth.user.userId, "video");
    return NextResponse.json({
      ...result,
      tokensCharged: tokenCost,
      creditBalance: balanceAfter,
    });
  } catch (e: unknown) {
    await refundTokens(auth.user.userId, tokenCost, {
      kind: "kling_storyboard_fallback",
      reason: "generation_failed",
    });
    return NextResponse.json({ error: formatKlingFalError(e) }, { status: 502 });
  }
}
