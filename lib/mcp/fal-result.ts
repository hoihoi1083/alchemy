import { NextResponse } from "next/server";

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
};

export async function chargeErrorFromResponse(res: {
  error: NextResponse;
}): Promise<McpJobErr> {
  const body = (await res.error.json().catch(() => null)) as {
    error?: string;
    code?: string;
  } | null;
  return {
    ok: false,
    error: body?.error ?? "Could not charge tokens",
    code: body?.code,
    status: res.error.status,
  };
}
