import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";

describe("captions-2 ASR + preview guards", () => {
  it("openai timed transcription prefers whisper-1 over gpt-4o-mini", () => {
    const src = readFileSync(
      path.join(process.cwd(), "lib/pipeline/openai.ts"),
      "utf8",
    );
    assert.match(src, /preferTimedSegments/);
    assert.match(src, /whisper-1/);
    assert.match(src, /supportsVerboseJson/);
  });

  it("transcribe-captions skips local whisper on serverless", () => {
    const src = readFileSync(
      path.join(process.cwd(), "app/api/transcribe-captions/route.ts"),
      "utf8",
    );
    assert.match(src, /isLocalWhisperAvailable/);
    assert.match(src, /onServerless/);
    assert.match(src, /VERCEL/);
  });

  it("CaptionStudio2Client keeps CapCut board preview + edit wiring", () => {
    const src = readFileSync(
      path.join(process.cwd(), "components/captions/CaptionStudio2Client.tsx"),
      "utf8",
    );
    assert.match(
      src,
      /originalSourceUrl \?\? localPreviewUrl \?\? sourceUrl/,
    );
    assert.match(src, /playbackUrl \?\? processedVideoUrl/);
    assert.match(src, /CaptionProgramMonitor/);
    assert.match(src, /CaptionNleTimeline/);
    assert.match(src, /originalSourceUrl/);
    assert.match(src, /downloadVideoBlob/);
    assert.match(src, /CaptionPicturePhase/);
    assert.match(src, /\/api\/caption-video-edit/);
    assert.match(src, /planOnCaptionsTab/);
    assert.match(src, /onOpenCaptionsPlan/);
    assert.equal(
      /<button[^>]*>\s*<CaptionLineEditor/.test(src),
      false,
      "CaptionLineEditor must not be nested inside a <button>",
    );
  });

  it("ClipFilmstrip prefers same-origin inline library URLs", () => {
    const src = readFileSync(
      path.join(process.cwd(), "components/captions/ClipFilmstrip.tsx"),
      "utf8",
    );
    assert.match(src, /inline=1/);
    assert.match(src, /download-media/);
    assert.doesNotMatch(src, /crossOrigin = "anonymous"/);
  });

  it("caption-video-edit mirrors library URLs before ModelArk/fal", () => {
    const src = readFileSync(
      path.join(process.cwd(), "lib/caption-video-edit.ts"),
      "utf8",
    );
    assert.match(src, /scaleVideoToMinPixelCount/);
    assert.match(src, /SEEDANCE_MIN_REF_PIXELS/);
    assert.match(src, /publicVideoForSeedanceEdit/);
  });
});
