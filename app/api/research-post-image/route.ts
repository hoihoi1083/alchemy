import { NextResponse } from "next/server";
import { assertPlatformResearchAllowed } from "@/lib/billing/assert-platform-research";
import { requireAppUser } from "@/lib/require-app-user";
import { hostMatchesAllowlist } from "@/lib/pipeline/safe-url";
import { toBrowserJpegBuffer } from "@/lib/xhs-image-browser";

export const runtime = "nodejs";
export const maxDuration = 60;

const UPSTREAM_TIMEOUT_MS = 25_000;
const TRANSCODE_TIMEOUT_MS = 30_000;

const ALLOWED_HOSTS = [
  "xhscdn.com",
  "xiaohongshu.com",
  "ci.xiaohongshu.com",
  "rednotecdn.com",
  "sns-img",
  "sns-webpic",
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
] as const;

const REFERERS: Record<string, string> = {
  xiaohongshu: "https://www.xiaohongshu.com/",
  instagram: "https://www.instagram.com/",
  tiktok: "https://www.tiktok.com/",
  facebook: "https://www.facebook.com/",
};

/** Exact / subdomain / DNS-label match only — never substring host.includes (SSRF). */
function isAllowedImageUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;
    return hostMatchesAllowlist(url.hostname, ALLOWED_HOSTS);
  } catch {
    return false;
  }
}

function xhsWebpFallbackUrl(url: string): string | null {
  if (!/\/format\/heif|\/format\/heic/i.test(url)) return null;
  return url
    .replace(/\/format\/heif/gi, "/format/webp")
    .replace(/\/format\/heic/gi, "/format/webp");
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out`)), ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

async function fetchUpstreamImage(raw: string, referer: string): Promise<Response> {
  const fetchHeaders = {
    Referer: referer,
    Origin: referer.replace(/\/$/, ""),
    Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
    "Accept-Language": "zh-HK,zh;q=0.9,en;q=0.8",
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  };

  const primary = await fetch(raw, {
    headers: fetchHeaders,
    cache: "no-store",
    redirect: "follow",
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
  });
  if (primary.ok) return primary;

  const fallback = xhsWebpFallbackUrl(raw);
  if (!fallback || fallback === raw) return primary;

  const alt = await fetch(fallback, {
    headers: fetchHeaders,
    cache: "no-store",
    redirect: "follow",
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
  });
  return alt.ok ? alt : primary;
}

export async function GET(request: Request) {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;
  const gated = await assertPlatformResearchAllowed(auth.user.userId);
  if (gated) return gated;

  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("url")?.trim();
  const platform = searchParams.get("platform")?.trim() ?? "xiaohongshu";
  if (!raw || !isAllowedImageUrl(raw)) {
    return NextResponse.json({ error: "Invalid image URL." }, { status: 400 });
  }

  const referer = REFERERS[platform] ?? "https://www.xiaohongshu.com/";

  try {
    const upstream = await fetchUpstreamImage(raw, referer);

    if (!upstream.ok) {
      let host = raw;
      try {
        host = new URL(raw).hostname;
      } catch {
        // ignore
      }
      console.warn("[research-post-image] upstream fetch failed", {
        status: upstream.status,
        host,
        platform,
      });
      return NextResponse.json({ error: "Image fetch failed." }, { status: 502 });
    }

    const upstreamType = upstream.headers.get("content-type") ?? "image/jpeg";
    const rawBuffer = Buffer.from(await upstream.arrayBuffer());
    if (rawBuffer.length < 64) {
      return NextResponse.json({ error: "Image fetch failed — empty file." }, { status: 502 });
    }

    const { buffer, contentType } = await withTimeout(
      toBrowserJpegBuffer(rawBuffer, upstreamType, raw),
      TRANSCODE_TIMEOUT_MS,
      "Image transcode",
    );

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Image proxy error.";
    console.warn("[research-post-image] proxy error", { message, platform });
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
