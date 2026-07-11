import { readFileSync } from "fs";
import { searchPlatformPostsByKeyword } from "../lib/justoneapi-platform-search";
import type { ContentPlatform } from "../lib/content-research-types";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim();
}

const platforms: ContentPlatform[] = ["xiaohongshu", "instagram", "tiktok", "facebook"];

async function main() {
  console.warn(
    "[justoneapi] debug-platform-search bills 4 API calls (XHS + IG + TikTok + Facebook).",
  );
  for (const platform of platforms) {
    try {
      const { posts, endpoint } = await searchPlatformPostsByKeyword(platform, "crystal bracelet", {
        limit: 3,
        market: "hk",
      });
      console.log(`\n[OK] ${platform} via ${endpoint}`);
      console.log(`  posts: ${posts.length}, cover: ${posts[0]?.coverImageUrl ? "yes" : "no"}`);
      const withVideo = posts.filter((p) => p.videoUrl).length;
      const multiImage = posts.filter((p) => (p.imageUrls?.length ?? 0) > 1).length;
      console.log(`  video: ${withVideo}/${posts.length}, multi-image: ${multiImage}/${posts.length}`);
      if (posts[0]?.imageUrls?.length) {
        console.log(`  first images: ${posts[0].imageUrls.length}`);
      }
      if (posts[0]?.videoUrl) console.log(`  first video: ${posts[0].videoUrl.slice(0, 80)}…`);
      console.log(`  first: ${posts[0]?.title?.slice(0, 50)}`);
    } catch (e) {
      console.log(`\n[FAIL] ${platform}:`, e instanceof Error ? e.message : e);
    }
  }
}

main().catch(console.error);
