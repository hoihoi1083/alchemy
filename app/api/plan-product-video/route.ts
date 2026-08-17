import { ApiError, fal } from "@fal-ai/client";
import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/require-app-user";
import { assertFreeDeepSeekQuota } from "@/lib/rate-limit-deepseek";
import type { PromptMarket, SubjectFraming } from "@/lib/prompt-variables";
import { planProductVideoFromVision } from "@/lib/product-video-plan";
import {
  PRODUCT_VIDEO_KIT_SLOTS,
  type ProductVideoKitSlot,
} from "@/lib/product-video-types";
import { mergePromptExtra, type VisualStyleId } from "@/lib/visual-styles";
import { artStylePlannerHint, resolveArtStyleId } from "@/lib/art-style";
import { analyzeProductImagesWithVision } from "@/lib/vision-analyze";

export const runtime = "nodejs";
export const maxDuration = 120;

function formatFalError(e: unknown): string {
  if (e instanceof ApiError) {
    const detail = e.message?.trim() || "Request failed";
    if (e.status === 401 || e.status === 403 || /forbidden|unauthorized/i.test(detail)) {
      return "Photo analysis was blocked. Try a smaller JPG/PNG, or try again later.";
    }
    return "Photo analysis failed. Try a smaller JPG/PNG, or try again later.";
  }
  if (e && typeof e === "object" && "message" in e) {
    return String((e as { message: unknown }).message);
  }
  return "Product video planning failed.";
}

function isFalForbidden(e: unknown): boolean {
  if (e instanceof ApiError) {
    return e.status === 401 || e.status === 403 || /forbidden|unauthorized/i.test(e.message);
  }
  if (e instanceof Error) {
    return /blocked \(40[13]\)|forbidden|unauthorized|FAL_KEY access/i.test(e.message);
  }
  return false;
}

function stubVisionFromUpload(input: {
  productName: string;
  slots: ProductVideoKitSlot[];
  imageCount: number;
}): import("@/lib/product-video-types").ProductVideoVisionProfile {
  const name = input.productName.trim() || "Product";
  return {
    productSummary: `${name} product marketing reel`,
    category: "consumer product",
    materials: [],
    colors: [],
    situation: "Clean commercial setting with soft product lighting",
    imageRoles: Array.from({ length: input.imageCount }, (_, i) => {
      const slot = input.slots[i] ?? "hero";
      return {
        imageIndex: i + 1,
        slot,
        role: slot === "hero" ? "Main product hero" : `Product ${slot}`,
        visualDescription: `Uploaded ${slot} product photo for identity reference`,
      };
    }),
  };
}

function parseDurationSec(raw: string): number {
  if (raw === "auto") return 8;
  const n = parseInt(raw, 10);
  if (Number.isNaN(n)) return 8;
  return Math.min(15, Math.max(4, n));
}

function isKitSlot(value: string): value is ProductVideoKitSlot {
  return (PRODUCT_VIDEO_KIT_SLOTS as string[]).includes(value);
}

