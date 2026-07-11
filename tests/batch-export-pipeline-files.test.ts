import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BATCH_EXPORT_SIZES } from "../lib/batch-export-sizes";
import { PIPELINE_FILES, resolvePipelineFileUrl } from "../lib/pipeline/local-input";

describe("batch export pipeline files", () => {
  for (const size of BATCH_EXPORT_SIZES) {
    it(`whitelists ${size.filename}`, () => {
      assert.ok(PIPELINE_FILES.has(size.filename));
      const resolved = resolvePipelineFileUrl(
        `http://localhost:3000/api/pipeline-files/00000000-0000-4000-8000-000000000001/${size.filename}`,
      );
      assert.ok(resolved?.endsWith(size.filename));
    });
  }
});
