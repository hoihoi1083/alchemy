import { fal } from "@fal-ai/client";
import { NextResponse } from "next/server";
import {
  chargeTokens,
  refundTokens,
  h3TokenCostFromRequest,
} from "@/lib/billing/charge";
import { getUserPlan } from "@/lib/billing/get-user-plan";
import { videoCapForPlan } from "@/lib/billing/entitlements";
import { mirrorImageUrlToFalStorage } from "@/lib/fal-mirror-media";
import { requireAppUser, trackUsage } from "@/lib/require-app-user";
import { persistAndDurablize } from "@/lib/storage/durable-media";
import { createOwnedJobDir } from "@/lib/pipeline/job-owner";
import { materializeMediaInput } from "@/lib/pipeline/local-input";
import { burnMotionPosterTypeOverlay } from "@/lib/pipeline/motion-poster-type-burn";
import { parseMotionPosterDialectPick } from "@/lib/motion-poster-dialects";
import { promises as fs } from "fs";
import path from "path";
import { buildSingleClipManifest } from "@/lib/video-timing-manifest";
import {
  clampMinimaxH3ResolutionForPlan,
  normalizeMinimaxH3Resolution,
  seedancePromptToMinimaxH3,
} from "@/lib/minimax-h3-run";
import { adaptScriptForMinimaxH3 } from "@/lib/video-engine-prompt-adapters";

export const runtime = "nodejs";
/** H3 reference-to-video often runs 5–7+ minutes on fal; Pro/Enterprise allow up to 800s. */
export const maxDuration = 800;

type Mode = "text" | "image" | "reference";

function extractVideoUrl(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const video = (data as { video?: { url?: unknown } }).video;
  if (video && typeof video.url === "string" && video.url) return video.url;
  return null;
}

function h3Endpoint(mode: Mode): string {
  if (mode === "text") return "minimax/h3/text-to-video";
  if (mode === "image") return "minimax/h3/image-to-video";
  return "minimax/h3/reference-to-video";
}

function clampH3Duration(raw: string | null): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return 8;
  return Math.min(15, Math.max(5, Math.round(n)));
}

function isMotionPosterForm(formData: FormData): boolean {
  return ["1", "true", "yes"].includes(
    String(formData.get("motion_poster") ?? "")
      .trim()
      .toLowerCase(),
  );
}

