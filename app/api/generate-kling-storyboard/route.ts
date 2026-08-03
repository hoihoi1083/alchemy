import { fal } from "@fal-ai/client";
import { NextResponse } from "next/server";
import { chargeTokens, refundTokens } from "@/lib/billing/charge";
import {
  collectKlingFallbackImageUrls,
  countKlingFallbackImageSources,
  formatKlingFalError,
  klingStoryboardTokenCost,
  parseKlingScenesMeta,
  resolveKlingClipDurations,
  resolveKlingScenesMeta,
  runKlingStoryboardFallback,
} from "@/lib/kling-storyboard-run";
import { requireAppUser, trackUsage } from "@/lib/require-app-user";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Animate storyboard stills with Kling I2V, then stitch.
 * Charged at Kling COGS-aligned tokens.
 *
 * Charge BEFORE fal.storage.upload so insufficient balance never burns operator COGS.
 * Accepts either multipart `images` files or `reference_image_urls` (preferred).
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

  // Count inputs without uploading — validate + charge first.
  const sourceCount = countKlingFallbackImageSources(formData);
  if (!sourceCount) {
    return NextResponse.json(
      { error: "Upload at least one storyboard scene image." },
      { status: 400 },
    );
  }
  if (sourceCount > 9) {
    return NextResponse.json({ error: "At most 9 storyboard scenes." }, { status: 400 });
  }

  const expectedRaw = (formData.get("expected_scene_count") as string | null)?.trim();
  const expectedCount = expectedRaw ? Number(expectedRaw) : 0;
  if (
    Number.isFinite(expectedCount) &&
    expectedCount > 0 &&
    sourceCount < expectedCount
  ) {
    return NextResponse.json(
      {
        error: `Only ${sourceCount} of ${expectedCount} scene images could be loaded for video. Re-generate the missing still (often the last scene URL expired), then try again.`,
      },
      { status: 400 },
    );
  }

  const theme = (formData.get("theme") as string | null)?.trim() || "";
  const totalDurationRaw = (formData.get("total_duration_sec") as string | null)?.trim();
  const totalDurationSec = totalDurationRaw ? Number(totalDurationRaw) || 8 : 8;

  const clientMeta = parseKlingScenesMeta(formData.get("scenes_meta") as string | null);
  const scenesMetaForBilling = resolveKlingScenesMeta(sourceCount, clientMeta);
  const clipDurations = resolveKlingClipDurations(
    sourceCount,
    totalDurationSec,
    scenesMetaForBilling,
  );
  const tokenCost = klingStoryboardTokenCost(clipDurations);

  const charged = await chargeTokens(auth.user.userId, tokenCost, {
    kind: "kling_storyboard_fallback",
    sceneCount: sourceCount,
    clipDurations,
  });
  if ("error" in charged) return charged.error;
  const balanceAfter = charged.balanceAfter;

  let imageUrls: string[];
  try {
    imageUrls = await collectKlingFallbackImageUrls(formData, {
      clerkId: auth.user.userId,
    });
  } catch (e: unknown) {
    await refundTokens(auth.user.userId, tokenCost, {
      kind: "kling_storyboard_fallback",
      reason: "image_materialize_failed",
    });
    const message = e instanceof Error ? e.message : "Failed to read storyboard images.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (!imageUrls.length) {
    await refundTokens(auth.user.userId, tokenCost, {
      kind: "kling_storyboard_fallback",
      reason: "no_images_after_charge",
    });
    return NextResponse.json(
      { error: "Upload at least one storyboard scene image." },
      { status: 400 },
    );
  }
  if (
    Number.isFinite(expectedCount) &&
    expectedCount > 0 &&
    imageUrls.length < expectedCount
  ) {
    await refundTokens(auth.user.userId, tokenCost, {
      kind: "kling_storyboard_fallback",
      reason: "incomplete_scene_images",
    });
    return NextResponse.json(
      {
        error: `Only ${imageUrls.length} of ${expectedCount} scene images could be loaded for video. Re-generate the missing still (often the last scene URL expired), then try again.`,
      },
      { status: 400 },
    );
  }

  const scenesMeta = resolveKlingScenesMeta(imageUrls.length, clientMeta);

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
