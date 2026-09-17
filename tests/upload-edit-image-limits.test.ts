import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isSafeForServerUpload, VERCEL_SAFE_UPLOAD_BYTES } from "../lib/upload-limits";

describe("upload-limits for edit-image-2", () => {
  it("rejects bodies over the Vercel-safe cap", () => {
    assert.equal(isSafeForServerUpload(VERCEL_SAFE_UPLOAD_BYTES), true);
    assert.equal(isSafeForServerUpload(VERCEL_SAFE_UPLOAD_BYTES + 1), false);
    assert.equal(isSafeForServerUpload(5 * 1024 * 1024), false);
  });
});
