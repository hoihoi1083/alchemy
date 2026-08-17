import { fal } from "@fal-ai/client";
import { NextResponse } from "next/server";
import {
  chargeTokens,
  refundTokens,
  h3TokenCostFromRequest,
  videoTokenCostFromRequest,
} from "@/lib/billing/charge";
import { getUserBalance } from "@/lib/billing/ledger";
import { getUserPlan } from "@/lib/billing/get-user-plan";
import { clampVideoResolution } from "@/lib/billing/entitlements";
import { isStoryboardGridApprovedFlag } from "@/lib/kling-storyboard-fallback";
import {
  evaluateStoryboardVideoAffordability,
  parsePreferEngine,
  STORYBOARD_ENGINE_CHOICE_CODE,
} from "@/lib/video-affordability";
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
  clampMinimaxH3ResolutionForPlan,
  collectMinimaxH3FallbackVideoUrls,
  formDataExpectsReferenceVideo,
  normalizeMinimaxH3Resolution,
  runMinimaxH3Fallback,
} from "@/lib/minimax-h3-run";
import { requireAppUser, trackUsage } from "@/lib/require-app-user";
import { parseImageTextMode } from "@/lib/image-text-mode";
import { runSeedanceStoryboardR2v } from "@/lib/seedance-r2v-run";
import {
  KLING_DURATION_UNREACHABLE_MESSAGE,
  KlingDurationUnreachableError,
  REFERENCE_VIDEO_REQUIRED_MESSAGE,
  klingStitchCanHitDuration,
  parseFaceHeavyFlag,
  resolveVideoEnginePlan,
} from "@/lib/video-engine-router";

export const runtime = "nodejs";
export const maxDuration = 300;

function referenceVideoRequiredResponse() {
  return NextResponse.json(
    {
      error: REFERENCE_VIDEO_REQUIRED_MESSAGE,
      code: "REFERENCE_VIDEO_REQUIRED",
    },
    { status: 422 },
  );
}

/**
 * Storyboard video:
 * - Reel (B): Seedance R2V quality → MiniMax H3 → 422. Never Kling. Never I2V.
 * - Face-heavy + reel: H3 + reel → 422.
 * - Stills only (A): MiniMax H3 → Kling stitch if H3 fails (and duration is hittable).
 */
