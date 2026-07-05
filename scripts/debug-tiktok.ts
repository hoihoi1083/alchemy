import { readFileSync } from "fs";
import { fetchJustOneApi, flattenSearchItems } from "../lib/justoneapi-client";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim();
}

async function debugTiktok(keyword: string) {
  const body = await fetchJustOneApi(
    "/api/tiktok/search-post/v1",
    {
      keyword,
      offset: "0",
      sortType: "MOST_LIKED",
      publishTime: "ALL",
      region: "HK",
    },
    "TikTok",
  );
  const items = flattenSearchItems(body);
  console.log("keyword:", keyword, "items:", items.length);
  console.log("data keys:", Object.keys((body.data as object) ?? {}));
  console.log("raw slice:", JSON.stringify(body).slice(0, 1500));
}

async function main() {
  await debugTiktok("水晶手串").catch((e) => console.log("CN fail:", e.message));
  await debugTiktok("crystal bracelet").catch((e) => console.log("EN fail:", e.message));
}

main();