/**
 * MiniMax H3 on fal — face/product lock + reference multimodal.
 * Separate from Seedance `/api/generate` because input field shapes differ.
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

  const mode = (formData.get("mode") as string) as Mode;
  if (mode !== "text" && mode !== "image" && mode !== "reference") {
    return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
  }

  const prompt = (formData.get("prompt") as string | null)?.trim() || "";
  if (!prompt) {
    return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
  }

  const duration = clampH3Duration(formData.get("duration") as string | null);
  const plan = await getUserPlan(auth.user.userId);
  const requestedH3 = normalizeMinimaxH3Resolution(
    (formData.get("resolution") as string | null)?.trim() || videoCapForPlan(plan),
  );
  const resolution = clampMinimaxH3ResolutionForPlan(plan, requestedH3);
  const aspectRatio =
    (formData.get("aspect_ratio") as string | null)?.trim() || "9:16";

  const expectsRefVideo =
    Boolean((formData.get("reference_video_url") as string | null)?.trim()) ||
    Boolean((formData.get("reference_video") as File | null)?.size) ||
    [...formData.getAll("videos")].some((f) => f instanceof File && f.size > 0);
  let refImageCount = 0;
  if ((formData.get("image_start") as File | null)?.size) refImageCount += 1;
  if ((formData.get("image_start_url") as string | null)?.trim()) refImageCount += 1;
  for (const key of ["reference_images", "images"] as const) {
    for (const f of formData.getAll(key)) {
      if (f instanceof File && f.size > 0) refImageCount += 1;
    }
  }
  const extraReferenceImages = Math.max(0, Math.min(9, refImageCount) - 5);
  const tokenCost = h3TokenCostFromRequest({
    duration,
    resolution,
    referenceVideoSec: expectsRefVideo ? duration : 0,
    extraReferenceImages,
  });

  const charged = await chargeTokens(auth.user.userId, tokenCost, {
    kind: "minimax_h3",
    mode,
    duration,
  });
  if ("error" in charged) return charged.error;
  const balanceAfter = charged.balanceAfter;

  try {
    const endpoint = h3Endpoint(mode);
    const input: Record<string, unknown> = {
      prompt: seedancePromptToMinimaxH3(prompt),
      duration,
      resolution,
      aspect_ratio: aspectRatio,
    };

    if (mode === "image") {
      let imageUrl =
        (formData.get("image_start_url") as string | null)?.trim() || "";
      const imageFile = formData.get("image_start") as File | null;
      if (!imageUrl && imageFile && imageFile.size > 0) {
        imageUrl = await fal.storage.upload(imageFile);
      }
      if (!imageUrl) {
        throw new Error("Image-to-video needs a start frame.");
      }
      imageUrl = await mirrorImageUrlToFalStorage(imageUrl, {
        clerkId: auth.user.userId,
        refresh: true,
      });
      input.image_url = imageUrl;
      let endUrl =
        (formData.get("image_end_url") as string | null)?.trim() || "";
      const endFile = formData.get("image_end") as File | null;
      if (!endUrl && endFile && endFile.size > 0) {
        endUrl = await fal.storage.upload(endFile);
      }
      if (endUrl) {
        endUrl = await mirrorImageUrlToFalStorage(endUrl, {
          clerkId: auth.user.userId,
          refresh: true,
        });
        input.end_image_url = endUrl;
      }
      input.prompt = adaptScriptForMinimaxH3({
        seedancePrompt: prompt,
        imageCount: endUrl ? 2 : 1,
        videoCount: 0,
        // Start→end poster: Image 2 already has type. Loop/textless stills stay silent.
        preserveOnScreenType: Boolean(endUrl),
      });
    }

    if (mode === "reference") {
      const refImages: string[] = [];
      const imageFile = formData.get("image_start") as File | null;
      if (imageFile && imageFile.size > 0) {
        refImages.push(await fal.storage.upload(imageFile));
      }
      const startUrl = (formData.get("image_start_url") as string | null)?.trim();
      if (startUrl) refImages.push(startUrl);
      for (const f of formData.getAll("reference_images") as File[]) {
        if (f && f.size > 0) refImages.push(await fal.storage.upload(f));
      }
      // Wizard product-assistant / Seedance-shaped clients send `images`.
      for (const f of formData.getAll("images") as File[]) {
        if (f && f.size > 0) refImages.push(await fal.storage.upload(f));
      }
      const refVideos: string[] = [];
      const refVideo = formData.get("reference_video") as File | null;
      if (refVideo && refVideo.size > 0) {
        refVideos.push(await fal.storage.upload(refVideo));
      }
      const refVideoUrl = (formData.get("reference_video_url") as string | null)?.trim();
      if (refVideoUrl) refVideos.push(refVideoUrl);

      if (!refImages.length && !refVideos.length) {
        throw new Error("Reference mode needs at least one image or video.");
      }
      if (refImages.length) {
        input.reference_image_urls = await Promise.all(
          refImages.slice(0, 9).map((u) =>
            mirrorImageUrlToFalStorage(u, { clerkId: auth.user.userId, refresh: true }),
          ),
        );
      }
      if (refVideos.length) {
        input.reference_video_urls = refVideos.slice(0, 3);
      }
      input.prompt = adaptScriptForMinimaxH3({
        seedancePrompt: prompt,
        imageCount: refImages.length,
        videoCount: refVideos.length,
      });
    }

    const startedAt = Date.now();
    console.info(
      `[generate-minimax-h3] start mode=${mode} endpoint=${endpoint} duration=${duration}s resolution=${resolution}`,
    );
    const result = await fal.subscribe(endpoint, { input, logs: true });
    console.info(
      `[generate-minimax-h3] fal done in ${((Date.now() - startedAt) / 1000).toFixed(1)}s mode=${mode}`,
    );
    const videoUrl = extractVideoUrl(result.data);
    if (!videoUrl) {
      throw new Error("Video generation returned no output.");
    }

    let finalUrl = videoUrl;
    let typeOverlay: string | undefined;
    const hasEndFrame = Boolean(
      (formData.get("image_end_url") as string | null)?.trim() ||
        ((formData.get("image_end") as File | null)?.size ?? 0) > 0,
    );
    if (mode === "image" && isMotionPosterForm(formData) && !hasEndFrame) {
      try {
        const dialectPick = parseMotionPosterDialectPick(
          formData.get("motion_poster_dialect"),
        );
        const dialect = dialectPick === "auto" ? undefined : dialectPick;
        const { dir } = await createOwnedJobDir(auth.user.userId);
        const inPath = path.join(dir, "h3.mp4");
        const outPath = path.join(dir, "poster-typed.mp4");
        await materializeMediaInput(videoUrl, inPath, { clerkId: auth.user.userId });
        const overlayPlan = await burnMotionPosterTypeOverlay({
          inputVideo: inPath,
          outputVideo: outPath,
          workDir: dir,
          headline: String(formData.get("headline") ?? "").trim(),
          subline: String(formData.get("subline") ?? "").trim(),
          offer: String(formData.get("offer") ?? "").trim(),
          product:
            String(formData.get("product_name") ?? "").trim() ||
            String(formData.get("business") ?? "").trim(),
          dialect,
          durationSec: duration,
        });
        if (overlayPlan) {
          const bytes = await fs.readFile(outPath);
          finalUrl = await persistAndDurablize({
            clerkId: auth.user.userId,
            kind: "video",
            sourceUrl: `${videoUrl}#poster-type`,
            fallbackUrl: videoUrl,
            bytes,
            contentType: "video/mp4",
            timingManifest: buildSingleClipManifest(duration, {
              source: "seedance",
              engine: "unknown",
              timingSource: "reported",
            }),
          });
          typeOverlay = overlayPlan.kind;
        }
      } catch (overlayErr) {
        console.warn("[generate-minimax-h3] poster type overlay failed:", overlayErr);
      }
    }

    const durableUrl =
      finalUrl === videoUrl
        ? await persistAndDurablize({
            clerkId: auth.user.userId,
            kind: "video",
            sourceUrl: videoUrl,
            fallbackUrl: videoUrl,
            timingManifest: buildSingleClipManifest(duration, {
              source: "seedance",
              engine: "unknown",
              timingSource: "reported",
            }),
          })
        : finalUrl;
    await trackUsage(auth.user.userId, "video");

    return NextResponse.json({
      videoUrl: durableUrl,
      generationMode: `minimax-h3-${mode}`,
      endpoint,
      tokensCharged: tokenCost,
      creditBalance: balanceAfter,
      typeOverlay,
      timingManifest: buildSingleClipManifest(duration, {
        source: "seedance",
        engine: "unknown",
        timingSource: "reported",
      }),
    });
  } catch (e: unknown) {
    await refundTokens(auth.user.userId, tokenCost, {
      kind: "minimax_h3",
      reason: "generation_failed",
    });
    const message = e instanceof Error ? e.message : "Video generation failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
