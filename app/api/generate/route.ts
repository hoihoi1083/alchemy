import { fal, ApiError, ValidationError } from "@fal-ai/client";
import { NextResponse } from "next/server";
import { requireAppUser, trackUsage } from "@/lib/require-app-user";
import {
  isSeedanceSensitiveError,
  softenSeedancePromptForModeration,
} from "@/lib/seedance-moderation";
import { mirrorImageUrlToFalStorage } from "@/lib/fal-mirror-media";

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
export const maxDuration = 300;

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
  const direct = (formData.get(`endpoint_${mode}`) as string | null)?.trim();
  if (direct) return direct;
  return defaultEndpointFor(mode, fast);
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

function hasReferenceTag(prompt: string, kind: "Image" | "Video" | "Audio", index: number): boolean {
  return new RegExp(`@\\s*${kind}\\s*${index}\\b`, "i").test(prompt);
}

/** Prepend any missing @Image1 / @Video1 tags so reference mode always works. */
function ensureReferenceTags(
  prompt: string,
  imageCount: number,
  videoCount: number,
  audioCount: number,
): { prompt: string; added: string[] } {
  const added: string[] = [];
  let result = prompt.trim();

  for (let i = 1; i <= imageCount; i++) {
    if (!hasReferenceTag(result, "Image", i)) added.push(`@Image${i}`);
  }
  for (let i = 1; i <= videoCount; i++) {
    if (!hasReferenceTag(result, "Video", i)) added.push(`@Video${i}`);
  }
  for (let i = 1; i <= audioCount; i++) {
    if (!hasReferenceTag(result, "Audio", i)) added.push(`@Audio${i}`);
  }

  if (added.length > 0) {
    result = `${added.join(" ")} ${result}`.trim();
  }

  return { prompt: result, added };
}

