/**
 * Post-process Blockbuster H3 output: optional hero zoom-hold, captions, end brand logo.
 *
 *   POST /api/finish-blockbuster
 *   form: video_url, caption_text?, burn_captions?, end_logo?, hero_hold?, logo_url?
 *   logo_url = Brand kit (or other) logo — never defaults to Alchemy watermark for customers.
 */
import { promises as fs } from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { NextResponse } from "next/server";
import sharp from "sharp";
import { requireAppUser } from "@/lib/require-app-user";
import { chargeTokens, refundTokens } from "@/lib/billing/charge";
import { TOKEN_COST } from "@/lib/billing/token-costs";
import {
  ensureFfmpeg,
  getMediaDurationSeconds,
  videoHasAudioStream,
} from "@/lib/pipeline/ffmpeg";
import { burnCaptionsOverlay } from "@/lib/pipeline/caption-overlay-burn";
import {
  burnCaptionsDrawtext,
  preferDrawtextCaptionBurn,
} from "@/lib/pipeline/caption-burn";
import { resolveCaptionBurnStyle } from "@/lib/caption-burn-styles";
import { createOwnedJobDir } from "@/lib/pipeline/job-owner";
import { materializeMediaInput, pipelineFileUrl } from "@/lib/pipeline/local-input";
import { persistAndDurablize } from "@/lib/storage/durable-media";
import {
  BLOCKBUSTER_DURATION_SEC,
  blockbusterCaptionLinesFromText,
} from "@/lib/blockbuster-ad-recipe";

export const runtime = "nodejs";
export const maxDuration = 180;

function ff(args: string[]) {
  const r = spawnSync("ffmpeg", ["-y", ...args], { encoding: "utf8" });
  if (r.status !== 0) {
    throw new Error(`ffmpeg failed: ${(r.stderr || r.stdout || "").slice(-800)}`);
  }
}

function flag(v: FormDataEntryValue | null): boolean {
  const s = String(v ?? "").trim().toLowerCase();
  return s === "1" || s === "true" || s === "yes";
}

async function resolveEndLogoPath(
  dir: string,
  clerkId: string,
  logoUrl: string | null,
  logoFile: File | null,
): Promise<string | null> {
  const destPng = path.join(dir, "end-logo.png");

  if (logoFile && logoFile.size > 0) {
    const buf = Buffer.from(await logoFile.arrayBuffer());
    await sharp(buf).ensureAlpha().png().toFile(destPng);
    return destPng;
  }

  if (logoUrl) {
    const raw = path.join(dir, "end-logo-raw");
    try {
      await materializeMediaInput(logoUrl, raw, { clerkId });
      await sharp(raw).ensureAlpha().png().toFile(destPng);
      return destPng;
    } catch (err) {
      console.warn(
        "[finish-blockbuster] logo_url failed",
        err instanceof Error ? err.message : err,
      );
      return null;
    }
  }

  // No Brand kit / customer logo — do not stamp Alchemy watermark on customer videos.
  return null;
}

async function appendHeroHold(
  inputPath: string,
  outputPath: string,
  holdSec = 1.5,
  zoom = 1.18,
): Promise<void> {
  const still = `${outputPath}.still.jpg`;
  const holdClip = `${outputPath}.hold.mp4`;
  const list = `${outputPath}.concat.txt`;
  const dur = await getMediaDurationSeconds(inputPath);
  const grabAt = Math.max(0.5, Math.min(dur - 0.35, dur * 0.82));
  ff([
    "-ss",
    String(grabAt),
    "-i",
    inputPath,
    "-frames:v",
    "1",
    "-update",
    "1",
    "-q:v",
    "2",
    still,
  ]);
  const meta = await sharp(still).metadata();
  const w = meta.width ?? 768;
  const h = meta.height ?? 1344;
  const zw = Math.max(64, Math.round(w / zoom));
  const zh = Math.max(64, Math.round(h / zoom));
  const left = Math.max(0, Math.round((w - zw) / 2));
  const top = Math.max(0, Math.round((h - zh) / 2));
  const zoomed = `${outputPath}.zoomed.jpg`;
  await sharp(still)
    .extract({
      left,
      top,
      width: Math.min(zw, w - left),
      height: Math.min(zh, h - top),
    })
    .resize(w, h, { fit: "fill" })
    .jpeg({ quality: 92 })
    .toFile(zoomed);

  const hasAudio = await videoHasAudioStream(inputPath);
  const holdArgs = [
    "-loop",
    "1",
    "-t",
    String(holdSec),
    "-i",
    zoomed,
  ];
  if (hasAudio) {
    holdArgs.push(
      "-f",
      "lavfi",
      "-t",
      String(holdSec),
      "-i",
      "anullsrc=channel_layout=stereo:sample_rate=44100",
    );
  }
  holdArgs.push(
    "-vf",
    `fps=24,format=yuv420p,scale=${w}:${h}`,
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
  );
  if (hasAudio) {
    holdArgs.push("-c:a", "aac", "-shortest");
  } else {
    holdArgs.push("-an");
  }
  holdArgs.push(holdClip);
  ff(holdArgs);

  const mainNorm = `${outputPath}.main.mp4`;
  const mainArgs = [
    "-i",
    inputPath,
    "-vf",
    `fps=24,scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2,format=yuv420p`,
    "-c:v",
    "libx264",
  ];
  if (hasAudio) {
    mainArgs.push("-c:a", "aac", "-ar", "44100", "-ac", "2");
  } else {
    mainArgs.push("-an");
  }
  mainArgs.push(mainNorm);
  ff(mainArgs);

  await fs.writeFile(list, `file '${mainNorm}'\nfile '${holdClip}'\n`, "utf8");
  ff(["-f", "concat", "-safe", "0", "-i", list, "-c", "copy", outputPath]);
}

