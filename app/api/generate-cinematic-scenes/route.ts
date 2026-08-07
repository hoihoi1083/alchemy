import { ApiError, fal } from "@fal-ai/client";
import { NextResponse } from "next/server";
import {
  resolveEditEndpointWhenNeeded,
} from "@/lib/image-endpoints";
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
import { brandKitForGeneration, brandKitWantsLogo } from "@/lib/brand-merge";
import { uploadBrandKitLogoToFal } from "@/lib/brand-kit-fal";
import { brandKitLogoImagePromptBlock } from "@/lib/brand-merge";
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
  const artStyleId = resolveArtStyleId(body.art_style);
  const brandKit =
    brandKitForGeneration(parseBrandKit(body.brand_kit)) ?? parseBrandKit(null);
  const brandLogoWanted = brandKitWantsLogo(brandKit);
  let brandLogoFalUrl: string | null = null;
  let logoMirrorNote: string | undefined;
  if (brandLogoWanted) {
    try {
      brandLogoFalUrl = await uploadBrandKitLogoToFal(brandKit, {
        clerkId: auth.user.userId,
      });
    } catch (e: unknown) {
      const detail = e instanceof Error ? e.message : "Brand logo mirror failed";
      console.error("[generate-cinematic-scenes] brand logo → fal failed", e);
      logoMirrorNote = `Logo AI composite unavailable (${detail}); using exact PNG stamp.`;
    }
  }
  const useBrandLogoModeB = Boolean(brandLogoFalUrl && brandLogoWanted);
  const endpoint = resolveEditEndpointWhenNeeded(body.endpoint, useBrandLogoModeB);

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
        const prompt = [
          scene.imagePrompt.trim(),
          artStyleAvoidTail(artStyleId),
          useBrandLogoModeB ? brandKitLogoImagePromptBlock(1) : "",
          "TEXTLESS cinematic still: no marketing captions or watermarks.",
        ]
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
            ...(useBrandLogoModeB && brandLogoFalUrl
              ? { image_urls: [brandLogoFalUrl] }
              : {}),
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
    let sourceUrls = falUrls;
    let logoStamped = false;
    let logoMode: "nano-banana" | "stamp-fallback" | "none" = useBrandLogoModeB
      ? "nano-banana"
      : "none";

    // Mode B failed to mirror logo → stamp fal CDN stills before durable persist.
    if (brandLogoWanted && !useBrandLogoModeB) {
      try {
        const placement =
          body.logo_placement === "bottom-right" ||
          body.logo_placement === "bottom-left" ||
          body.logo_placement === "top-left" ||
          body.logo_placement === "top-right"
            ? (body.logo_placement as LogoPlacement)
            : CINEMATIC_LOGO_PLACEMENT;
        const stamped = await archiveCinematicStillsWithBrandLogo(
          request,
          falUrls,
          brandKit,
          auth.user.userId,
          placement,
        );
        if (stamped.logoStamped && stamped.urls.length === falUrls.length) {
          sourceUrls = stamped.urls;
          logoStamped = true;
          logoMode = "stamp-fallback";
        } else if (!logoMirrorNote) {
          logoMirrorNote = "Brand logo was opted in but could not be applied to cinematic stills.";
        }
      } catch (stampErr) {
        console.error("[generate-cinematic-scenes] logo stamp fallback failed", stampErr);
        if (!logoMirrorNote) {
          logoMirrorNote =
            stampErr instanceof Error
              ? stampErr.message
              : "Brand logo stamp failed.";
        }
      }
    }

    const durableUrls = await persistAndDurablizeMany({
      clerkId: auth.user.userId,
      kind: "image",
      sourceUrls,
      fallbackUrls: sourceUrls,
      prompt: "cinematic-reel",
    });
    const finalUrls = durableUrls.map((u, i) => u ?? sourceUrls[i]!);

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
      logoMode,
      logoIntegrated: useBrandLogoModeB || logoStamped,
      logoStamped,
      ...(logoMirrorNote ? { logoNote: logoMirrorNote } : {}),
    });
  } catch (e: unknown) {
    await refundTokens(auth.user.userId, tokenCost, {
      kind: "cinematic_scenes",
      reason: "generation_failed",
    });
    return NextResponse.json({ error: formatFalError(e) }, { status: 502 });
  }
}
