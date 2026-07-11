import { readFileSync } from "fs";
import { fetchJustOneApi } from "../lib/justoneapi-client";
import {
  extractXhsNoteFromDetailResponse,
  mapRawPlatformPost,
} from "../lib/justoneapi-platform-search";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim();
}

const noteId = process.argv[2] ?? "6a3fb56200000000170280cd";
const url =
  process.argv[3] ??
  "https://www.xiaohongshu.com/explore/6a3fb56200000000170280cd?xsec_token=CB257MFk5rczwf-UucHDNk1qoTjGybygELOIu4NZafa50%3D&type=normal";

async function main() {
  const paths = [
    "/api/xiaohongshu/get-note-detail/v1",
    "/api/xiaohongshu/get-note-detail/v2",
    "/api/xiaohongshu/get-note-detail/v3",
    "/api/xiaohongshu/get-note-detail/v4",
    "/api/xiaohongshu/get-note-detail/v5",
    "/api/xiaohongshu/get-note-detail/v7",
  ];
  for (const path of paths) {
    const paramVariants: Record<string, string>[] = [
      { noteId },
      { noteId, url },
      { noteId, noteUrl: url },
    ];
    for (const params of paramVariants) {
      try {
        const body = await fetchJustOneApi(path, params, "debug");
        const note = extractXhsNoteFromDetailResponse(body);
        const post = note ? mapRawPlatformPost("xiaohongshu", note, 0) : null;
        const dataLen = JSON.stringify(body.data ?? {}).length;
        console.log(
          path,
          JSON.stringify(params).slice(0, 50),
          "| dataLen:",
          dataLen,
          "| post:",
          post?.title?.slice(0, 24) ?? "—",
          "| cover:",
          post?.coverImageUrl?.slice(0, 70) ?? "—",
        );
      } catch (e) {
        console.log(path, "ERR", e instanceof Error ? e.message.slice(0, 80) : e);
      }
    }
  }
}

main().catch(console.error);
