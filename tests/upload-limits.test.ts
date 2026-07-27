import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isSafeForServerUpload, VERCEL_SAFE_UPLOAD_BYTES } from "@/lib/upload-limits";

describe("upload limits", () => {
  it("allows small files through the server fallback path", () => {
    assert.equal(isSafeForServerUpload(1024), true);
    assert.equal(isSafeForServerUpload(VERCEL_SAFE_UPLOAD_BYTES), true);
  });

  it("blocks files over the Vercel body limit", () => {
    assert.equal(isSafeForServerUpload(VERCEL_SAFE_UPLOAD_BYTES + 1), false);
    assert.equal(isSafeForServerUpload(50 * 1024 * 1024), false);
  });
});
