import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/require-app-user";
import { burnImageCanvasOverlay } from "@/lib/image-text-overlay-burn";
import { parseImageCanvasLayers } from "@/lib/image-canvas-layers";
import { createOwnedJobDir } from "@/lib/pipeline/job-owner";
import { materializeMediaInput, pipelineFileUrl } from "@/lib/pipeline/local-input";
import { persistAndDurablize } from "@/lib/storage/durable-media";

export const runtime = "nodejs";
export const maxDuration = 60;

function isUsableImageUrl(url: string | undefined): boolean {
  const u = url?.trim() ?? "";
  return (
    u.startsWith("http") ||
    u.startsWith("/api/pipeline-files/") ||
    u.startsWith("/api/library/download/")
  );
}

function layersHaveContent(layers: ReturnType<typeof parseImageCanvasLayers>): boolean {
  return layers.some((layer) => {
    if (layer.kind === "text") return layer.text.trim().length > 0;
    if (layer.kind === "logo") return layer.url.trim().length > 0;
    return true;
  });
}

async function burnAndPersist(input: {
  clerkId: string;
  request: Request;
  jobId: string;
  inputPath: string;
  outputPath: string;
  layers: ReturnType<typeof parseImageCanvasLayers>;
}): Promise<string> {
  const output = await burnImageCanvasOverlay(input.inputPath, input.layers, {
    clerkId: input.clerkId,
  });
  await fs.writeFile(input.outputPath, output);
  const pipelineUrl = pipelineFileUrl(
    input.request,
    input.jobId,
    "image-text-overlay.png",
  );
  return persistAndDurablize({
    clerkId: input.clerkId,
    kind: "image",
    sourceUrl: `burn://${input.jobId}/image-text-overlay.png`,
    fallbackUrl: pipelineUrl,
    bytes: output,
    contentType: "image/png",
    name: "image-text-overlay",
  });
}

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

      if (!layersHaveContent(layers)) {
        return NextResponse.json(
          { error: "Add at least one text, shape, or logo layer." },
          { status: 400 },
        );
      }

      const { jobId, dir } = await createOwnedJobDir(auth.user.userId);
      const inputPath = path.join(dir, "input.png");
      const outputPath = path.join(dir, "image-text-overlay.png");

      if (imageFile instanceof File && imageFile.size > 0) {
        await fs.writeFile(inputPath, Buffer.from(await imageFile.arrayBuffer()));
      } else if (isUsableImageUrl(imageUrl)) {
        await materializeMediaInput(imageUrl!, inputPath, { clerkId: auth.user.userId });
      } else {
        return NextResponse.json(
          { error: "image_file or image_url is required." },
          { status: 400 },
        );
      }

      const durableUrl = await burnAndPersist({
        clerkId: auth.user.userId,
        request,
        jobId,
        inputPath,
        outputPath,
        layers,
      });

      return NextResponse.json({
        imageUrl: durableUrl,
        jobId,
      });
    }

    let body: { image_url?: string; layers?: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const imageUrl = body.image_url?.trim();
    const layers = parseImageCanvasLayers(body.layers);
    if (!isUsableImageUrl(imageUrl)) {
      return NextResponse.json({ error: "image_url is required." }, { status: 400 });
    }
    if (!layersHaveContent(layers)) {
      return NextResponse.json({ error: "layers is required." }, { status: 400 });
    }

    const resolvedImageUrl = imageUrl!;

    const { jobId, dir } = await createOwnedJobDir(auth.user.userId);
    const inputPath = path.join(dir, "input.png");
    const outputPath = path.join(dir, "image-text-overlay.png");
    await materializeMediaInput(resolvedImageUrl, inputPath, { clerkId: auth.user.userId });

    const durableUrl = await burnAndPersist({
      clerkId: auth.user.userId,
      request,
      jobId,
      inputPath,
      outputPath,
      layers,
    });

    return NextResponse.json({
      imageUrl: durableUrl,
      jobId,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Image text overlay failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
