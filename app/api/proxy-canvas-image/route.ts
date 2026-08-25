import { NextResponse } from "next/server";
import { assertPublicHttpUrl } from "@/lib/pipeline/safe-url";
import { requireAppUser } from "@/lib/require-app-user";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Same-origin image proxy for Konva canvas (avoids CORS taint on export).
 * GET /api/proxy-canvas-image?url=https://...
 * Uses public-http SSRF fence (not fal-only allowlist) so fal storage + R2 work.
 */
export async function GET(request: Request) {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;

  const raw = new URL(request.url).searchParams.get("url")?.trim();
  if (!raw) {
    return NextResponse.json({ error: "url is required." }, { status: 400 });
  }

  // Allow data URLs passthrough is not needed — client uses them directly.
  if (raw.startsWith("data:") || raw.startsWith("blob:")) {
    return NextResponse.json({ error: "Remote https URL required." }, { status: 400 });
  }

  try {
    const safe = assertPublicHttpUrl(raw);
    const upstream = await fetch(safe.toString(), { cache: "no-store" });
    if (!upstream.ok) {
      return NextResponse.json({ error: "Image fetch failed." }, { status: 502 });
    }
    const buffer = await upstream.arrayBuffer();
    if (buffer.byteLength < 32) {
      return NextResponse.json({ error: "Empty image." }, { status: 502 });
    }
    const contentType =
      upstream.headers.get("content-type")?.split(";")[0]?.trim() || "image/jpeg";
    if (!contentType.startsWith("image/")) {
      return NextResponse.json({ error: "URL is not an image." }, { status: 400 });
    }
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=300",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Proxy failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