export async function POST(request: Request) {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;
  const clerkId = auth.user.userId;

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

  if (!isStoryboardGridApprovedFlag(formData.get("storyboard_grid_approved"))) {
    return NextResponse.json(
      {
        error:
          "Approve the storyboard stills (checkbox) before generating video. Per-cell regen is allowed; regen-all is not a skip.",
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
  const preserveOnScreenType =
    parseImageTextMode(formData.get("image_text_mode") as string | null) ===
    "integrated";

  const expectsReel = formDataExpectsReferenceVideo(formData, motionPrompt);
  const faceHeavy = parseFaceHeavyFlag(formData.get("face_heavy"));
  const enginePlan = resolveVideoEnginePlan({
    hasReel: expectsReel,
    faceHeavy,
    storyboard: true,
  });

  const clientMeta = parseKlingScenesMeta(formData.get("scenes_meta") as string | null);
  const scenesMetaForBilling = resolveKlingScenesMeta(sourceCount, clientMeta);
  const clipDurations = resolveKlingClipDurations(
    sourceCount,
    totalDurationSec,
    scenesMetaForBilling,
  );

  const h3Duration = clampMinimaxH3Duration(totalDurationSec);
  const plan = await getUserPlan(clerkId);
  const requestedVideoRes =
    (formData.get("resolution") as string | null)?.trim() || "480p";
  const { resolution: uiResolution } = clampVideoResolution(plan, requestedVideoRes);
  const h3Resolution = clampMinimaxH3ResolutionForPlan(
    plan,
    normalizeMinimaxH3Resolution(requestedVideoRes),
  );
  const h3Cost = h3TokenCostFromRequest({
    duration: h3Duration,
    resolution: h3Resolution,
    referenceVideoSec: expectsReel ? h3Duration : 0,
    extraReferenceImages: Math.max(0, sourceCount - 5),
  });
  const seedanceDuration = Math.min(15, Math.max(4, Math.round(totalDurationSec) || 8));
  const seedanceCost = videoTokenCostFromRequest({
    duration: seedanceDuration,
    resolution: uiResolution,
    fast: false,
  });

  const klingCostEstimate = klingStoryboardTokenCost(clipDurations);
  const klingCanHit = klingStitchCanHitDuration(
    clipDurations.reduce((a, d) => a + (Number(d) || 5), 0),
    totalDurationSec,
    { clipCount: sourceCount },
  );
  const wallet = await getUserBalance(clerkId);
  const afford = evaluateStoryboardVideoAffordability({
    balance: wallet?.balance ?? null,
    hasReel: expectsReel,
    allowKling: enginePlan.allowKling,
    klingCanHitDuration: klingCanHit,
    h3Cost,
    klingCost: klingCostEstimate,
    seedanceCost,
    preferEngine: parsePreferEngine(formData.get("prefer_engine")),
    firstEngine: enginePlan.firstEngine,
  });

  if (afford.action === "upgrade") {
    return NextResponse.json(
      {
        error: `Not enough tokens. Need ${afford.required}, have ${afford.balance}.`,
        code: "INSUFFICIENT_TOKENS",
        balance: afford.balance,
        required: afford.required,
        hint: "tvc_needs_paid_plan",
      },
      { status: 402 },
    );
  }
  if (afford.action === "offer-kling") {
    return NextResponse.json(
      {
        error:
          "Single-clip video needs more tokens than your balance. Stitched fallback fits now.",
        code: STORYBOARD_ENGINE_CHOICE_CODE,
        balance: afford.balance,
        h3Cost: afford.h3Cost,
        klingCost: afford.klingCost,
      },
      { status: 402 },
    );
  }

  const skipToKling = afford.action === "run-kling";
  const runSeedanceFirst = afford.action === "run-seedance";
  const firstCost = runSeedanceFirst ? seedanceCost : h3Cost;
  const firstKind = runSeedanceFirst ? "video" : "minimax_h3";
  let firstCharged: { balanceAfter: number | null } = { balanceAfter: null };
  if (!skipToKling) {
    const charged = await chargeTokens(clerkId, firstCost, {
      kind: firstKind,
      via: runSeedanceFirst ? "storyboard_seedance_r2v" : "storyboard_primary",
      sceneCount: sourceCount,
    });
    if ("error" in charged) return charged.error;
    firstCharged = charged;
  }

  let imageUrls: string[];
  let videoUrls: string[];
  try {
    imageUrls = await collectKlingFallbackImageUrls(formData, {
      clerkId,
    });
    videoUrls = expectsReel ? await collectMinimaxH3FallbackVideoUrls(formData) : [];
  } catch (e: unknown) {
    if (!skipToKling) {
      await refundTokens(clerkId, firstCost, {
        kind: firstKind,
        reason: "image_materialize_failed",
        via: "storyboard_primary",
      });
    }
    const message = e instanceof Error ? e.message : "Failed to read storyboard images.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (!imageUrls.length) {
    if (!skipToKling) {
      await refundTokens(clerkId, firstCost, {
        kind: firstKind,
        reason: "no_images_after_charge",
        via: "storyboard_primary",
      });
    }
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
    if (!skipToKling) {
      await refundTokens(clerkId, firstCost, {
        kind: firstKind,
        reason: "incomplete_scene_images",
        via: "storyboard_primary",
      });
    }
    return NextResponse.json(
      {
        error: `Only ${imageUrls.length} of ${expectedCount} scene images could be loaded for video. Re-generate the missing still (often the last scene URL expired), then try again.`,
      },
      { status: 400 },
    );
  }

  if (expectsReel && videoUrls.length < 1) {
    if (!skipToKling) {
      await refundTokens(clerkId, firstCost, {
        kind: firstKind,
        reason: "reference_video_missing",
        via: "storyboard_primary",
      });
    }
    return referenceVideoRequiredResponse();
  }

  const scenesMeta = resolveKlingScenesMeta(imageUrls.length, clientMeta);
  const h3Prompt = buildStoryboardMinimaxH3Prompt({
    theme,
    motionPlan: motionPrompt,
    durationSec: h3Duration,
    hasReferenceVideo: videoUrls.length > 0,
    lookBibleGrade: scenesMeta.find((s) => s.lookBibleGrade?.trim())?.lookBibleGrade,
    preserveOnScreenType,
    scenes: scenesMeta.map((s) => ({
      role: s.role,
      cameraMotionEn: s.cameraMotionEn,
      lightingEn: s.lightingEn,
      imagePrompt: s.imagePrompt,
    })),
  });

  async function runH3AndReturn(balanceAfter: number | null, tokensCharged: number) {
    console.info(
      `[generate-kling-storyboard] MiniMax H3 first (${imageUrls.length} stills, ${videoUrls.length} ref video(s))`,
    );
    const h3 = await runMinimaxH3Fallback({
      clerkId,
      prompt: h3Prompt,
      durationSec: h3Duration,
      aspectRatio: aspectRatio === "auto" ? "9:16" : aspectRatio,
      resolution: h3Resolution,
      imageUrls,
      videoUrls,
    });
    await trackUsage(clerkId, "video");
    return NextResponse.json({
      videoUrl: h3.videoUrl,
      generationMode: "minimax-h3-storyboard",
      endpoint: h3.endpoint,
      clipCount: 1,
      clipDurations: [h3Duration],
      outputDurationSec: h3Duration,
      referenceImageCount: imageUrls.length,
      referenceVideoCount: videoUrls.length,
      tokensCharged,
      creditBalance: balanceAfter,
      note: "Storyboard video — single continuous clip from scene stills (no stitch).",
    });
  }

  // Wallet picked Kling stitch (fits; H3 does not) — skip H3 charge.
  if (skipToKling) {
    const rawStitchSec = clipDurations.reduce((a, d) => a + (Number(d) || 5), 0);
    if (
      !klingStitchCanHitDuration(rawStitchSec, totalDurationSec, {
        clipCount: imageUrls.length,
      })
    ) {
      return NextResponse.json(
        {
          error: KLING_DURATION_UNREACHABLE_MESSAGE,
          code: "KLING_DURATION_UNREACHABLE",
          rawStitchSec,
          targetDurationSec: totalDurationSec,
        },
        { status: 422 },
      );
    }
    const klingCost = klingStoryboardTokenCost(clipDurations);
    const klingCharged = await chargeTokens(clerkId, klingCost, {
      kind: "kling_storyboard_fallback",
      sceneCount: imageUrls.length,
      clipDurations,
      via: "storyboard_wallet_kling",
    });
    if ("error" in klingCharged) return klingCharged.error;
    try {
      console.info(
        `[generate-kling-storyboard] Kling by wallet choice (${imageUrls.length} image(s))`,
      );
      const result = await runKlingStoryboardFallback({
        request,
        clerkId,
        imageUrls,
        theme,
        motionPrompt: motionPrompt || undefined,
        totalDurationSec,
        scenesMeta,
        preserveOnScreenType,
      });
      await trackUsage(clerkId, "video");
      return NextResponse.json({
        ...result,
        tokensCharged: klingCost,
        creditBalance: klingCharged.balanceAfter,
        note:
          result.note ||
          "Stitched per-scene clips — single-clip mode needed more tokens than your balance.",
      });
    } catch (e: unknown) {
      await refundTokens(clerkId, klingCost, {
        kind: "kling_storyboard_fallback",
        reason: "generation_failed",
        via: "storyboard_wallet_kling",
      });
      if (e instanceof KlingDurationUnreachableError) {
        return NextResponse.json(
          {
            error: e.message || KLING_DURATION_UNREACHABLE_MESSAGE,
            code: "KLING_DURATION_UNREACHABLE",
            outputDurationSec: e.outputDurationSec,
          },
          { status: 422 },
        );
      }
      return NextResponse.json({ error: formatKlingFalError(e) }, { status: 502 });
    }
  }

  // B: Seedance R2V quality first (never I2V / never /fast).
  if (runSeedanceFirst) {
    try {
      console.info(
        `[generate-kling-storyboard] Seedance R2V first (${imageUrls.length} stills + ${videoUrls.length} ref video(s), quality)`,
      );
      const seedance = await runSeedanceStoryboardR2v({
        clerkId,
        prompt: motionPrompt || theme || "Follow @Video1 spine. @Image1…N wardrobe only.",
        durationSec: seedanceDuration,
        aspectRatio,
        resolution: uiResolution,
        imageUrls,
        videoUrls,
      });
      await trackUsage(clerkId, "video");
      return NextResponse.json({
        videoUrl: seedance.videoUrl,
        generationMode: seedance.generationMode,
        endpoint: seedance.endpoint,
        clipCount: 1,
        clipDurations: [seedance.durationSec],
        outputDurationSec: seedance.durationSec,
        referenceImageCount: imageUrls.length,
        referenceVideoCount: videoUrls.length,
        tokensCharged: firstCost,
        creditBalance: firstCharged.balanceAfter,
        note: "Reference-reel video — your reference clip + storyboard stills.",
      });
    } catch (seedanceErr: unknown) {
      console.error(
        "[generate-kling-storyboard] Seedance R2V failed → MiniMax H3",
        seedanceErr,
      );
      await refundTokens(clerkId, firstCost, {
        kind: "video",
        reason: "generation_failed",
        via: "storyboard_seedance_r2v",
      });
    }

    const h3Charged = await chargeTokens(clerkId, h3Cost, {
      kind: "minimax_h3",
      via: "storyboard_after_seedance",
      sceneCount: sourceCount,
    });
    if ("error" in h3Charged) return h3Charged.error;
    try {
      return await runH3AndReturn(h3Charged.balanceAfter, h3Cost);
    } catch (h3Err: unknown) {
      console.error(
        "[generate-kling-storyboard] MiniMax H3 failed after Seedance — no Kling (reel required)",
        h3Err,
      );
      await refundTokens(clerkId, h3Cost, {
        kind: "minimax_h3",
        reason: "generation_failed",
        via: "storyboard_after_seedance",
      });
      return referenceVideoRequiredResponse();
    }
  }

  // A / face-heavy reel: MiniMax H3 first
  try {
    return await runH3AndReturn(firstCharged.balanceAfter, firstCost);
  } catch (h3Err: unknown) {
    console.error("[generate-kling-storyboard] MiniMax H3 failed → Kling", h3Err);
    await refundTokens(clerkId, firstCost, {
      kind: "minimax_h3",
      reason: "generation_failed",
      via: "storyboard_primary",
    });
  }

  if (expectsReel || !enginePlan.allowKling) {
    return referenceVideoRequiredResponse();
  }

  const rawStitchSec = clipDurations.reduce((a, d) => a + (Number(d) || 5), 0);
  if (
    !klingStitchCanHitDuration(rawStitchSec, totalDurationSec, {
      clipCount: imageUrls.length,
    })
  ) {
    return NextResponse.json(
      {
        error: KLING_DURATION_UNREACHABLE_MESSAGE,
        code: "KLING_DURATION_UNREACHABLE",
        rawStitchSec,
        targetDurationSec: totalDurationSec,
      },
      { status: 422 },
    );
  }

  const klingCost = klingStoryboardTokenCost(clipDurations);
  const klingCharged = await chargeTokens(clerkId, klingCost, {
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
      clerkId,
      imageUrls,
      theme,
      motionPrompt: motionPrompt || undefined,
      totalDurationSec,
      scenesMeta,
      preserveOnScreenType,
    });
    await trackUsage(clerkId, "video");
    return NextResponse.json({
      ...result,
      tokensCharged: klingCost,
      creditBalance: klingCharged.balanceAfter,
      note:
        result.note ||
        "Single-clip mode unavailable — used per-scene clips + stitch.",
    });
  } catch (e: unknown) {
    await refundTokens(clerkId, klingCost, {
      kind: "kling_storyboard_fallback",
      reason: "generation_failed",
      via: "storyboard_after_h3",
    });
    if (e instanceof KlingDurationUnreachableError) {
      return NextResponse.json(
        {
          error: e.message || KLING_DURATION_UNREACHABLE_MESSAGE,
          code: "KLING_DURATION_UNREACHABLE",
          outputDurationSec: e.outputDurationSec,
        },
        { status: 422 },
      );
    }
    return NextResponse.json({ error: formatKlingFalError(e) }, { status: 502 });
  }
}
