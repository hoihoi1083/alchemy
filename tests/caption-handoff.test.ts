import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { normalizeCaptionHandoffVideoUrl } from "../lib/caption-studio-draft";

describe("normalizeCaptionHandoffVideoUrl", () => {
  it("keeps relative pipeline URLs", () => {
    const url = "/api/pipeline-files/abc-123/final.mp4";
    assert.equal(normalizeCaptionHandoffVideoUrl(url), url);
  });

  it("strips host from absolute pipeline URLs", () => {
    assert.equal(
      normalizeCaptionHandoffVideoUrl(
        "https://alchemy.example.com/api/pipeline-files/job-id/with-voice.mp4",
      ),
      "/api/pipeline-files/job-id/with-voice.mp4",
    );
  });

  it("passes through remote fal URLs unchanged", () => {
    const fal = "https://v3.fal.media/files/clip.mp4";
    assert.equal(normalizeCaptionHandoffVideoUrl(fal), fal);
  });
});
