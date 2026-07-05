import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/require-app-user";
import { CONTENT_PLATFORMS, type ContentPlatform } from "@/lib/content-research-types";
import { resolvePostVideoUrl } from "@/lib/justoneapi-resolve-video";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;

  let body: { platform?: string; postId?: string; postUrl?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const platform = body.platform as ContentPlatform;
  const postId = body.postId?.trim() ?? "";
  const postUrl = body.postUrl?.trim();

  if (!platform || !CONTENT_PLATFORMS.includes(platform) || !postId) {
    return NextResponse.json({ error: "platform and postId are required." }, { status: 400 });
  }

  try {
    const videoUrl = await resolvePostVideoUrl(platform, postId, postUrl);
    if (!videoUrl) {
      return NextResponse.json({ error: "No video URL found for this post." }, { status: 404 });
    }
    return NextResponse.json({ videoUrl });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Video resolve failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
