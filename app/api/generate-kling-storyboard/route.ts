import { fal } from "@fal-ai/client";
import { NextResponse } from "next/server";
import {
  chargeTokens,
  refundTokens,
  videoTokenCostFromRequest,
} from "@/lib/billing/charge";
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
import {
  buildStoryboardMinimaxH3Prompt,
  clampMinimaxH3Duration,
  collectMinimaxH3FallbackVideoUrls,
  runMinimaxH3Fallback,
} from "@/lib/minimax-h3-run";
import { requireAppUser, trackUsage } from "@/lib/require-app-user";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Storyboard video:
 * 1) MiniMax H3 — one multimodal R2V from all scene stills (no stitch)
 * 2) Kling I2V per still + stitch if H3 fails
 *
 * Charge before fal.storage upload so insufficient balance never burns operator COGS.
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
  const motionPrompt =
    (formData.get("motion_prompt") as string | null)?.trim() ||
    (formData.get("seedance_prompt") as string | null)?.trim() ||
    "";
  const totalDurationRaw = (formData.get("total_duration_sec") as string | null)?.trim();
  const totalDurationSec = totalDurationRaw ? Number(totalDurationRaw) || 8 : 8;
  const aspectRatio =
    (formData.get("aspect_ratio") as string | null)?.trim() || "9:16";

  const clientMeta = parseKlingScenesMeta(formData.get("scenes_meta") as string | null);
  const scenesMetaForBilling = resolveKlingScenesMeta(sourceCount, clientMeta);
  const clipDurations = resolveKlingClipDurations(
    sourceCount,
    totalDurationSec,
    scenesMetaForBilling,
  );

  const h3Duration = clampMinimaxH3Duration(totalDurationSec);
  const h3Cost = videoTokenCostFromRequest({
    duration: h3Duration,
    resolution: "720p",
    fast: false,
  });

  // Charge H3 first (before fal upload), then materialize media.
  const h3Charged = await chargeTokens(auth.user.userId, h3Cost, {
    kind: "minimax_h3",
    via: "storyboard_primary",
    sceneCount: sourceCount,
  });
  if ("error" in h3Charged) return h3Charged.error;

  let imageUrls: string[];
  let videoUrls: string[];
  try {
    imageUrls = await collectKlingFallbackImageUrls(formData, {
      clerkId: auth.user.userId,
    });
    videoUrls = await collectMinimaxH3FallbackVideoUrls(formData);
  } catch (e: unknown) {
    await refundTokens(auth.user.userId, h3Cost, {
      kind: "minimax_h3",
      reason: "image_materialize_failed",
      via: "storyboard_primary",
    });
    const message = e instanceof Error ? e.message : "Failed to read storyboard images.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (!imageUrls.length) {
    await refundTokens(auth.user.userId, h3Cost, {
      kind: "minimax_h3",
      reason: "no_images_after_charge",
      via: "storyboard_primary",
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
    await refundTokens(auth.user.userId, h3Cost, {
      kind: "minimax_h3",
      reason: "incomplete_scene_images",
      via: "storyboard_primary",
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
    const h3Prompt = buildStoryboardMinimaxH3Prompt({
      theme,
      motionPlan: motionPrompt,
      durationSec: h3Duration,
      hasReferenceVideo: videoUrls.length > 0,
      scenes: scenesMeta.map((s) => ({
        role: s.role,
        cameraMotionEn: s.cameraMotionEn,
        imagePrompt: s.imagePrompt,
      })),
    });
    console.info(
      `[generate-kling-storyboard] MiniMax H3 first (${imageUrls.length} stills, ${videoUrls.length} ref video(s))`,
    );
    const h3 = await runMinimaxH3Fallback({
      clerkId: auth.user.userId,
      prompt: h3Prompt,
      durationSec: h3Duration,
      aspectRatio: aspectRatio === "auto" ? "9:16" : aspectRatio,
      resolution: "768P",
      imageUrls,
      videoUrls,
    });
    await trackUsage(auth.user.userId, "video");
    return NextResponse.json({
      videoUrl: h3.videoUrl,
      generationMode: "minimax-h3-storyboard",
      endpoint: h3.endpoint,
      clipCount: 1,
      clipDurations: [h3Duration],
      referenceImageCount: imageUrls.length,
      referenceVideoCount: videoUrls.length,
      tokensCharged: h3Cost,
      creditBalance: h3Charged.balanceAfter,
      note: "MiniMax H3 storyboard — single clip from scene stills (no stitch).",
    });
  } catch (h3Err: unknown) {
    console.error("[generate-kling-storyboard] MiniMax H3 failed → Kling", h3Err);
    await refundTokens(auth.user.userId, h3Cost, {
      kind: "minimax_h3",
      reason: "generation_failed",
      via: "storyboard_primary",
    });
  }

  // Kling per-scene + stitch
  const klingCost = klingStoryboardTokenCost(clipDurations);
  const klingCharged = await chargeTokens(auth.user.userId, klingCost, {
    kind: "kling_storyboard_fallback",
    sceneCount: imageUrls.length,
    clipDurations,
    via: "storyboard_after_h3",
  });
  if ("error" in klingCharged) return klingCharged.error;

  try {
    console.info(
      `[generate-kling-storyboard] Kling fallback (${imageUrls.length} image(s))`,
    );
    const result = await runKlingStoryboardFallback({
      request,
      clerkId: auth.user.userId,
      imageUrls,
      theme,
      motionPrompt: motionPrompt || undefined,
      totalDurationSec,
      scenesMeta,
    });
    await trackUsage(auth.user.userId, "video");
    return NextResponse.json({
      ...result,
      tokensCharged: klingCost,
      creditBalance: klingCharged.balanceAfter,
      note:
        result.note ||
        "MiniMax H3 unavailable — used Kling per-scene clips + stitch.",
    });
  } catch (e: unknown) {
    await refundTokens(auth.user.userId, klingCost, {
      kind: "kling_storyboard_fallback",
      reason: "generation_failed",
      via: "storyboard_after_h3",
    });
    return NextResponse.json({ error: formatKlingFalError(e) }, { status: 502 });
  }
}