async function stampEndLogo(
  inputPath: string,
  outputPath: string,
  lockupPath: string,
  lastSec = 0.8,
): Promise<void> {
  const dur = await getMediaDurationSeconds(inputPath);
  const start = Math.max(0, dur - lastSec);
  const overlayPng = `${outputPath}.logo.png`;
  const probe = `${outputPath}.probe.jpg`;
  ff(["-ss", "0.2", "-i", inputPath, "-frames:v", "1", "-update", "1", probe]);
  const meta = await sharp(probe).metadata();
  const w = meta.width ?? 768;
  const h = meta.height ?? 1344;
  const targetH = Math.round(h * 0.05);
  const lock = await sharp(lockupPath)
    .resize({ height: targetH, fit: "inside" })
    .png()
    .toBuffer({ resolveWithObject: true });
  const lw = lock.info.width ?? 160;
  const lh = lock.info.height ?? targetH;
  const margin = Math.round(Math.min(w, h) * 0.04);
  await sharp({
    create: {
      width: w,
      height: h,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      {
        input: lock.data,
        left: w - margin - lw,
        top: h - margin - lh,
      },
    ])
    .png()
    .toFile(overlayPng);

  ff([
    "-i",
    inputPath,
    "-i",
    overlayPng,
    "-filter_complex",
    `[1:v]fade=t=in:st=${start.toFixed(2)}:d=0.25:alpha=1[lg];[0:v][lg]overlay=0:0:enable='gte(t,${start.toFixed(2)})'[v]`,
    "-map",
    "[v]",
    "-map",
    "0:a?",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-shortest",
    outputPath,
  ]);
}

export async function POST(request: Request) {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;

  const form = await request.formData();
  const videoUrl = String(form.get("video_url") ?? "").trim();
  const captionText = String(form.get("caption_text") ?? "").trim();
  const burnCaptions = flag(form.get("burn_captions"));
  const endLogo = flag(form.get("end_logo"));
  const heroHold = flag(form.get("hero_hold"));
  const logoUrl = String(form.get("logo_url") ?? "").trim() || null;
  const logoEntry = form.get("logo");
  const logoFile =
    logoEntry instanceof File && logoEntry.size > 0 ? logoEntry : null;

  if (!videoUrl) {
    return NextResponse.json({ error: "video_url required" }, { status: 400 });
  }
  if (!burnCaptions && !endLogo && !heroHold) {
    return NextResponse.json({ videoUrl, skipped: true });
  }

  const tokenCost = TOKEN_COST.caption_burn;
  let charged = false;
  const { jobId, dir } = await createOwnedJobDir(auth.user.userId);
  const inputPath = path.join(dir, "input.mp4");
  let current = inputPath;
  let step = 0;

  try {
    const bill = await chargeTokens(auth.user.userId, tokenCost, {
      kind: "finish-blockbuster",
    });
    if ("error" in bill) return bill.error;
    charged = true;

    await ensureFfmpeg();
    await materializeMediaInput(videoUrl, inputPath, {
      clerkId: auth.user.userId,
    });

    if (heroHold) {
      const next = path.join(dir, `step-${++step}-hold.mp4`);
      await appendHeroHold(current, next);
      current = next;
    }

    if (burnCaptions && captionText) {
      const dur =
        (await getMediaDurationSeconds(current)) || BLOCKBUSTER_DURATION_SEC;
      const lines = blockbusterCaptionLinesFromText(captionText, dur);
      if (lines.length > 0) {
        const next = path.join(dir, `step-${++step}-cap.mp4`);
        const errors: string[] = [];
        let burned = false;
        const tryDraw = async () => {
          await burnCaptionsDrawtext(current, lines, next);
        };
        const tryOverlay = async () => {
          await burnCaptionsOverlay(
            current,
            lines,
            next,
            dir,
            resolveCaptionBurnStyle("classic"),
          );
        };
        const order = preferDrawtextCaptionBurn()
          ? [tryDraw, tryOverlay]
          : [tryOverlay, tryDraw];
        for (const attempt of order) {
          try {
            await attempt();
            burned = true;
            break;
          } catch (err) {
            errors.push(err instanceof Error ? err.message : String(err));
          }
        }
        if (!burned) {
          throw new Error(
            `Caption burn failed. ${errors.slice(0, 2).join(" · ").slice(0, 400)}`,
          );
        }
        current = next;
      }
    }

    if (endLogo) {
      const lockup = await resolveEndLogoPath(
        dir,
        auth.user.userId,
        logoUrl,
        logoFile,
      );
      if (lockup) {
        const next = path.join(dir, `step-${++step}-logo.mp4`);
        await stampEndLogo(current, next, lockup);
        current = next;
      }
    }

    const bytes = await fs.readFile(current);
    const pipelineUrl = pipelineFileUrl(
      request,
      jobId,
      path.basename(current),
    );
    const outUrl = await persistAndDurablize({
      clerkId: auth.user.userId,
      kind: "video",
      sourceUrl: `finish-blockbuster://${jobId}/${path.basename(current)}`,
      fallbackUrl: pipelineUrl,
      bytes,
      contentType: "video/mp4",
      name: "blockbuster-finished",
    });

    return NextResponse.json({ videoUrl: outUrl, jobId });
  } catch (e: unknown) {
    if (charged) {
      try {
        await refundTokens(auth.user.userId, tokenCost, {
          kind: "finish-blockbuster",
          reason: "finish_failed",
        });
      } catch {
        /* ignore */
      }
    }
    const message =
      e instanceof Error ? e.message : "finish-blockbuster failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
