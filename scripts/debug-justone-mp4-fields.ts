import { existsSync, readFileSync } from "node:fs";
import {
  asRecord,
  fetchJustOneApi,
  flattenSearchItems,
  pickString,
  pickVideoUrl,
} from "../lib/justoneapi-client";

if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  }
}

async function main() {
  const search = await fetchJustOneApi(
    "/api/xiaohongshu/search-note/v2",
    { keyword: "粉水晶手链", page: "1", sort: "collect_descending", noteType: "_1" },
    "search",
  );
  const items = flattenSearchItems(search);
  console.log("items", items.length);

  for (let i = 0; i < Math.min(3, items.length); i++) {
    const item = asRecord(items[i]);
    const note = asRecord(item?.note) ?? asRecord(item?.note_card) ?? item;
    const noteId = pickString(note?.id, note?.note_id);
    console.log(`\n=== [${i}] ${noteId} ===`);
    console.log("search type:", pickString(note?.type, note?.note_type));
    console.log("search videoUrl:", pickVideoUrl(note?.video, note?.native_video) ?? "NONE");

    const detail = await fetchJustOneApi(
      "/api/xiaohongshu/get-note-detail/v5",
      { noteId },
      "detail",
    );
    const data = asRecord(detail.data) ?? detail;
    const dn = asRecord(data.note) ?? data;
    console.log("detail keys:", Object.keys(dn).join(", "));
    console.log(
      "detail videoUrl:",
      pickVideoUrl(dn.video, dn.native_video, dn.video_info) ?? "NONE",
    );
    const snippet = JSON.stringify(
      { video: dn.video, native_video: dn.native_video, video_info: dn.video_info },
      null,
      2,
    );
    console.log(snippet?.slice(0, 2000));
  }
}

main().catch(console.error);
