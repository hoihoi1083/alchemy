import { NextResponse } from "next/server";
import { watermarkAllSamplePackImages } from "@/lib/sample-pack-watermark";
import { zipStoreFiles } from "@/lib/zip-store";

export const runtime = "nodejs";
export const maxDuration = 60;

/** ZIP of all sample images with Alchemy watermark burned into pixels. */
export async function GET() {
  try {
    const files = await watermarkAllSamplePackImages();
    const zip = zipStoreFiles(
      files.map((f) => ({ name: f.filename, data: f.bytes })),
    );
    return new NextResponse(new Uint8Array(zip), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition":
          'attachment; filename="alchemy-ai-lab-sample-pack.zip"',
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[sample-pack-download]", err);
    return NextResponse.json({ error: "zip_failed" }, { status: 500 });
  }
}
