import { readFileSync } from "fs";
import { fetchJustOneApi, flattenSearchItems, asRecord, pickString, pickVideoUrl } from "../lib/justoneapi-client";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim();
}

async function main() {
  const search = await fetchJustOneApi(
    "/api/xiaohongshu/search-note/v2",
    { keyword: "水晶手串", page: "1", sort: "collect_descending", noteType: "_2" },
    "XHS search",
  );
  const items = flattenSearchItems(search);
  for (let i = 0; i < Math.min(5, items.length); i++) {
    const item = asRecord(items[i]);
    const note = asRecord(item?.note) ?? item;
    const noteId = pickString(note?.id, note?.note_id);
    console.log(`\n[${i}] noteId:`, noteId, "type:", note?.type, "has_music:", note?.has_music);

    try {
      const detail = await fetchJustOneApi(
        "/api/xiaohongshu/get-note-detail/v5",
        { noteId },
        "XHS note detail v5",
      );
      const data = asRecord(detail.data) ?? detail;
      const detailNote = asRecord(data.note) ?? data;
      const videoUrl = pickVideoUrl(detailNote?.video, detailNote?.native_video);
      console.log("  videoUrl:", videoUrl ? `${videoUrl.slice(0, 90)}…` : "none");
      console.log("  detail type:", detailNote?.type);
    } catch (e) {
      console.log("  detail error:", e instanceof Error ? e.message : e);
    }
  }
}

main().catch(console.error);
