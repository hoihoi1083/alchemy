import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { chargeTokens, refundTokens } from "@/lib/billing/charge";
import { TOKEN_COST } from "@/lib/billing/token-costs";
import { requireAppUser } from "@/lib/require-app-user";
import {
  ensureFfmpeg,
  getMediaDurationSeconds,
} from "@/lib/pipeline/ffmpeg";
import { burnCaptionsOverlay } from "@/lib/pipeline/caption-overlay-burn";
import {
  burnCaptionsDrawtext,
  preferDrawtextCaptionBurn,
} from "@/lib/pipeline/caption-burn";
import { parseCaptionLinesInput } from "@/lib/pipeline/caption-lines";
import { parseCaptionBurnStyleJson } from "@/lib/caption-burn-styles";
import { jobDir } from "@/lib/pipeline/paths";
import { buildSrt } from "@/lib/pipeline/srt";
import { materializeMediaInput, pipelineFileUrl } from "@/lib/pipeline/local-input";
import { persistAndDurablize } from "@/lib/storage/durable-media";
import type { CaptionLine } from "@/lib/ad-pack-types";

export const runtime = "nodejs";
export const maxDuration = 120;

function parseCaptionLines(raw: unknown, durationSec = 60) {
  return parseCaptionLinesInput(raw, durationSec);
}

async function burnCaptionsJob(
  request: Request,
  input: {
    clerkId: string;
    videoUrl?: string;
    videoFile?: File;
    captionLines: CaptionLine[];
    captionStyle?: unknown;
  },
) {
  const jobId = crypto.randomUUID();
  const dir = jobDir(jobId);
  await fs.mkdir(dir, { recursive: true });

  const inputPath = path.join(dir, "input.mp4");
  const srtPath = path.join(dir, "captions.srt");
  const outputPath = path.join(dir, "subtitled.mp4");

  await ensureFfmpeg();

  if (input.videoFile && input.videoFile.size > 0) {
    const buffer = Buffer.from(await input.videoFile.arrayBuffer());
    await fs.writeFile(inputPath, buffer);
  } else if (input.videoUrl?.trim()) {
    await materializeMediaInput(input.videoUrl.trim(), inputPath);
  } else {
    throw new Error("Provide video_file or video_url.");
  }

  const durationSec = await getMediaDurationSeconds(inputPath);
  const captionLines = parseCaptionLinesInput(input.captionLines, durationSec);
  if (captionLines.length === 0) {
    throw new Error("caption_lines is required.");
  }

  const segments = captionLines.map((line) => ({
    start: line.startSec,
    end: line.endSec,
    text: line.text.trim(),
  }));

  await fs.writeFile(srtPath, buildSrt(segments), "utf8");

  const captionStyle = parseCaptionBurnStyleJson(input.captionStyle);

  let burnMethod: "overlay" | "drawtext" = preferDrawtextCaptionBurn()
    ? "drawtext"
    : "overlay";

  const tryOverlay = async () => {
    await burnCaptionsOverlay(inputPath, captionLines, outputPath, dir, captionStyle);
    burnMethod = "overlay";
  };
  const tryDrawtext = async () => {
    await burnCaptionsDrawtext(inputPath, captionLines, outputPath);
    burnMethod = "drawtext";
  };

  // Prefer path-based overlay (Latin glyph outlines). Drawtext is fallback.
  const primary = preferDrawtextCaptionBurn()
    ? [tryDrawtext, tryOverlay]
    : [tryOverlay, tryDrawtext];
  const errors: string[] = [];

  let burned = false;
  for (const attempt of primary) {
    try {
      await attempt();
      burned = true;
      break;
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }
  // Never silently fall back to libass/soft CC — that is the "legacy subtitle
  // renderer" path that garbles English on Vercel. Surface the real error.
  if (!burned) {
    console.error("[burn-script-captions] overlay+drawtext failed:", errors.join(" | "));
    throw new Error(
      `Caption burn failed on server (overlay/drawtext). ${errors.slice(0, 2).join(" · ").slice(0, 500)}`,
    );
  }

  const pipelineUrl = pipelineFileUrl(request, jobId, "subtitled.mp4");
  const bytes = await fs.readFile(outputPath);
  const videoUrl = await persistAndDurablize({
    clerkId: input.clerkId,
    kind: "video",
    sourceUrl: `burn-captions://${jobId}/subtitled.mp4`,
    fallbackUrl: pipelineUrl,
    bytes,
    contentType: "video/mp4",
    name: "burned-captions",
  });

  return {
    videoUrl,
    jobId,
    srtUrl: pipelineFileUrl(request, jobId, "captions.srt"),
    softSubtitles: false,
    burnMethod,
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
      const lines = parseCaptionLines(formData.get("caption_lines"));
      if (lines.length === 0) {
        return NextResponse.json({ error: "caption_lines is required." }, { status: 400 });
      }
      const file = videoFile instanceof File && videoFile.size > 0 ? videoFile : undefined;
      if (!file && !videoUrl) {
        return NextResponse.json(
          { error: "video_file or video_url is required." },
          { status: 400 },
        );
      }
      const styleRaw = formData.get("caption_style");
      let captionStyle: unknown;
      if (typeof styleRaw === "string" && styleRaw.trim()) {
        try {
          captionStyle = JSON.parse(styleRaw);
        } catch {
          captionStyle = styleRaw.trim();
        }
      }
      const bill = await chargeTokens(auth.user.userId, tokenCost, {
        kind: "caption_burn",
        method: "script",
      });
      if ("error" in bill) return bill.error;
      charged = true;
      const result = await burnCaptionsJob(request, {
        clerkId: auth.user.userId,
        videoFile: file,
        videoUrl,
        captionLines: lines,
        captionStyle,
      });
      return NextResponse.json({
        ...result,
        tokensCharged: tokenCost,
        creditBalance: bill.balanceAfter,
      });
    }

    let body: { video_url?: string; caption_lines?: CaptionLine[]; caption_style?: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const videoUrl = body.video_url?.trim();
    if (!videoUrl) {
      return NextResponse.json({ error: "video_url is required." }, { status: 400 });
    }

    const lines = parseCaptionLines(body.caption_lines);
    if (lines.length === 0) {
      return NextResponse.json({ error: "caption_lines is required." }, { status: 400 });
    }

    const bill = await chargeTokens(auth.user.userId, tokenCost, {
      kind: "caption_burn",
      method: "script",
    });
    if ("error" in bill) return bill.error;
    charged = true;
    const result = await burnCaptionsJob(request, {
      clerkId: auth.user.userId,
      videoUrl,
      captionLines: lines,
      captionStyle: body.caption_style,
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
    const message = e instanceof Error ? e.message : "Caption burn failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
