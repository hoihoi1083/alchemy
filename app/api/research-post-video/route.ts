import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/require-app-user";

export const runtime = "nodejs";
export const maxDuration = 120;

const ALLOWED_HOSTS = [
  "xhscdn.com",
  "xiaohongshu.com",
  "ci.xiaohongshu.com",
  "sns-video",
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

const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

function isAllowedVideoUrl(raw: string): boolean {
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

export async function GET(request: Request) {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("url")?.trim();
  const platform = searchParams.get("platform")?.trim() ?? "tiktok";
  if (!raw || !isAllowedVideoUrl(raw)) {
    return NextResponse.json({ error: "Invalid video URL." }, { status: 400 });
  }

  const referer = REFERERS[platform] ?? "https://www.tiktok.com/";

  try {
    const upstream = await fetch(raw, {
      headers: {
        Referer: referer,
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      cache: "force-cache",
      next: { revalidate: 86400 },
    });

    if (!upstream.ok) {
      return NextResponse.json({ error: "Video fetch failed." }, { status: 502 });
    }

    const contentLength = Number(upstream.headers.get("content-length") ?? 0);
    if (contentLength > MAX_VIDEO_BYTES) {
      return NextResponse.json({ error: "Video too large." }, { status: 413 });
    }

    const buffer = await upstream.arrayBuffer();
    if (buffer.byteLength > MAX_VIDEO_BYTES) {
      return NextResponse.json({ error: "Video too large." }, { status: 413 });
    }

    const contentType = upstream.headers.get("content-type") ?? "video/mp4";

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch {
    return NextResponse.json({ error: "Video proxy error." }, { status: 502 });
  }
}
