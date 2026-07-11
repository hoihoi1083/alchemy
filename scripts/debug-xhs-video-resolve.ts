import { existsSync, readFileSync } from "node:fs";
import {
  asRecord,
  fetchJustOneApi,
  flattenSearchItems,
  pickString,
  pickVideoUrl,
} from "../lib/justoneapi-client";
import { extractXhsNoteFromDetailResponse } from "../lib/justoneapi-platform-search";
import { pickVideoUrlFromXhsNote, xhsNoteDetailParams } from "../lib/xhs-note-detail";

if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  }
}

async function tryDetail(path: string, noteId: string, noteUrl?: string) {
  const body = await fetchJustOneApi(path, xhsNoteDetailParams(noteId, noteUrl), "video-detail");
  const note = extractXhsNoteFromDetailResponse(body);
  return note ? pickVideoUrlFromXhsNote(note) : undefined;
}

async function main() {
  const noteId = process.argv[2] ?? "69d1e341000000000e022fa7";
  const noteUrl = process.argv[3];
  for (const path of [
    "/api/xiaohongshu/get-note-detail/v6",
    "/api/xiaohongshu/get-note-detail/v5",
  ] as const) {
    try {
      const body = await fetchJustOneApi(path, xhsNoteDetailParams(noteId, noteUrl), "video-detail");
      const note = extractXhsNoteFromDetailResponse(body);
      const url = note ? pickVideoUrlFromXhsNote(note) : undefined;
      console.log(path, "note?", !!note, "type:", note?.type, "video?", url?.slice(0, 90) ?? "none");
      if (note && !url) {
        console.log("note keys:", Object.keys(note).filter((k) => /video|media|stream/i.test(k)));
        console.log("video json:", JSON.stringify(note.video ?? note.native_video).slice(0, 500));
      }
    } catch (e) {
      console.log(path, "ERR", e instanceof Error ? e.message : e);
    }
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
