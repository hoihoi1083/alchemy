import { NextResponse } from "next/server";
import {
  samplePackItemById,
  watermarkSamplePackImage,
} from "@/lib/sample-pack-watermark";

export const runtime = "nodejs";
export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };

/** Single watermarked JPEG — used for gallery display and per-image download. */
export async function GET(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const item = samplePackItemById(id);
  if (!item) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const asDownload =
    new URL(request.url).searchParams.get("download") === "1";
  try {
    const bytes = await watermarkSamplePackImage(item);
    const filename = `alchemy-sample-${item.id}.jpg`;
    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": asDownload
          ? "no-store"
          : "public, max-age=86400, stale-while-revalidate=604800",
        "Content-Disposition": `${asDownload ? "attachment" : "inline"}; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error("[sample-pack-image]", id, err);
    return NextResponse.json({ error: "render_failed" }, { status: 500 });
  }
}
