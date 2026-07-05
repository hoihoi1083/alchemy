import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/require-app-user";
import { bgmFilePath, DEFAULT_BGM_TRACK, type BgmTrackId } from "@/lib/bgm/tracks";
import { getCompositorId } from "@/lib/compositor";
import {
  buildPaperStickerInput,
  renderPaperStickerImage,
  renderPaperStickerVideoFrames,
} from "@/lib/compositor/paper-sticker/render";
import { VIDEO } from "@/lib/compositor/paper-sticker/layout";
import {
  addBackgroundMusic,
  encodeImageSequence,
  ensureFfmpeg,
} from "@/lib/pipeline/ffmpeg";
import { jobDir } from "@/lib/pipeline/paths";
import type { TemplateId } from "@/lib/templates";

export const runtime = "nodejs";
export const maxDuration = 300;

const TRACK_IDS = new Set<BgmTrackId>(["calm", "upbeat", "warm"]);

function appBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
  );
}

function pipelineFileUrl(jobId: string, file: string): string {
  return `${appBaseUrl()}/api/pipeline-files/${jobId}/${file}`;
}

export async function POST(request: Request) {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const templateId = (formData.get("template_id") as string | null)?.trim() as TemplateId;
  const mode = (formData.get("mode") as string | null)?.trim() || "image";
  const compositor = templateId ? getCompositorId(templateId) : null;

  if (compositor !== "paper-sticker") {
    return NextResponse.json(
      { error: "This template does not support in-app compositing yet." },
      { status: 400 },
    );
  }

  const headline = (formData.get("headline") as string | null)?.trim() || "";
  const subline = (formData.get("subline") as string | null)?.trim() || "";
  const brand = (formData.get("brand") as string | null)?.trim() || "";
  const signoff = (formData.get("signoff") as string | null)?.trim() || "";
  const productFile = formData.get("product_image");

  if (!headline) {
    return NextResponse.json({ error: "Headline is required for this template." }, { status: 400 });
  }
  if (!(productFile instanceof File) || productFile.size === 0) {
    return NextResponse.json({ error: "Upload a product photo." }, { status: 400 });
  }

  const productBuffer = Buffer.from(await productFile.arrayBuffer());
  const input = buildPaperStickerInput({
    headline,
    subline,
    brand,
    signoff,
    productImage: productBuffer,
  });

  const jobId = crypto.randomUUID();
  const dir = jobDir(jobId);
  await fs.mkdir(dir, { recursive: true });

  try {
    if (mode === "image") {
      const png = await renderPaperStickerImage(input);
      const outPath = path.join(dir, "composed.png");
      await fs.writeFile(outPath, png);
      return NextResponse.json({
        jobId,
        imageUrl: pipelineFileUrl(jobId, "composed.png"),
        mode: "compositor",
      });
    }

    if (mode !== "video") {
      return NextResponse.json({ error: "mode must be image or video." }, { status: 400 });
    }

    await ensureFfmpeg();
    const framesDir = path.join(dir, "frames");
    await renderPaperStickerVideoFrames(input, framesDir);

    const rawVideo = path.join(dir, "composed.mp4");
    await encodeImageSequence(framesDir, rawVideo, VIDEO.fps, VIDEO.durationSec);

    const track = ((formData.get("bgm_track") as string | null)?.trim() ||
      DEFAULT_BGM_TRACK) as BgmTrackId;
    let finalFile = "composed.mp4";
    let bgmAdded = false;

    if (TRACK_IDS.has(track)) {
      const musicPath = bgmFilePath(track);
      try {
        await fs.access(musicPath);
        const withBgm = path.join(dir, "with-bgm.mp4");
        await addBackgroundMusic(rawVideo, musicPath, withBgm);
        finalFile = "with-bgm.mp4";
        bgmAdded = true;
      } catch {
        // BGM files missing — return silent video
      }
    }

    return NextResponse.json({
      jobId,
      videoUrl: pipelineFileUrl(jobId, finalFile),
      mode: "compositor",
      bgmAdded,
      durationSec: VIDEO.durationSec,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Composition failed.";
    if (message.includes("Compositor fonts missing")) {
      return NextResponse.json({ error: message }, { status: 503 });
    }
    if (message.includes("ffmpeg")) {
      return NextResponse.json(
        { error: "ffmpeg not found. Install with: brew install ffmpeg" },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
