import { fal } from "@fal-ai/client";
import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/require-app-user";
import {
  buildSeedanceReferenceClip,
  compressReferenceClipIfNeeded,
  MINIMAX_MAX_REFERENCE_SEC,
} from "@/lib/reference-video-prepare";

export const runtime = "nodejs";
export const maxDuration = 180;

export async function POST(request: Request) {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;

  const key = process.env.FAL_KEY?.trim();
  if (!key) {
    return NextResponse.json({ error: "Video prep unavailable." }, { status: 503 });
  }
  fal.config({ credentials: key });

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      {
        error:
          "Reference video upload too large — use a clip under 15s, or re-pick from content research (we auto-trim).",
      },
      { status: 413 },
    );
  }

  const video = formData.get("video") ?? formData.get("reference_video");
  if (!(video instanceof File) || video.size === 0) {
    return NextResponse.json({ error: "Upload a reference MP4." }, { status: 400 });
  }

  try {
    const raw = Buffer.from(await video.arrayBuffer());
    // Cap under 15.0s — MiniMax H3 rejects reference_video_urls at/over 15s
    // (that limit is the REFERENCE clip, not the user's chosen output length).
    const clip = await buildSeedanceReferenceClip(raw, MINIMAX_MAX_REFERENCE_SEC);
    const compressed = await compressReferenceClipIfNeeded(clip.buffer);

    return NextResponse.json({
      videoUrl: await fal.storage.upload(
        new File([new Uint8Array(compressed.buffer)], "reference-clip.mp4", {
          type: "video/mp4",
        }),
      ),
      durationSec: clip.durationSec,
      trimmed: clip.digestMontage || clip.sourceDurationSec > MINIMAX_MAX_REFERENCE_SEC,
      digestMontage: clip.digestMontage,
      sourceDurationSec: clip.sourceDurationSec,
      bytes: compressed.buffer.byteLength,
      compressed: compressed.compressed,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Reference video prep failed.";
    const status = message.includes("ffmpeg") ? 503 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
