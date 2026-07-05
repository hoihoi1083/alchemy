import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/require-app-user";

export const runtime = "nodejs";

const ALLOWED_HOSTS = [
  "xhscdn.com",
  "xiaohongshu.com",
  "ci.xiaohongshu.com",
  "sns-img",
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
];

const REFERERS: Record<string, string> = {
  xiaohongshu: "https://www.xiaohongshu.com/",
  instagram: "https://www.instagram.com/",
  tiktok: "https://www.tiktok.com/",
  facebook: "https://www.facebook.com/",
};

function isAllowedImageUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;
    const host = url.hostname.toLowerCase();
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
  const platform = searchParams.get("platform")?.trim() ?? "xiaohongshu";
  if (!raw || !isAllowedImageUrl(raw)) {
    return NextResponse.json({ error: "Invalid image URL." }, { status: 400 });
  }

  const referer = REFERERS[platform] ?? "https://www.xiaohongshu.com/";

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
      return NextResponse.json({ error: "Image fetch failed." }, { status: 502 });
    }

    const contentType = upstream.headers.get("content-type") ?? "image/jpeg";
    const buffer = await upstream.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch {
    return NextResponse.json({ error: "Image proxy error." }, { status: 502 });
  }
}
