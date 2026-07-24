import { ApiError, fal } from "@fal-ai/client";
import { NextResponse } from "next/server";
import { defaultTextEndpoint, sanitizeImageEndpoint } from "@/lib/image-endpoints";
import { persistAndDurablizeMany } from "@/lib/storage/durable-media";
import type { CinematicReelPlan } from "@/lib/cinematic-reel-types";
import type { CinematicSceneResult } from "@/lib/cinematic-reel-types";
import { chargeTokens, refundTokens } from "@/lib/billing/charge";
import { clampImageResolution } from "@/lib/billing/entitlements";
import { getUserPlan } from "@/lib/billing/get-user-plan";
import { estimateImageTokens } from "@/lib/billing/token-costs";
import { requireAppUser, trackUsage } from "@/lib/require-app-user";
import { artStyleAvoidTail, artStyleSystemPrompt, resolveArtStyleId } from "@/lib/art-style";
import { SERVER_ERRORS } from "@/lib/api/server-errors";
import { parseBrandKit } from "@/lib/brand-kit";
import {
  archiveCinematicStillsWithBrandLogo,
  CINEMATIC_LOGO_PLACEMENT,
} from "@/lib/brand-logo-composite";
import type { LogoPlacement } from "@/lib/image-refine-prompt";

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

const PLACEMENTS: LogoPlacement[] = [
  "bottom-right",
  "bottom-left",
  "top-right",
  "top-left",
  "center",
  "replace",
];

function parsePlacement(raw: unknown): LogoPlacement {
  if (typeof raw === "string" && (PLACEMENTS as string[]).includes(raw)) {
    return raw as LogoPlacement;
  }
  return CINEMATIC_LOGO_PLACEMENT;
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

  let body: {
    plan?: CinematicReelPlan;
    aspect_ratio?: string;
    endpoint?: string;
    art_style?: string;
    brand_kit?: unknown;
    logo_placement?: string;
  };
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
  const endpoint = sanitizeImageEndpoint(body.endpoint, defaultTextEndpoint());
  const artStyleId = resolveArtStyleId(body.art_style);
  const brandKit = parseBrandKit(body.brand_kit);
  const logoPlacement = parsePlacement(body.logo_placement);

  const tokenCost = estimateImageTokens({
    mode: "storyboard",
    sceneCount: plan.scenes.length,
  });
  const charged = await chargeTokens(auth.user.userId, tokenCost, {
    kind: "cinematic_scenes",
    sceneCount: plan.scenes.length,
  });
  if ("error" in charged) return charged.error;
  const balanceAfter = charged.balanceAfter;

  const { resolution: imageResolution } = clampImageResolution(
    await getUserPlan(auth.user.userId),
  );

  try {
    const scenes = await Promise.all(
      plan.scenes.map(async (scene) => {
        const prompt = [scene.imagePrompt.trim(), artStyleAvoidTail(artStyleId)]
          .filter(Boolean)
          .join("\n\n");
        const systemPrompt = artStyleSystemPrompt(artStyleId);
        const result = await fal.subscribe(endpoint, {
          input: {
            prompt,
            aspect_ratio: aspectRatio,
            num_images: 1,
            resolution: imageResolution,
            limit_generations: true,
            ...(systemPrompt ? { system_prompt: systemPrompt } : {}),
          },
          logs: true,
        });
        const outUrls = extractImageUrls(result.data);
        if (!outUrls[0]) {
          throw new Error(`Image URL missing for scene ${scene.sceneIndex}.`);
        }
        return { ...scene, imageUrl: outUrls[0] };
      }),
    );

    const falUrls = scenes.map((s) => s.imageUrl);
    const durableUrls = await persistAndDurablizeMany({
      clerkId: auth.user.userId,
      kind: "image",
      sourceUrls: falUrls,
      fallbackUrls: falUrls,
      prompt: "cinematic-reel",
    });
    let finalUrls = durableUrls.map((u, i) => u ?? falUrls[i]!);

    let logoStamped = false;
    if (brandKit.logoUrl) {
      const stamped = await archiveCinematicStillsWithBrandLogo(
        request,
        finalUrls,
        brandKit,
        logoPlacement,
      );
      if (stamped.logoStamped && stamped.urls.length === finalUrls.length) {
        finalUrls = stamped.urls;
        logoStamped = true;
      }
    }

    const durableScenes: CinematicSceneResult[] = scenes.map((scene, index) => ({
      ...scene,
      imageUrl: finalUrls[index] ?? scene.imageUrl,
    }));

    await trackUsage(auth.user.userId, "storyboard");
    return NextResponse.json({
      plan,
      scenes: durableScenes,
      imageUrl: durableScenes[0]?.imageUrl,
      imageUrls: durableScenes.map((s) => s.imageUrl),
      endpoint,
      mode: "cinematic-reel",
      sceneCount: durableScenes.length,
      tokensCharged: tokenCost,
      creditBalance: balanceAfter,
      logoStamped,
      logoPlacement: logoStamped ? logoPlacement : undefined,
    });
  } catch (e: unknown) {
    await refundTokens(auth.user.userId, tokenCost, {
      kind: "cinematic_scenes",
      reason: "generation_failed",
    });
    return NextResponse.json({ error: formatFalError(e) }, { status: 502 });
  }
}
