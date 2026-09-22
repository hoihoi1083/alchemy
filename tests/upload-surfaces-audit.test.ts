/**
 * Static audit: verify the three surfaces wire uploads through the shared
 * R2-presign helper and library inline URLs. Run with:
 *   npx tsx --test tests/upload-surfaces-audit.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { isSafeForServerUpload, VERCEL_SAFE_UPLOAD_BYTES } from "../lib/upload-limits";
import {
  libraryMediaUrlForBoard,
  withLibraryInline,
} from "../lib/storage/library-asset-url";

function read(path: string): string {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

describe("upload surfaces wiring audit", () => {
  it("edit-image-2 uses shared upload + inline library pick", () => {
    const client = read("components/edit-image-2/EditImage2Client.tsx");
    const upload = read("lib/upload-edit-image-client.ts");
    assert.match(upload, /uploadFileViaLibraryPresign/);
    assert.match(client, /uploadEditImageFile/);
    assert.match(client, /libraryMediaUrlForBoard\(asset\)/);
  });

  it("captions-2 uses shared upload for video and ref image", () => {
    const c = read("components/captions/CaptionStudio2Client.tsx");
    assert.match(c, /uploadFileViaLibraryPresign/);
    assert.match(c, /kind:\s*"video"/);
    assert.match(c, /kind:\s*"image"/);
    assert.match(c, /libraryMediaUrlForBoard\(asset\)/);
  });

  it("ultra canvas uses shared upload for image/audio", () => {
    const runner = read("lib/pro-canvas-runner.ts");
    assert.match(runner, /uploadFileViaLibraryPresign/);
    assert.match(runner, /upload-canvas-asset/);
    assert.match(runner, /kind:\s*isAudio \? "audio" : "image"/);
  });

  it("shared helper prefers R2 then small fallback", () => {
    const h = read("lib/library-presign-upload-client.ts");
    assert.match(h, /\/api\/library\/presign-upload/);
    assert.match(h, /isSafeForServerUpload/);
    assert.match(h, /\/api\/library\/upload/);
    assert.match(h, /withLibraryInline/);
  });

  it("vercel body cap still blocks large proxy fallback", () => {
    assert.equal(isSafeForServerUpload(VERCEL_SAFE_UPLOAD_BYTES), true);
    assert.equal(isSafeForServerUpload(VERCEL_SAFE_UPLOAD_BYTES + 1), false);
  });

  it("library board URLs force inline streaming", () => {
    const id = "dddddddddddddddddddddddd";
    assert.equal(
      withLibraryInline(`/api/library/download/${id}`),
      `/api/library/download/${id}?inline=1`,
    );
    assert.equal(
      libraryMediaUrlForBoard({
        downloadUrl: `/api/library/download/${id}`,
        previewUrl: `/api/library/download/${id}?inline=1`,
      }),
      `/api/library/download/${id}?inline=1`,
    );
  });
});
