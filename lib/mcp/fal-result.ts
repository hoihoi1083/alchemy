import { NextResponse } from "next/server";
import { PRODUCT_SITE_URL } from "@/lib/brand";

export function extractImageUrls(resultData: unknown): string[] {
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
  if ("url" in resultData) {
    const url = (resultData as { url?: unknown }).url;
    if (typeof url === "string") return [url];
  }
  return [];
}

export function extractVideoUrl(resultData: unknown): string | undefined {
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
    if (typeof val === "string" && /\.(mp4|mov|webm)(\?|$)/i.test(val)) return val;
  }
  return undefined;
}

export type McpJobErr = {
  ok: false;
  error: string;
  code?: string;
  status?: number;
  balance?: number;
  required?: number;
  pricingUrl?: string;
  hint?: string;
};

export async function chargeErrorFromResponse(res: {
  error: NextResponse;
}): Promise<McpJobErr> {
  const body = (await res.error.json().catch(() => null)) as {
    error?: string;
    code?: string;
    balance?: number;
    required?: number;
  } | null;
  const isInsufficient =
    body?.code === "INSUFFICIENT_TOKENS" || res.error.status === 402;
  const pricingUrl = `${PRODUCT_SITE_URL.replace(/\/$/, "")}/pricing`;
  const errorMsg =
    isInsufficient &&
    typeof body?.required === "number" &&
    typeof body?.balance === "number"
      ? `Insufficient tokens: you need ${body.required} tokens but currently have ${body.balance}.`
      : body?.error ?? "Could not charge tokens";

  return {
    ok: false,
    error: errorMsg,
    code: body?.code,
    status: res.error.status,
    balance: body?.balance,
    required: body?.required,
    pricingUrl: isInsufficient ? pricingUrl : undefined,
    hint: isInsufficient
      ? `Recharge tokens or upgrade your subscription at ${pricingUrl}`
      : undefined,
  };
}
