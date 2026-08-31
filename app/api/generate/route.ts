import { fal, ApiError, ValidationError } from "@fal-ai/client";
import { NextResponse } from "next/server";
import {
  chargeTokens,
  refundTokens,
  h3TokenCostFromRequest,
  videoTokenCostFromSeedanceEndpoint,
} from "@/lib/billing/charge";
import { clampVideoResolution } from "@/lib/billing/entitlements";
import { getUserPlan } from "@/lib/billing/get-user-plan";
import { requireAppUser, trackUsage } from "@/lib/require-app-user";
import {
  isFalContentPolicyThrowable,
  isSeedanceSensitiveError,
  softenSeedancePromptForModeration,
} from "@/lib/seedance-moderation";
import { mirrorImageUrlToFalStorage } from "@/lib/fal-mirror-media";
import { sanitizeVideoEndpoint } from "@/lib/image-endpoints";
import {
  adaptScriptForKlingFallback,
  adaptScriptForMinimaxH3,
  ensureSeedanceReferenceTags,
  friendlyAutoFallbackNote,
} from "@/lib/video-engine-prompt-adapters";
import {
  clampMinimaxH3Duration,
  clampMinimaxH3ResolutionForPlan,
  collectMinimaxH3FallbackMedia,
  formDataExpectsReferenceVideo,
  normalizeMinimaxH3Resolution,
  runMinimaxH3Fallback,
} from "@/lib/minimax-h3-run";
import {
  promptAlreadySpecifiesCamera,
  promptHasVideo1,
} from "@/lib/prompt-balance-contract";
import { persistAndDurablize } from "@/lib/storage/durable-media";
import { buildSingleClipManifest } from "@/lib/video-timing-manifest";
import {
  parseKlingScenesMeta,
  resolveKlingClipDurations,
  resolveKlingScenesMeta,
  klingStoryboardTokenCost,
  runKlingStoryboardFallback,
  collectKlingFallbackImageUrls,
  formatKlingFalError,
} from "@/lib/kling-storyboard-run";

function seedanceTimingManifest(duration: "auto" | number) {
  if (typeof duration === "number" && duration > 0) {
    return buildSingleClipManifest(duration, {
      source: "seedance",
      engine: "seedance",
      timingSource: "reported",
    });
  }
  return undefined;
}

function formatFalError(e: unknown): string {
  if (e instanceof ValidationError) {
    const fieldMsgs = e.fieldErrors
      .map((f) => {
        const loc = f.loc?.length ? f.loc.join(".") : "body";
        return `${loc}: ${f.msg}`;
      })
      .filter(Boolean);
    const bits = fieldMsgs.length ? fieldMsgs : [e.message];
    if (e.requestId) bits.push(`fal request: ${e.requestId}`);
    return bits.join(" — ");
  }
  if (e instanceof ApiError) {
    const bits: string[] = [e.message];
    const body = e.body as Record<string, unknown> | undefined;
    if (body && typeof body === "object") {
      const detail = body.detail;
      if (Array.isArray(detail)) {
        const msgs = detail
          .map((d: unknown) => {
            if (d && typeof d === "object" && "msg" in d) {
              return String((d as { msg: unknown }).msg);
            }
            return JSON.stringify(d);
          })
          .filter(Boolean);
        if (msgs.length) bits.push(msgs.join("; "));
      } else if (detail !== undefined) {
        bits.push(typeof detail === "string" ? detail : JSON.stringify(detail));
      } else {
        const rest = { ...body };
        delete rest.detail;
        if (Object.keys(rest).length) bits.push(JSON.stringify(rest));
      }
    }
    if (e.requestId) bits.push(`fal request: ${e.requestId}`);
    return bits.join(" — ");
  }
  if (e && typeof e === "object" && "message" in e) {
    return String((e as { message: unknown }).message);
  }
  return "Generation failed";
}

export const runtime = "nodejs";
/** Seedance / long video jobs can exceed 5 minutes under load. */
export const maxDuration = 800;

