import type { ContentPlatform } from "@/lib/content-research-types";

const ALLOWED_HOSTS = [
  "xhscdn.com",
  "rednotecdn.com",
  "xiaohongshu.com",
  "ci.xiaohongshu.com",
  "sns-video",
  "sns-bak-v8.xhscdn.com",
  "sns-bak-v10.xhscdn.com",
  "cdninstagram.com",
  "instagram.com",
  "fbcdn.net",
  "facebook.com",
  "fbsbx.com",
  "scontent",
  "tiktokcdn.com",
  "tiktokv.com",
  "tiktokcdn-us.com",
  "muscdn.com",
  "byteimg.com",
  "bytecdn.cn",
];

const REFERERS: Record<string, string> = {
  xiaohongshu: "https://www.xiaohongshu.com/",
  instagram: "https://www.instagram.com/",
  tiktok: "https://www.tiktok.com/",
  facebook: "https://www.facebook.com/",
};

export const RESEARCH_VIDEO_MAX_BYTES = 50 * 1024 * 1024;

export function isAllowedResearchVideoUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;
    const host = url.hostname.toLowerCase();
    if (host.includes("m3u8")) return false;
    return ALLOWED_HOSTS.some((h) => host === h || host.endsWith(`.${h}`) || host.includes(h));
  } catch {
    return false;
  }
}

export type ResearchVideoFetchResult = {
  ok: boolean;
  bytes?: number;
  buffer?: ArrayBuffer;
  contentType?: string;
  error?: string;
  status?: number;
};

/** Server-side fetch of a platform CDN video URL (same logic as /api/research-post-video). */
export async function fetchResearchPostVideoBytes(
  videoUrl: string,
  platform: ContentPlatform,
): Promise<ResearchVideoFetchResult> {
  if (!isAllowedResearchVideoUrl(videoUrl)) {
    return { ok: false, error: "invalid_url" };
  }

  const referer = REFERERS[platform] ?? "https://www.tiktok.com/";

  try {
    const upstream = await fetch(videoUrl, {
      headers: {
        Referer: referer,
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      cache: "no-store",
    });

    if (!upstream.ok) {
      return { ok: false, error: "upstream_failed", status: upstream.status };
    }

    const contentLength = Number(upstream.headers.get("content-length") ?? 0);
    if (contentLength > RESEARCH_VIDEO_MAX_BYTES) {
      return { ok: false, error: "too_large", status: 413 };
    }

    const buffer = await upstream.arrayBuffer();
    if (buffer.byteLength > RESEARCH_VIDEO_MAX_BYTES) {
      return { ok: false, error: "too_large", status: 413 };
    }
    if (buffer.byteLength < 1024) {
      return { ok: false, error: "too_small", bytes: buffer.byteLength };
    }

    const contentType = upstream.headers.get("content-type") ?? "video/mp4";
    return { ok: true, bytes: buffer.byteLength, buffer, contentType };
  } catch {
    return { ok: false, error: "fetch_error" };
  }
}

/** MP4/MOV files start with a box size + "ftyp" at offset 4. */
export function bufferLooksLikeMp4(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < 12) return false;
  const view = new DataView(buffer);
  const tag =
    String.fromCharCode(
      view.getUint8(4),
      view.getUint8(5),
      view.getUint8(6),
      view.getUint8(7),
    );
  return tag === "ftyp";
}