function applyAdvancedGuidance(prompt: string, opts: {
  camera?: string;
  motionStrength?: number;
  negativePrompt?: string;
  avoidOnScreenText?: boolean;
}): string {
  const guidance: string[] = [];
  if (opts.camera) guidance.push(`Camera movement: ${opts.camera}.`);
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
  const fast = formData.get("fast") === "true";
  const resolutionBase = (formData.get("resolution") as string) || "720p";
  const resolutionOverride =
    (formData.get("resolution_override") as string | null)?.trim() || "";
  const resolution = resolutionOverride || resolutionBase;
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

  const duration = parseDuration((formData.get("duration") as string) || "auto");

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

  const common = {
    prompt: applyAdvancedGuidance(prompt, {
      camera: referenceMatch ? undefined : camera,
      motionStrength: referenceMatch ? undefined : motionStrength,
      negativePrompt: effectiveNegative,
      avoidOnScreenText,
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
        endpointFor("text", fast, formData),
        common,
      );
      const videoUrl = extractVideoUrl(result.data);
      if (!videoUrl) {
        throw new Error("Model response missing video URL.");
      }
      await trackUsage(auth.user.userId, "video");
      return NextResponse.json({
        videoUrl,
        seed: result.data.seed,
        requestId: result.requestId,
        generationMode: "text-to-video",
        endpoint: endpointFor("text", fast, formData),
        ...(usedDurationFallback
          ? { note: "Requested 2-3s is unsupported by this model; generated at 4s instead." }
          : {}),
      });
    }

    if (mode === "image") {
      const start = formData.get("image_start") as File | null;
      const startUrl = (formData.get("image_start_url") as string | null)?.trim();
      if ((!start || start.size === 0) && !startUrl) {
        return NextResponse.json(
          { error: "Image-to-video requires a starting image." },
          { status: 400 },
        );
      }
      const imageUrl =
        start && start.size > 0
          ? await fal.storage.upload(start)
          : await mirrorImageUrlToFalStorage(startUrl!);
      const end = formData.get("image_end") as File | null;
      const endDirectUrl = (formData.get("image_end_url") as string | null)?.trim();
      const endUrl =
        end && end.size > 0
          ? await fal.storage.upload(end)
          : endDirectUrl
            ? await mirrorImageUrlToFalStorage(endDirectUrl)
            : undefined;

      const imageInput = {
        ...common,
        image_url: imageUrl,
        ...(endUrl ? { end_image_url: endUrl } : {}),
      };
      const { result, usedDurationFallback } = await subscribeWithDurationFallback(
        endpointFor("image", fast, formData),
        imageInput,
      );
      const videoUrl = extractVideoUrl(result.data);
      if (!videoUrl) {
        throw new Error("Model response missing video URL.");
      }
      await trackUsage(auth.user.userId, "video");
      return NextResponse.json({
        videoUrl,
        seed: result.data.seed,
        requestId: result.requestId,
        generationMode: "image-to-video",
        endpoint: endpointFor("image", fast, formData),
        ...(usedDurationFallback
          ? { note: "Requested 2-3s is unsupported by this model; generated at 4s instead. Reference MP4 was NOT used." }
          : { note: "Reference MP4 was NOT used — image-to-video only animates your keyframe." }),
      });
    }

    // reference-to-video
    const imageFiles = formData.getAll("images") as File[];
    const videoFiles = formData.getAll("videos") as File[];
    const audioFiles = formData.getAll("audios") as File[];

    const nonEmptyImages = imageFiles.filter((f) => f && f.size > 0);
    const nonEmptyVideos = videoFiles.filter((f) => f && f.size > 0);
    const nonEmptyAudios = audioFiles.filter((f) => f && f.size > 0);

    if (nonEmptyImages.length > 9) {
      return NextResponse.json(
        { error: "At most 9 reference images are allowed." },
        { status: 400 },
      );
    }
    if (nonEmptyVideos.length > 3) {
      return NextResponse.json(
        { error: "At most 3 reference videos are allowed." },
        { status: 400 },
      );
    }
    if (nonEmptyAudios.length > 3) {
      return NextResponse.json(
        { error: "At most 3 audio clips are allowed." },
        { status: 400 },
      );
    }

    if (nonEmptyAudios.length > 0 && nonEmptyImages.length === 0 && nonEmptyVideos.length === 0) {
      return NextResponse.json(
        {
          error:
            "If you attach audio, Seedance requires at least one reference image or video.",
        },
        { status: 400 },
      );
    }

    const imageRefUrl = (formData.get("image_ref_url") as string | null)?.trim();
    const directRefUrls = (formData.get("reference_image_urls") as string | null)
      ?.trim()
      .split(/[\n,]+/)
      .map((u) => u.trim())
      .filter(Boolean);
    const directVideoUrls =
      (formData.get("reference_video_urls") as string | null)
        ?.trim()
        .split(/[\n,]+/)
        .map((u) => u.trim())
        .filter(Boolean) ?? [];
    const uploadedImageUrls =
      nonEmptyImages.length > 0
        ? await Promise.all(nonEmptyImages.map((f) => fal.storage.upload(f)))
        : [];
    const image_urls = [
      ...(directRefUrls ?? []),
      ...uploadedImageUrls,
      ...(imageRefUrl ? [imageRefUrl] : []),
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
    const { prompt: taggedPrompt, added: addedTags } = ensureReferenceTags(
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
      endpointFor("reference", fast, formData),
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
        `Reference is ~${Math.round(refDurationSec)}s — Seedance only uses 2–15s (usually the opening). Trim a 8–12s clip in CapCut for closer motion match.`,
      );
    }

    await trackUsage(auth.user.userId, "video");
    return NextResponse.json({
      videoUrl,
      seed: result.data.seed,
      requestId: result.requestId,
      generationMode: "reference-to-video",
      endpoint: endpointFor("reference", fast, formData),
      referenceVideoCount: videoUrlsFinal?.length ?? nonEmptyVideos.length,
      referenceImageCount: imageUrlsFinal?.length ?? 0,
      ...(addedTags.length
        ? { note: [...notes, `Auto-added tags: ${addedTags.join(", ")}`].join(" ") }
        : notes.length
          ? { note: notes.join(" ") }
          : {}),
    });
  } catch (e: unknown) {
    if (e instanceof ValidationError) {
      console.error("[api/generate] validation", JSON.stringify(e.fieldErrors));
    } else {
      console.error("[api/generate]", e);
    }
    const message = formatFalError(e);
    if (isSeedanceSensitiveError(message)) {
      return NextResponse.json(
        {
          error: message,
          code: "SEEDANCE_SENSITIVE_CONTENT",
          hint:
            "Seedance blocked this clip (violence/combat framing). Try a calmer prompt: no weapons, opponents, or standoffs — figures at rest, peaceful pause, arms at sides. A combat-looking reference image can also trigger this.",
        },
        { status: 422 },
      );
    }
    const status =
      e instanceof ApiError && e.status >= 400 && e.status < 600 ? e.status : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