type Mode = "text" | "image" | "reference";

function defaultEndpointFor(mode: Mode, fast: boolean): string {
  const base = fast ? "bytedance/seedance-2.0/fast" : "bytedance/seedance-2.0";
  const suffix =
    mode === "text"
      ? "text-to-video"
      : mode === "image"
        ? "image-to-video"
        : "reference-to-video";
  return `${base}/${suffix}`;
}

function endpointFor(mode: Mode, fast: boolean, formData: FormData): string {
  const fallback = defaultEndpointFor(mode, fast);
  return sanitizeVideoEndpoint(
    formData.get(`endpoint_${mode}`) as string | null,
    fallback,
  );
}

function extractVideoUrl(resultData: unknown): string | undefined {
  if (!resultData || typeof resultData !== "object") return undefined;
  if ("video" in resultData) {
    const video = (resultData as { video?: { url?: unknown } }).video;
    if (video && typeof video.url === "string") return video.url;
  }
  if ("video_url" in resultData) {
    const val = (resultData as { video_url?: unknown }).video_url;
    if (typeof val === "string") return val;
  }
  if ("url" in resultData) {
    const val = (resultData as { url?: unknown }).url;
    if (typeof val === "string" && /\.(mp4|mov|webm)/i.test(val)) return val;
  }
  return undefined;
}

function isDurationValidationError(e: unknown): boolean {
  if (!(e instanceof ApiError)) return false;
  const body = e.body as Record<string, unknown> | undefined;
  const detail = body?.detail;
  if (!Array.isArray(detail)) return false;
  return detail.some((d) => {
    if (!d || typeof d !== "object") return false;
    const msg = "msg" in d ? String((d as { msg?: unknown }).msg ?? "") : "";
    return msg.toLowerCase().includes("input should be") && msg.includes("'4'");
  });
}

async function subscribeWithDurationFallback(
  endpoint: string,
  input: Record<string, unknown>,
): Promise<{ result: Awaited<ReturnType<typeof fal.subscribe>>; usedDurationFallback: boolean }> {
  try {
    const result = await fal.subscribe(endpoint, { input, logs: true });
    return { result, usedDurationFallback: false };
  } catch (e: unknown) {
    const currentDuration = input.duration;
    const shouldFallback =
      (currentDuration === 2 || currentDuration === 3) && isDurationValidationError(e);
    if (!shouldFallback) throw e;
    const result = await fal.subscribe(endpoint, {
      input: { ...input, duration: 4 },
      logs: true,
    });
    return { result, usedDurationFallback: true };
  }
}

function parseDuration(v: string): "auto" | number {
  if (v === "auto") return "auto";
  const n = parseInt(v, 10);
  if (Number.isNaN(n) || n < 2 || n > 15) return "auto";
  return n;
}

/** Seedance OpenAPI expects duration enum strings ("4"…"15"), not integers. */
function durationForFal(duration: "auto" | number): string {
  return duration === "auto" ? "auto" : String(duration);
}

function applyAdvancedGuidance(prompt: string, opts: {
  camera?: string;
  motionStrength?: number;
  negativePrompt?: string;
  avoidOnScreenText?: boolean;
  /** Skip template camera when script already owns motion (DeepSeek / @Video1). */
  skipCamera?: boolean;
}): string {
  const guidance: string[] = [];
  if (opts.camera && !opts.skipCamera) {
    guidance.push(`Camera movement: ${opts.camera}.`);
  }
  if (typeof opts.motionStrength === "number") {
    guidance.push(`Motion strength: ${opts.motionStrength}/100 (smooth and stable).`);
  }
  if (opts.avoidOnScreenText) {
    guidance.push("Do not generate any on-screen text, subtitles, logos, or watermarks.");
  }
  if (opts.negativePrompt) {
    guidance.push(`Avoid: ${opts.negativePrompt}`);
  }
  if (!guidance.length) return prompt;
  return `${prompt}\n\nAdditional constraints:\n${guidance.join("\n")}`;
}

