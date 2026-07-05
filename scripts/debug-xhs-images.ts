import { readFileSync } from "fs";
import { searchPlatformPostsByKeyword } from "../lib/justoneapi-platform-search";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim();
}

async function main() {
  const { posts } = await searchPlatformPostsByKeyword("xiaohongshu", "水晶手串", { limit: 8 });
  for (const p of posts) {
    console.log(
      `${p.title.slice(0, 36).padEnd(36)} | images: ${p.imageUrls?.length ?? 0}`,
    );
  }
}

main().catch(console.error);
