import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { chargeTokens, refundTokens } from "@/lib/billing/charge";
import { TOKEN_COST } from "@/lib/billing/token-costs";
import { requireAppUser } from "@/lib/require-app-user";
import { ensureFfmpeg, getMediaDurationSeconds } from "@/lib/pipeline/ffmpeg";
import { parseVisualCaptionClips } from "@/lib/pipeline/visual-caption-clips";
import { burnVisualCaptionsOverlay } from "@/lib/pipeline/visual-caption-burn";
import { createOwnedJobDir } from "@/lib/pipeline/job-owner";
import { materializeMediaInput, pipelineFileUrl } from "@/lib/pipeline/local-input";
import { persistAndDurablize } from "@/lib/storage/durable-media";
import type { VisualCaptionClip } from "@/lib/visual-caption-types";

export const runtime = "nodejs";
export const maxDuration = 120;

async function burnVisualJob(
  request: Request,
  input: {
    clerkId: string;
    videoUrl?: string;
    videoFile?: File;
    clips: VisualCaptionClip[];
  },
) {
  const { jobId, dir } = await createOwnedJobDir(input.clerkId);

  const inputPath = path.join(dir, "input.mp4");
  const outputPath = path.join(dir, "visual-subtitled.mp4");

  await ensureFfmpeg();

  if (input.videoFile && input.videoFile.size > 0) {
    const buffer = Buffer.from(await input.videoFile.arrayBuffer());
    await fs.writeFile(inputPath, buffer);
  } else if (input.videoUrl?.trim()) {
    await materializeMediaInput(input.videoUrl.trim(), inputPath, { clerkId: input.clerkId });
  } else {
    throw new Error("Provide video_file or video_url.");
  }

  const durationSec = await getMediaDurationSeconds(inputPath);
  const clips = parseVisualCaptionClips(input.clips, durationSec);
  if (clips.length === 0) {
    throw new Error("clips is required.");
  }

  await burnVisualCaptionsOverlay(inputPath, clips, outputPath, dir);

  const pipelineUrl = pipelineFileUrl(request, jobId, "visual-subtitled.mp4");
  const bytes = await fs.readFile(outputPath);
  const videoUrl = await persistAndDurablize({
    clerkId: input.clerkId,
    kind: "video",
    sourceUrl: `burn-visual://${jobId}/visual-subtitled.mp4`,
    fallbackUrl: pipelineUrl,
    bytes,
    contentType: "video/mp4",
    name: "visual-captions",
  });

  return {
    videoUrl,
    jobId,
    burnMethod: "visual-overlay" as const,
  };
}

export async function POST(request: Request) {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;

  const contentType = request.headers.get("content-type") ?? "";
  const tokenCost = TOKEN_COST.caption_burn;
  let charged = false;

  try {
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const videoFile = formData.get("video_file");
      const videoUrl = (formData.get("video_url") as string | null)?.trim();
      const clips = parseVisualCaptionClips(formData.get("clips"));
      if (clips.length === 0) {
        return NextResponse.json({ error: "clips is required." }, { status: 400 });
      }
      const file = videoFile instanceof File && videoFile.size > 0 ? videoFile : undefined;
      if (!file && !videoUrl) {
        return NextResponse.json(
          { error: "video_file or video_url is required." },
          { status: 400 },
        );
      }
      const bill = await chargeTokens(auth.user.userId, tokenCost, {
        kind: "caption_burn",
        method: "visual",
      });
      if ("error" in bill) return bill.error;
      charged = true;
      const result = await burnVisualJob(request, {
        clerkId: auth.user.userId,
        videoFile: file,
        videoUrl,
        clips,
      });
      return NextResponse.json({
        ...result,
        tokensCharged: tokenCost,
        creditBalance: bill.balanceAfter,
      });
    }

    let body: { video_url?: string; clips?: VisualCaptionClip[] };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const videoUrl = body.video_url?.trim();
    if (!videoUrl) {
      return NextResponse.json({ error: "video_url is required." }, { status: 400 });
    }

    const clips = parseVisualCaptionClips(body.clips);
    if (clips.length === 0) {
      return NextResponse.json({ error: "clips is required." }, { status: 400 });
    }

    const bill = await chargeTokens(auth.user.userId, tokenCost, {
      kind: "caption_burn",
      method: "visual",
    });
    if ("error" in bill) return bill.error;
    charged = true;
    const result = await burnVisualJob(request, {
      clerkId: auth.user.userId,
      videoUrl,
      clips,
    });
    return NextResponse.json({
      ...result,
      tokensCharged: tokenCost,
      creditBalance: bill.balanceAfter,
    });
  } catch (e: unknown) {
    if (charged) {
      await refundTokens(auth.user.userId, tokenCost, {
        kind: "caption_burn",
        reason: "burn_failed",
      });
    }
    const message = e instanceof Error ? e.message : "Visual caption burn failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
