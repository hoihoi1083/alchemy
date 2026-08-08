import { fal } from "@fal-ai/client";
import { NextResponse } from "next/server";
import {
  chargeTokens,
  refundTokens,
  videoTokenCostFromRequest,
} from "@/lib/billing/charge";
import { clampVideoResolution } from "@/lib/billing/entitlements";
import { getUserPlan } from "@/lib/billing/get-user-plan";
import { mirrorImageUrlToFalStorage } from "@/lib/fal-mirror-media";
import { requireAppUser, trackUsage } from "@/lib/require-app-user";
import { persistAndDurablize } from "@/lib/storage/durable-media";
import { buildSingleClipManifest } from "@/lib/video-timing-manifest";
import {
  normalizeMinimaxH3Resolution,
  seedancePromptToMinimaxH3,
} from "@/lib/minimax-h3-run";
import { adaptScriptForMinimaxH3 } from "@/lib/video-engine-prompt-adapters";

export const runtime = "nodejs";
export const maxDuration = 300;

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
  const resolution = normalizeMinimaxH3Resolution(
    (formData.get("resolution") as string | null)?.trim() || "2K",
  );
  const aspectRatio =
    (formData.get("aspect_ratio") as string | null)?.trim() || "9:16";

  const plan = await getUserPlan(auth.user.userId);
  const billingRes = clampVideoResolution(
    plan,
    resolution === "768P" ? "720p" : "1080p",
  ).resolution;
  const tokenCost = videoTokenCostFromRequest({
    duration,
    resolution: billingRes,
    fast: false,
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
    let input: Record<string, unknown> = {
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
      input.prompt = adaptScriptForMinimaxH3({
        seedancePrompt: prompt,
        imageCount: 1,
        videoCount: 0,
      });

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

    const result = await fal.subscribe(endpoint, { input, logs: true });
    const videoUrl = extractVideoUrl(result.data);
    if (!videoUrl) {
      throw new Error("MiniMax H3 returned no video.");
    }

    const durableUrl = await persistAndDurablize({
      clerkId: auth.user.userId,
      kind: "video",
      sourceUrl: videoUrl,
      fallbackUrl: videoUrl,
      timingManifest: buildSingleClipManifest(duration, {
        source: "seedance",
        engine: "unknown",
        timingSource: "reported",
      }),
    });
    await trackUsage(auth.user.userId, "video");

    return NextResponse.json({
      videoUrl: durableUrl,
      generationMode: `minimax-h3-${mode}`,
      endpoint,
      tokensCharged: tokenCost,
      creditBalance: balanceAfter,
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
    const message = e instanceof Error ? e.message : "MiniMax H3 generation failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