export async function POST(request: Request) {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;
  const quota = await assertFreeDeepSeekQuota(auth.user.userId);
  if (!quota.ok) return quota.response;

  const key = process.env.FAL_KEY?.trim();
  if (!key) {
    return NextResponse.json(
      { error: "Video planning is temporarily unavailable. Please try again later." },
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

  const slotsRaw = (formData.get("slots") as string | null)?.trim() || "hero";
  const slots = slotsRaw
    .split(",")
    .map((s) => s.trim())
    .filter(isKitSlot);

  const files: File[] = [];
  for (const slot of slots.length ? slots : (["hero"] as ProductVideoKitSlot[])) {
    const entry = formData.get(slot);
    // DOM FormData types say File | string; Node/undici may still hand back a plain Blob.
    if (entry instanceof File && entry.size > 0) {
      files.push(entry);
    } else if (entry instanceof Blob && entry.size > 0) {
      const blob = entry as Blob;
      files.push(new File([blob], `${slot}.jpg`, { type: blob.type || "image/jpeg" }));
    }
  }

  if (!files.length) {
    return NextResponse.json(
      { error: "Upload at least one product photo (hero)." },
      { status: 400 },
    );
  }

  const effectiveSlots =
    slots.length === files.length
      ? slots
      : files.map((_, i) => PRODUCT_VIDEO_KIT_SLOTS[i] ?? "extra2");

  if (files.length > 4) {
    return NextResponse.json(
      { error: "Maximum 4 product images (hero + packaging + 2 extras)." },
      { status: 400 },
    );
  }

  const productName = (formData.get("product_name") as string | null)?.trim() || "";
  const business = (formData.get("business") as string | null)?.trim() || "";
  const headline = (formData.get("headline") as string | null)?.trim() || "";
  const subline = (formData.get("subline") as string | null)?.trim() || "";
  const offer = (formData.get("offer") as string | null)?.trim() || "";
  const promptMarket = ((formData.get("prompt_market") as string | null)?.trim() ||
    "hk") as PromptMarket;
  const subjectFraming = ((formData.get("subject_framing") as string | null)?.trim() ||
    "auto") as SubjectFraming;
  const promptExtra = (formData.get("prompt_extra") as string | null)?.trim() || "";
  const visualStyle = ((formData.get("visual_style") as string | null)?.trim() ||
    "product") as VisualStyleId;
  const durationSec = parseDurationSec(
    (formData.get("duration") as string | null)?.trim() || "8",
  );
  const artStyleId = resolveArtStyleId((formData.get("art_style") as string | null)?.trim());
  const styleHint = [
    mergePromptExtra(visualStyle, promptExtra),
    artStyleId !== "realistic" ? artStylePlannerHint(artStyleId) : "",
  ]
    .filter(Boolean)
    .join(". ");

  try {
    let imageUrls: string[];
    try {
      imageUrls = await Promise.all(files.map((f) => fal.storage.upload(f)));
    } catch (uploadErr: unknown) {
      if (isFalForbidden(uploadErr)) {
        return NextResponse.json(
          {
            error:
              "Could not upload the product photo to AI storage (Forbidden). Check FAL_KEY credits/permissions, or try a smaller JPG/PNG under 5MB.",
          },
          { status: 502 },
        );
      }
      throw uploadErr;
    }

    let vision;
    let visionNote = "vision (Gemini/Bagel)";
    try {
      vision = await analyzeProductImagesWithVision({
        imageUrls,
        slots: effectiveSlots,
        productName,
      });
    } catch (visionErr: unknown) {
      // fal vision often returns bare "Forbidden", empty analysis, or JSON parse noise.
      // Fall back so video-only users can still get a DeepSeek motion prompt.
      const visionMsg = formatFalError(visionErr);
      console.warn("[plan-product-video] vision failed — falling back to stub vision:", visionMsg);
      vision = stubVisionFromUpload({
        productName,
        slots: effectiveSlots,
        imageCount: files.length,
      });
      visionNote = isFalForbidden(visionErr) || /Photo analysis was blocked|forbidden/i.test(visionMsg)
        ? "vision fallback (photo upload OK; AI vision blocked)"
        : "vision fallback (photo upload OK; AI vision failed)";
    }

    const plan = await planProductVideoFromVision({
      vision,
      product: productName,
      business,
      headline,
      subline,
      offer,
      durationSec,
      market: promptMarket,
      framing: subjectFraming,
      styleHint,
      artStyleId,
    });

    return NextResponse.json({
      plan,
      vision,
      imageCount: files.length,
      sourceNote: `AI video assistant — ${visionNote} + motion prompt (AI)`,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : formatFalError(e);
    console.error("[plan-product-video] failed:", message, e);
    const status =
      message.includes("DEEPSEEK_API_KEY") ||
      message.includes("DeepSeek API") ||
      message.includes("balance")
        ? 503
        : isFalForbidden(e) || /Photo analysis was blocked/i.test(message)
          ? 502
          : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
