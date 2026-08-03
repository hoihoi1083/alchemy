import { NextResponse } from "next/server";
import { isLibraryAssetUrl, persistAndDurablize } from "@/lib/storage/durable-media";
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
  if (!imageUrl?.startsWith("http") && !isLibraryAssetUrl(imageUrl)) {
    return NextResponse.json({ error: "image_url is required." }, { status: 400 });
  }

  if (isLibraryAssetUrl(imageUrl)) {
    return NextResponse.json({ imageUrl });
  }

  try {
    const durable = await persistAndDurablize({
      clerkId: auth.user.userId,
      kind: "image",
      sourceUrl: imageUrl!,
      fallbackUrl: imageUrl!,
      name:
        typeof body.slide_index === "number"
          ? `studio-slide-${body.slide_index}`
          : "studio-image",
    });
    return NextResponse.json({ imageUrl: durable });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Archive failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
