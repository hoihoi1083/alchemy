import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import sharp from "sharp";
import { requireAppUser } from "@/lib/require-app-user";
import { BATCH_EXPORT_SIZES } from "@/lib/batch-export-sizes";
import { jobDir } from "@/lib/pipeline/paths";
import { materializeMediaInput, pipelineFileUrl } from "@/lib/pipeline/local-input";

export const runtime = "nodejs";
export const maxDuration = 90;

export async function POST(request: Request) {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;

  let body: { image_url?: string; sizes?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const imageUrl = body.image_url?.trim();
  if (!imageUrl?.startsWith("http")) {
    return NextResponse.json({ error: "image_url is required." }, { status: 400 });
  }

  const sizeFilter = new Set(body.sizes ?? []);
  const targets = BATCH_EXPORT_SIZES.filter(
    (s) => sizeFilter.size === 0 || sizeFilter.has(s.id),
  );

  try {
    const jobId = crypto.randomUUID();
    const dir = jobDir(jobId);
    await fs.mkdir(dir, { recursive: true });
    const inputPath = path.join(dir, "source.png");
    await materializeMediaInput(imageUrl, inputPath);

    const exports: Array<{ id: string; width: number; height: number; imageUrl: string }> = [];
    for (const size of targets) {
      const outPath = path.join(dir, size.filename);
      await sharp(inputPath)
        .resize(size.width, size.height, { fit: "cover", position: "centre" })
        .png()
        .toFile(outPath);
      exports.push({
        id: size.id,
        width: size.width,
        height: size.height,
        imageUrl: pipelineFileUrl(request, jobId, size.filename),
      });
    }

    return NextResponse.json({ jobId, exports });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Batch export failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
