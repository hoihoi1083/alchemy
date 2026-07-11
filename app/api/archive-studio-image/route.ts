import { NextResponse } from "next/server";
import { isPipelineFileUrl } from "@/lib/pipeline/safe-url";
import { archiveRemoteImageToPipeline } from "@/lib/pipeline/archive-image";
import { studioSlideFileName } from "@/lib/pipeline/studio-slide-files";
import { requireAppUser } from "@/lib/require-app-user";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;

  let body: { image_url?: string; slide_index?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const imageUrl = body.image_url?.trim();
  if (!imageUrl?.startsWith("http")) {
    return NextResponse.json({ error: "image_url is required." }, { status: 400 });
  }

  if (isPipelineFileUrl(imageUrl)) {
    return NextResponse.json({ imageUrl });
  }

  try {
    const slideIndex = typeof body.slide_index === "number" ? body.slide_index : 0;
    const fileName =
      typeof body.slide_index === "number" ? studioSlideFileName(slideIndex) : "generated.png";
    const archived = await archiveRemoteImageToPipeline(request, imageUrl, fileName);
    return NextResponse.json({ imageUrl: archived });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Archive failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
