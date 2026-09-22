import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  libraryMediaUrlForBoard,
  withLibraryInline,
} from "../lib/storage/library-asset-url";

describe("library inline media URLs", () => {
  it("adds inline=1 to bare library download paths", () => {
    const id = "aaaaaaaaaaaaaaaaaaaaaaaa";
    assert.equal(
      withLibraryInline(`/api/library/download/${id}`),
      `/api/library/download/${id}?inline=1`,
    );
  });

  it("does not double-add inline=1", () => {
    const id = "bbbbbbbbbbbbbbbbbbbbbbbb";
    const url = `/api/library/download/${id}?inline=1`;
    assert.equal(withLibraryInline(url), url);
  });

  it("prefers previewUrl from picker assets", () => {
    const id = "cccccccccccccccccccccccc";
    assert.equal(
      libraryMediaUrlForBoard({
        previewUrl: `/api/library/download/${id}?inline=1`,
        downloadUrl: `/api/library/download/${id}`,
      }),
      `/api/library/download/${id}?inline=1`,
    );
  });

  it("leaves http(s) URLs unchanged", () => {
    assert.equal(
      withLibraryInline("https://cdn.example.com/x.mp4"),
      "https://cdn.example.com/x.mp4",
    );
  });
});