export async function POST(request: Request) {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;

  const key = process.env.FAL_KEY?.trim();
  if (!key) {
    return NextResponse.json(
      {
        error:
          "Video generation is temporarily unavailable. Please try again later.",
      },
      { status: 503 },
    );
  }

  fal.config({ credentials: key });

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      {
        error:
          "Reference video upload too large. Re-pick the post from research (auto-trims to 15s) or upload a shorter clip.",
      },
      { status: 413 },
    );
  }

  const mode = (formData.get("mode") as string) as Mode;
  const promptRaw = (formData.get("prompt") as string)?.trim() ?? "";
  const prompt = softenSeedancePromptForModeration(promptRaw);
  const reelExpectedEarly = formDataExpectsReferenceVideo(formData, prompt);
  const fastHint = reelExpectedEarly ? false : formData.get("fast") === "true";
  const resolutionBase = (formData.get("resolution") as string) || "480p";
  const resolutionOverride =
    (formData.get("resolution_override") as string | null)?.trim() || "";
  const requestedResolution = resolutionOverride || resolutionBase;
  const aspectRatio = (formData.get("aspect_ratio") as string) || "auto";
  const generateAudio = formData.get("generate_audio") !== "false";
  const negativePrompt =
    (formData.get("negative_prompt") as string | null)?.trim() || "";
  const camera = (formData.get("camera") as string | null)?.trim() || "";
  const avoidOnScreenText = formData.get("avoid_on_screen_text") !== "false";
  const motionRaw = (formData.get("motion_strength") as string | null)?.trim() || "";
  const motionParsed = motionRaw ? Number(motionRaw) : Number.NaN;
  const motionStrength = Number.isFinite(motionParsed)
    ? Math.max(0, Math.min(100, Math.round(motionParsed)))
    : undefined;
  const seedRaw = formData.get("seed") as string | null;
  const seed =
    seedRaw && seedRaw.trim() !== ""
      ? parseInt(seedRaw, 10)
      : undefined;

  if (!prompt) {
    return NextResponse.json(
      { error: "Prompt (script / description) is required." },
      { status: 400 },
    );
  }

  if (mode !== "text" && mode !== "image" && mode !== "reference") {
    return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
  }

  // Validate mode inputs BEFORE charging — avoid charge-then-400 leaks.
  const imageStartFile = formData.get("image_start") as File | null;
  const imageStartUrl = (formData.get("image_start_url") as string | null)?.trim();
  if (mode === "image" && (!imageStartFile || imageStartFile.size === 0) && !imageStartUrl) {
    return NextResponse.json(
      { error: "Image-to-video requires a starting image." },
      { status: 400 },
    );
  }

  const refImageFiles = (formData.getAll("images") as File[]).filter((f) => f && f.size > 0);
  const refVideoFiles = (formData.getAll("videos") as File[]).filter((f) => f && f.size > 0);
  const refAudioFiles = (formData.getAll("audios") as File[]).filter((f) => f && f.size > 0);
  const imageRefUrlEarly = (formData.get("image_ref_url") as string | null)?.trim();
  const directRefUrlsEarly = (formData.get("reference_image_urls") as string | null)
    ?.trim()
    .split(/[\n,]+/)
    .map((u) => u.trim())
    .filter(Boolean);
  const directVideoUrlsEarly =
    (formData.get("reference_video_urls") as string | null)
      ?.trim()
      .split(/[\n,]+/)
      .map((u) => u.trim())
      .filter(Boolean) ?? [];

  if (mode === "reference") {
    if (refImageFiles.length > 9) {
      return NextResponse.json(
        { error: "At most 9 reference images are allowed." },
        { status: 400 },
      );
    }
    if (refVideoFiles.length > 3) {
      return NextResponse.json(
        { error: "At most 3 reference videos are allowed." },
        { status: 400 },
      );
    }
    if (refAudioFiles.length > 3) {
      return NextResponse.json(
        { error: "At most 3 audio clips are allowed." },
        { status: 400 },
      );
    }
    if (
      refAudioFiles.length > 0 &&
      refImageFiles.length === 0 &&
      refVideoFiles.length === 0 &&
      !imageRefUrlEarly &&
      !(directRefUrlsEarly?.length) &&
      directVideoUrlsEarly.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "If you attach audio, video generation requires at least one reference image or video.",
        },
        { status: 400 },
      );
    }
    const hasRefInput =
      refImageFiles.length > 0 ||
      refVideoFiles.length > 0 ||
      Boolean(imageRefUrlEarly) ||
      Boolean(directRefUrlsEarly?.length) ||
      directVideoUrlsEarly.length > 0 ||
      refAudioFiles.length > 0;
    if (!hasRefInput) {
      return NextResponse.json(
        {
          error:
            "Reference-to-video needs at least one reference image or video. Upload images and use @Image1, @Image2… in your prompt.",
        },
        { status: 400 },
      );
    }
  }

  const duration = parseDuration((formData.get("duration") as string) || "auto");
  const plan = await getUserPlan(auth.user.userId);
  const { resolution } = clampVideoResolution(plan, requestedResolution);
  const billedEndpoint = endpointFor(mode, fastHint, formData);
  const tokenCost = videoTokenCostFromSeedanceEndpoint({
    resolution,
    duration,
    endpoint: billedEndpoint,
  });
  const charged = await chargeTokens(auth.user.userId, tokenCost, {
    kind: "video",
    mode,
    resolution,
    endpoint: billedEndpoint,
    duration,
  });
  if ("error" in charged) return charged.error;
  const balanceAfter = charged.balanceAfter;

  const referenceMatch = mode === "reference";
  const refDurationSec = Number(
    (formData.get("ref_duration_sec") as string | null)?.trim() || "",
  );
  const refTooLong =
    referenceMatch && Number.isFinite(refDurationSec) && refDurationSec > 15.5;
  const effectiveNegative = referenceMatch
    ? (formData.get("reference_negative_prompt") as string | null)?.trim() ||
      negativePrompt
    : negativePrompt;

  const skipTemplateCamera =
    referenceMatch ||
    promptHasVideo1(prompt) ||
    promptAlreadySpecifiesCamera(prompt);

  const common = {
    prompt: applyAdvancedGuidance(prompt, {
      camera: skipTemplateCamera ? undefined : camera,
      motionStrength: referenceMatch || promptHasVideo1(prompt) ? undefined : motionStrength,
      negativePrompt: effectiveNegative,
      avoidOnScreenText,
      skipCamera: skipTemplateCamera,
    }),
    resolution,
    duration: durationForFal(duration),
    aspect_ratio: aspectRatio as
      | "auto"
      | "21:9"
      | "16:9"
      | "4:3"
      | "1:1"
      | "3:4"
      | "9:16",
    generate_audio: generateAudio,
    ...(typeof seed === "number" && !Number.isNaN(seed) ? { seed } : {}),
  };

  try {
    if (mode === "text") {
      const { result, usedDurationFallback } = await subscribeWithDurationFallback(
        endpointFor("text", fastHint, formData),
        common,
      );
      const videoUrl = extractVideoUrl(result.data);
      if (!videoUrl) {
        throw new Error("Model response missing video URL.");
      }
      await trackUsage(auth.user.userId, "video");
      const durableVideoUrl = await persistAndDurablize({
        clerkId: auth.user.userId,
        kind: "video",
        sourceUrl: videoUrl,
        fallbackUrl: videoUrl,
        prompt: common.prompt.slice(0, 500),
        timingManifest: seedanceTimingManifest(duration),
      });
      return NextResponse.json({
        videoUrl: durableVideoUrl,
        seed: result.data.seed,
        requestId: result.requestId,
        generationMode: "text-to-video",
        endpoint: billedEndpoint,
        tokensCharged: tokenCost,
        creditBalance: balanceAfter,
        ...(usedDurationFallback
          ? { note: "Requested 2-3s is unsupported by this model; generated at 4s instead." }
          : {}),
      });
    }

    if (mode === "image") {
      const start = imageStartFile;
      const startUrl = imageStartUrl;
      const imageUrl =
        start && start.size > 0
          ? await fal.storage.upload(start)
          : await mirrorImageUrlToFalStorage(startUrl!, {
              clerkId: auth.user.userId,
              refresh: true,
            });
      const end = formData.get("image_end") as File | null;
      const endDirectUrl = (formData.get("image_end_url") as string | null)?.trim();
      const endUrl =
        end && end.size > 0
          ? await fal.storage.upload(end)
          : endDirectUrl
            ? await mirrorImageUrlToFalStorage(endDirectUrl, {
                clerkId: auth.user.userId,
                refresh: true,
              })
            : undefined;

      const imageInput = {
        ...common,
        image_url: imageUrl,
        ...(endUrl ? { end_image_url: endUrl } : {}),
      };
      const { result, usedDurationFallback } = await subscribeWithDurationFallback(
        endpointFor("image", fastHint, formData),
        imageInput,
      );
      const videoUrl = extractVideoUrl(result.data);
      if (!videoUrl) {
        throw new Error("Model response missing video URL.");
      }
      await trackUsage(auth.user.userId, "video");
      const durableVideoUrl = await persistAndDurablize({
        clerkId: auth.user.userId,
        kind: "video",
        sourceUrl: videoUrl,
        fallbackUrl: videoUrl,
        prompt: common.prompt.slice(0, 500),
        timingManifest: seedanceTimingManifest(duration),
      });
      return NextResponse.json({
        videoUrl: durableVideoUrl,
        seed: result.data.seed,
        requestId: result.requestId,
        generationMode: "image-to-video",
        endpoint: billedEndpoint,
        tokensCharged: tokenCost,
        creditBalance: balanceAfter,
        ...(usedDurationFallback
          ? { note: "Requested 2-3s is unsupported by this model; generated at 4s instead. Reference MP4 was NOT used." }
          : { note: "Reference MP4 was NOT used — image-to-video only animates your keyframe." }),
      });
    }

    // reference-to-video (counts already validated pre-charge)
    const nonEmptyImages = refImageFiles;
    const nonEmptyVideos = refVideoFiles;
    const nonEmptyAudios = refAudioFiles;

    const imageRefUrl = imageRefUrlEarly;
    const directRefUrls = directRefUrlsEarly;
    const directVideoUrls = directVideoUrlsEarly;
    const uploadedImageUrls =
      nonEmptyImages.length > 0
        ? await Promise.all(nonEmptyImages.map((f) => fal.storage.upload(f)))
        : [];
    // Prefer URL refs (library/pipeline/CDN) — client should not re-upload multi-MB scene PNGs
    // (Vercel request body limit ≈ 4.5MB → "Request Entity Too Large").
    const mirroredDirectUrls = directRefUrls?.length
      ? await Promise.all(
          directRefUrls.map((u) =>
            mirrorImageUrlToFalStorage(u, { clerkId: auth.user.userId }),
          ),
        )
      : [];
    const mirroredImageRef = imageRefUrl
      ? await mirrorImageUrlToFalStorage(imageRefUrl, { clerkId: auth.user.userId })
      : undefined;
    const image_urls = [
      ...mirroredDirectUrls,
      ...uploadedImageUrls,
      ...(mirroredImageRef ? [mirroredImageRef] : []),
    ];
    const imageUrlsFinal = image_urls.length > 0 ? image_urls : undefined;
    const uploadedVideoUrls =
      nonEmptyVideos.length > 0
        ? await Promise.all(nonEmptyVideos.map((f) => fal.storage.upload(f)))
        : [];
    const video_urls = [...directVideoUrls, ...uploadedVideoUrls];
    const videoUrlsFinal = video_urls.length > 0 ? video_urls : undefined;
    const audio_urls =
      nonEmptyAudios.length > 0
        ? await Promise.all(nonEmptyAudios.map((f) => fal.storage.upload(f)))
        : undefined;

    const hasRefs =
      (imageUrlsFinal?.length ?? 0) > 0 ||
      (videoUrlsFinal?.length ?? 0) > 0 ||
      (audio_urls?.length ?? 0) > 0;

    if (!hasRefs) {
      // Form looked valid but uploads/mirrors produced nothing — refund.
      await refundTokens(auth.user.userId, tokenCost, {
        kind: "video",
        mode,
        reason: "reference_materialize_empty",
      });
      return NextResponse.json(
        {
          error:
            "Reference-to-video needs at least one reference image or video. Upload images and use @Image1, @Image2… in your prompt.",
        },
        { status: 400 },
      );
    }

    const imageCount = imageUrlsFinal?.length ?? 0;
    const videoCount = videoUrlsFinal?.length ?? 0;
    const audioCount = audio_urls?.length ?? 0;
    const { prompt: taggedPrompt, added: addedTags } = ensureSeedanceReferenceTags(
      common.prompt,
      imageCount,
      videoCount,
      audioCount,
    );

    const referenceInput = {
      ...common,
      prompt: taggedPrompt,
      ...(imageUrlsFinal?.length ? { image_urls: imageUrlsFinal } : {}),
      ...(videoUrlsFinal?.length ? { video_urls: videoUrlsFinal } : {}),
      ...(audio_urls?.length ? { audio_urls } : {}),
    };
    const { result, usedDurationFallback } = await subscribeWithDurationFallback(
      endpointFor("reference", fastHint, formData),
      referenceInput,
    );
    const videoUrl = extractVideoUrl(result.data);
    if (!videoUrl) {
      throw new Error("Model response missing video URL.");
    }

    const notes: string[] = [];
    if (usedDurationFallback) {
      notes.push("Requested 2-3s is unsupported by this model; generated at 4s instead.");
    }
    if (refTooLong) {
      notes.push(
        `Reference is ~${Math.round(refDurationSec)}s — video generation only uses 2–15s (usually the opening). Trim an 8–12s clip in CapCut for closer motion match.`,
      );
    }

    await trackUsage(auth.user.userId, "video");
    const durableVideoUrl = await persistAndDurablize({
      clerkId: auth.user.userId,
      kind: "video",
      sourceUrl: videoUrl,
      fallbackUrl: videoUrl,
      prompt: common.prompt.slice(0, 500),
      timingManifest: seedanceTimingManifest(duration),
    });
    return NextResponse.json({
      videoUrl: durableVideoUrl,
      seed: result.data.seed,
      requestId: result.requestId,
      generationMode: "reference-to-video",
      endpoint: billedEndpoint,
      referenceVideoCount: videoUrlsFinal?.length ?? nonEmptyVideos.length,
      referenceImageCount: imageUrlsFinal?.length ?? 0,
      tokensCharged: tokenCost,
      creditBalance: balanceAfter,
      ...(addedTags.length
        ? { note: [...notes, `Auto-added tags: ${addedTags.join(", ")}`].join(" ") }
        : notes.length
          ? { note: notes.join(" ") }
          : {}),
    });
  } catch (e: unknown) {
    await refundTokens(auth.user.userId, tokenCost, {
      kind: "video",
      mode,
      reason: "generation_failed",
    });
    if (e instanceof ValidationError) {
      console.error("[api/generate] validation", JSON.stringify(e.fieldErrors));
    } else {
      console.error("[api/generate]", e);
    }
    const message = formatFalError(e);

    const seedance422Block =
      isFalContentPolicyThrowable(e, message) ||
      isSeedanceSensitiveError(message) ||
      (e instanceof ValidationError &&
        e.status === 422 &&
        !isDurationValidationError(e));

    // Seedance 422 (content/sensitive/validation) → MiniMax H3 first (keeps R2V),
    // then Kling I2V stills as last resort.
    if (seedance422Block && mode !== "text") {
      const totalDurationSec =
        typeof duration === "number" && duration > 0 ? duration : 8;
      const blockedCode = isSeedanceSensitiveError(message)
        ? "SEEDANCE_SENSITIVE_CONTENT"
        : "FAL_CONTENT_POLICY";

      const { imageUrls: h3Images, videoUrls: h3Videos } =
        await collectMinimaxH3FallbackMedia(formData, {
          clerkId: auth.user.userId,
        });
      if (formDataExpectsReferenceVideo(formData, common.prompt) && h3Videos.length < 1) {
        return NextResponse.json(
          {
            error:
              "Reference video (@Video1) was required but could not be prepared. We did not generate a stills-only clip — fix the MP4 and retry.",
            code: "REFERENCE_VIDEO_REQUIRED",
            seedanceBlockedCode: blockedCode,
          },
          { status: 422 },
        );
      }
      if (h3Images.length >= 1 || h3Videos.length >= 1) {
        const h3Duration = clampMinimaxH3Duration(totalDurationSec);
        const h3ResHint = clampMinimaxH3ResolutionForPlan(
          plan,
          normalizeMinimaxH3Resolution(resolution),
        );
        const h3Cost = h3TokenCostFromRequest({
          duration: h3Duration,
          resolution: h3ResHint,
          referenceVideoSec: h3Videos.length > 0 ? h3Duration : 0,
          extraReferenceImages: Math.max(0, h3Images.length - 5),
        });
        const h3Charged = await chargeTokens(auth.user.userId, h3Cost, {
          kind: "minimax_h3",
          via: "generate_auto_fallback",
          seedanceMode: mode,
        });
        if (!("error" in h3Charged)) {
          try {
            const h3Prompt = adaptScriptForMinimaxH3({
              seedancePrompt: common.prompt,
              imageCount: h3Images.length,
              videoCount: h3Videos.length,
            });
            console.info(
              `[api/generate] Seedance 422 → MiniMax H3 fallback (${h3Images.length} image(s), ${h3Videos.length} video(s), mode=${mode})`,
            );
            const h3 = await runMinimaxH3Fallback({
              clerkId: auth.user.userId,
              prompt: h3Prompt,
              durationSec: h3Duration,
              aspectRatio: aspectRatio === "auto" ? "9:16" : aspectRatio,
              resolution: h3ResHint,
              imageUrls: h3Images,
              videoUrls: h3Videos,
            });
            await trackUsage(auth.user.userId, "video");
            return NextResponse.json({
              videoUrl: h3.videoUrl,
              generationMode: h3.generationMode,
              endpoint: h3.endpoint,
              referenceImageCount: h3Images.length,
              referenceVideoCount: h3Videos.length,
              tokensCharged: h3Cost,
              creditBalance: h3Charged.balanceAfter,
              note: friendlyAutoFallbackNote("minimax-h3"),
              seedanceBlockedCode: blockedCode,
            });
          } catch (h3Err: unknown) {
            console.error("[api/generate] MiniMax H3 fallback failed", h3Err);
            await refundTokens(auth.user.userId, h3Cost, {
              kind: "minimax_h3",
              reason: "generation_failed",
              via: "generate_auto_fallback",
            });
          }
        }
      }

      const expectsVideo1 =
        h3Videos.length >= 1 ||
        formDataExpectsReferenceVideo(formData, common.prompt);
      if (expectsVideo1) {
        return NextResponse.json(
          {
            error:
              "Reference video (@Video1) was required but could not be used. We did not generate a stills-only clip — fix the MP4 and retry.",
            code: "REFERENCE_VIDEO_REQUIRED",
            seedanceBlockedCode: blockedCode,
          },
          { status: 422 },
        );
      }

      const imageUrls = h3Images.length
        ? h3Images
        : await collectKlingFallbackImageUrls(formData, {
            clerkId: auth.user.userId,
          });
      if (imageUrls.length >= 1) {
        const clientMeta = parseKlingScenesMeta(
          formData.get("scenes_meta") as string | null,
        );
        const klingPlan = adaptScriptForKlingFallback({
          seedancePrompt: common.prompt,
          totalDurationSec,
          imageUrls,
          clientScenesMeta: clientMeta,
          conceptMode: (formData.get("promotion_mode") as string | null) === "concept",
        });
        const klingImageUrls = klingPlan.imageUrls;
        const scenesMeta =
          klingPlan.scenesMeta.length > 0
            ? klingPlan.scenesMeta
            : resolveKlingScenesMeta(klingImageUrls.length, clientMeta);
        const clipDurations = resolveKlingClipDurations(
          klingImageUrls.length,
          totalDurationSec,
          scenesMeta,
        );
        const klingCost = klingStoryboardTokenCost(clipDurations);
        const klingCharged = await chargeTokens(auth.user.userId, klingCost, {
          kind: "kling_storyboard_fallback",
          sceneCount: klingImageUrls.length,
          clipDurations,
          via: "generate_auto",
          seedanceMode: mode,
        });
        if (!("error" in klingCharged)) {
          try {
            console.info(
              `[api/generate] Seedance 422 → Kling fallback (${klingImageUrls.length} image(s), ${scenesMeta.length} beat(s), mode=${mode})`,
            );
            const kling = await runKlingStoryboardFallback({
              request,
              clerkId: auth.user.userId,
              imageUrls: klingImageUrls,
              theme: klingPlan.theme,
              motionPrompt: klingPlan.motionPrompt,
              totalDurationSec,
              scenesMeta,
            });
            await trackUsage(auth.user.userId, "video");
            return NextResponse.json({
              videoUrl: kling.videoUrl,
              generationMode: kling.generationMode,
              endpoint: kling.endpoint,
              clipCount: kling.clipCount,
              clipDurations: kling.clipDurations,
              referenceImageCount: klingImageUrls.length,
              tokensCharged: klingCost,
              creditBalance: klingCharged.balanceAfter,
              note: friendlyAutoFallbackNote("kling", kling.clipCount),
              seedanceBlockedCode: blockedCode,
            });
          } catch (klingErr: unknown) {
            console.error("[api/generate] Kling fallback failed", klingErr);
            await refundTokens(auth.user.userId, klingCost, {
              kind: "kling_storyboard_fallback",
              reason: "generation_failed",
              via: "generate_auto",
            });
            return NextResponse.json(
              {
                error: formatKlingFalError(klingErr),
                code: blockedCode,
                klingFallbackFailed: true,
                hint:
                  "Video generation failed. Try again or use a different still.",
              },
              { status: 422 },
            );
          }
        }
      }
    }

    if (isSeedanceSensitiveError(message)) {
      return NextResponse.json(
        {
          error: message,
          code: "SEEDANCE_SENSITIVE_CONTENT",
          hint:
            "This clip was blocked by a safety filter (violence/combat framing). Try a calmer prompt: no weapons, opponents, or standoffs — figures at rest, peaceful pause, arms at sides. A combat-looking reference image can also trigger this.",
        },
        { status: 422 },
      );
    }
    if (isFalContentPolicyThrowable(e, message)) {
      return NextResponse.json(
        {
          error: message,
          code: "FAL_CONTENT_POLICY",
          hint:
            "People / private-info filter blocked this input. Use a product-only photo (no faces or hands), or generate without a reference reel that shows people.",
        },
        { status: 422 },
      );
    }
    const status =
      e instanceof ApiError && e.status >= 400 && e.status < 600 ? e.status : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
