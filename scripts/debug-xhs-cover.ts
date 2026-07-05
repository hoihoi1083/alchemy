import { readFileSync } from "fs";
import { searchPlatformPostsByKeyword } from "../lib/justoneapi-platform-search";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim();
}

async function main() {
  const { posts } = await searchPlatformPostsByKeyword("xiaohongshu", "水晶手串", { limit: 3 });
  for (const [i, p] of posts.entries()) {
    console.log(`#${i + 1}`, p.title.slice(0, 40));
    console.log("  cover:", p.coverImageUrl?.slice(0, 90) ?? "(missing)");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
