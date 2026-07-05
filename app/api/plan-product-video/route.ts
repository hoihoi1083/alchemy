import { ApiError, fal } from "@fal-ai/client";
import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/require-app-user";
import type { PromptMarket, SubjectFraming } from "@/lib/prompt-variables";
import { planProductVideoFromVision } from "@/lib/product-video-plan";
import {
  PRODUCT_VIDEO_KIT_SLOTS,
  type ProductVideoKitSlot,
} from "@/lib/product-video-types";
import { mergePromptExtra, type VisualStyleId } from "@/lib/visual-styles";
import { analyzeProductImagesWithVision } from "@/lib/vision-analyze";

export const runtime = "nodejs";
export const maxDuration = 120;

function formatFalError(e: unknown): string {
  if (e instanceof ApiError) {
    return `${e.message}${e.requestId ? ` (fal request: ${e.requestId})` : ""}`;
  }
  if (e && typeof e === "object" && "message" in e) {
    return String((e as { message: unknown }).message);
  }
  return "Product video planning failed.";
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
    const file = formData.get(slot);
    if (file instanceof File && file.size > 0) {
      files.push(file);
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
  const styleHint = mergePromptExtra(visualStyle, promptExtra);

  try {
    const imageUrls = await Promise.all(files.map((f) => fal.storage.upload(f)));

    const vision = await analyzeProductImagesWithVision({
      imageUrls,
      slots: effectiveSlots,
      productName,
    });

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
    });

    return NextResponse.json({
      plan,
      vision,
      imageCount: files.length,
      sourceNote: "AI video assistant — vision (Gemini) + Seedance prompt (DeepSeek)",
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : formatFalError(e);
    const status =
      message.includes("DEEPSEEK_API_KEY") ||
      message.includes("DeepSeek API") ||
      message.includes("balance")
        ? 503
        : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
