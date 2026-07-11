import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/require-app-user";
import { parseImageCanvasLayers } from "@/lib/image-canvas-layers";
import { burnImageCanvasOverlay } from "@/lib/image-text-overlay-burn";
import { jobDir } from "@/lib/pipeline/paths";
import { materializeMediaInput, pipelineFileUrl } from "@/lib/pipeline/local-input";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;

  const contentType = request.headers.get("content-type") ?? "";

  try {
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const imageFile = formData.get("image_file");
      const imageUrl = (formData.get("image_url") as string | null)?.trim();
      const layers = parseImageCanvasLayers(
        typeof formData.get("layers") === "string"
          ? JSON.parse(formData.get("layers") as string)
          : formData.get("layers"),
      );
      if (!layers.length) {
        return NextResponse.json({ error: "Add at least one layer." }, { status: 400 });
      }
      const jobId = crypto.randomUUID();
      const dir = jobDir(jobId);
      await fs.mkdir(dir, { recursive: true });
      const inputPath = path.join(dir, "input.png");
      const outputPath = path.join(dir, "image-canvas-overlay.png");
      if (imageFile instanceof File && imageFile.size > 0) {
        await fs.writeFile(inputPath, Buffer.from(await imageFile.arrayBuffer()));
      } else if (imageUrl?.startsWith("http")) {
        await materializeMediaInput(imageUrl, inputPath);
      } else {
        return NextResponse.json({ error: "image_file or image_url is required." }, { status: 400 });
      }
      const output = await burnImageCanvasOverlay(inputPath, layers);
      await fs.writeFile(outputPath, output);
      return NextResponse.json({
        imageUrl: pipelineFileUrl(request, jobId, "image-canvas-overlay.png"),
        jobId,
      });
    }

    let body: { image_url?: string; layers?: unknown };
    body = await request.json();
    const imageUrl = body.image_url?.trim();
    const layers = parseImageCanvasLayers(body.layers);
    if (!imageUrl?.startsWith("http")) {
      return NextResponse.json({ error: "image_url is required." }, { status: 400 });
    }
    if (!layers.length) {
      return NextResponse.json({ error: "layers is required." }, { status: 400 });
    }
    const jobId = crypto.randomUUID();
    const dir = jobDir(jobId);
    await fs.mkdir(dir, { recursive: true });
    const inputPath = path.join(dir, "input.png");
    const outputPath = path.join(dir, "image-canvas-overlay.png");
    await materializeMediaInput(imageUrl, inputPath);
    const output = await burnImageCanvasOverlay(inputPath, layers);
    await fs.writeFile(outputPath, output);
    return NextResponse.json({
      imageUrl: pipelineFileUrl(request, jobId, "image-canvas-overlay.png"),
      jobId,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Canvas overlay failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
