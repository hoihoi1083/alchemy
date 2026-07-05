import { readFileSync, writeFileSync } from "fs";
import { fetchJustOneApi, flattenSearchItems, asRecord } from "../lib/justoneapi-client";
import { searchPlatformPostsByKeyword } from "../lib/justoneapi-platform-search";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim();
}

async function main() {
  const body = await fetchJustOneApi(
    "/api/facebook/search-post/v1",
    { keyword: "crystal bracelet" },
    "Facebook search",
  );
  const items = flattenSearchItems(body);
  console.log("items:", items.length);
  writeFileSync("/tmp/fb-search-sample.json", JSON.stringify(items[0], null, 2));
  console.log("wrote /tmp/fb-search-sample.json");

  const { posts } = await searchPlatformPostsByKeyword("facebook", "crystal bracelet", { limit: 3 });
  for (const p of posts) {
    console.log(`\n${p.title.slice(0, 50)}`);
    console.log("  cover:", p.coverImageUrl ? "yes" : "no");
    if (p.coverImageUrl) console.log("  url:", p.coverImageUrl.slice(0, 90));
  }
}

main().catch(console.error);
