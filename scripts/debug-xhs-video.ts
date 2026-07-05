import { readFileSync } from "fs";
import { fetchJustOneApi, flattenSearchItems, asRecord, pickString } from "../lib/justoneapi-client";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim();
}

async function main() {
  const body = await fetchJustOneApi(
    "/api/xiaohongshu/search-note/v2",
    { keyword: "水晶手串", page: "1", sort: "collect_descending", noteType: "_2" },
    "XHS video search",
  );
  const items = flattenSearchItems(body);
  console.log("items:", items.length);
  for (let i = 0; i < Math.min(2, items.length); i++) {
    const item = asRecord(items[i]);
    const note = asRecord(item?.note) ?? asRecord(item?.note_card) ?? item;
    console.log("\n--- note", i, "---");
    console.log("type:", pickString(note?.type, note?.note_type));
    console.log("keys:", note ? Object.keys(note).join(", ") : "none");
    const video = asRecord(note?.video);
    if (video) console.log("video keys:", Object.keys(video).join(", "));
    console.log(JSON.stringify(note?.video ?? note?.native_video, null, 2)?.slice(0, 1200));
  }
}

main().catch(console.error);
