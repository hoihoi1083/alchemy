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

  it("CaptionStudio2Client falls back preview to sourceUrl", () => {
    const src = readFileSync(
      path.join(process.cwd(), "components/captions/CaptionStudio2Client.tsx"),
      "utf8",
    );
    assert.match(
      src,
      /playbackUrl \?\? localPreviewUrl \?\? sourceUrl/,
    );
    assert.match(src, /showBeatControls=\{false\}/);
    assert.match(src, /originalSourceUrl/);
    assert.match(src, /downloadVideoBlob/);
    assert.match(src, /ToolPhaseStrip/);
    assert.equal(
      /<button[^>]*>\s*<CaptionLineEditor/.test(src),
      false,
      "CaptionLineEditor must not be nested inside a <button>",
    );
  });
});
