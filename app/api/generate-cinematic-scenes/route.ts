import { ApiError, fal } from "@fal-ai/client";
import { NextResponse } from "next/server";
import { defaultTextEndpoint } from "@/lib/image-endpoints";
import type { CinematicReelPlan } from "@/lib/cinematic-reel-types";
import type { CinematicSceneResult } from "@/lib/cinematic-reel-types";
import { requireAppUser, trackUsage } from "@/lib/require-app-user";
import { artStyleAvoidTail, artStyleSystemPrompt, resolveArtStyleId } from "@/lib/art-style";
import { SERVER_ERRORS } from "@/lib/api/server-errors";

export const runtime = "nodejs";
export const maxDuration = 300;

function extractImageUrls(resultData: unknown): string[] {
  if (!resultData || typeof resultData !== "object") return [];
  if ("images" in resultData) {
    const images = (resultData as { images?: Array<{ url?: unknown }> }).images;
    return (images ?? [])
      .map((img) => (typeof img?.url === "string" ? img.url : undefined))
      .filter((u): u is string => Boolean(u));
  }
  if ("image" in resultData) {
    const image = (resultData as { image?: { url?: unknown } }).image;
    if (image && typeof image.url === "string") return [image.url];
  }
  return [];
}

function formatFalError(e: unknown): string {
  if (e instanceof ApiError) {
    return `${e.message}${e.requestId ? ` (fal request: ${e.requestId})` : ""}`;
  }
  if (e && typeof e === "object" && "message" in e) {
    return String((e as { message: unknown }).message);
  }
  return "Cinematic scene image generation failed";
}

export async function POST(request: Request) {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;

  const key = process.env.FAL_KEY?.trim();
  if (!key) {
    return NextResponse.json(
      { error: "Image generation is temporarily unavailable. Please try again later." },
      { status: 503 },
    );
  }
  fal.config({ credentials: key });

  let body: { plan?: CinematicReelPlan; aspect_ratio?: string; endpoint?: string; art_style?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: SERVER_ERRORS.invalidInput }, { status: 400 });
  }

  const plan = body.plan;
  if (!plan?.scenes?.length) {
    return NextResponse.json({ error: "plan with scenes is required." }, { status: 400 });
  }

  const aspectRatio = body.aspect_ratio?.trim() || "9:16";
  const endpoint = body.endpoint?.trim() || defaultTextEndpoint();
  const artStyleId = resolveArtStyleId(body.art_style);

  try {
    const scenes: CinematicSceneResult[] = [];
    for (const scene of plan.scenes) {
      const prompt = [
        scene.imagePrompt.trim(),
        artStyleAvoidTail(artStyleId),
      ]
        .filter(Boolean)
        .join("\n\n");
      const systemPrompt = artStyleSystemPrompt(artStyleId);
      const result = await fal.subscribe(endpoint, {
        input: {
          prompt,
          aspect_ratio: aspectRatio,
          num_images: 1,
          resolution: "1K" as const,
          limit_generations: true,
          ...(systemPrompt ? { system_prompt: systemPrompt } : {}),
        },
        logs: true,
      });
      const outUrls = extractImageUrls(result.data);
      if (!outUrls[0]) {
        return NextResponse.json(
          { error: `Image URL missing for scene ${scene.sceneIndex}.`, raw: result.data },
          { status: 502 },
        );
      }
      scenes.push({ ...scene, imageUrl: outUrls[0] });
    }

    await trackUsage(auth.user.userId, "storyboard");
    return NextResponse.json({
      plan,
      scenes,
      imageUrl: scenes[0]?.imageUrl,
      imageUrls: scenes.map((s) => s.imageUrl),
      endpoint,
      mode: "cinematic-reel",
      sceneCount: scenes.length,
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: formatFalError(e) }, { status: 502 });
  }
}
