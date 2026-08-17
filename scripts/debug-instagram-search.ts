import { searchPlatformPostsByKeyword } from "../lib/justoneapi-platform-search";
import { fetchJustOneApi, flattenSearchItems, asRecord } from "../lib/justoneapi-client";
import type { ContentResearchMediaFilter } from "../lib/content-research-types";

async function main() {
  const kw = process.argv[2] ?? "skincare";
  console.log("keyword:", kw);

  for (const filter of [undefined, "image", "video"] as const) {
    try {
      const r = await searchPlatformPostsByKeyword("instagram", kw, {
        limit: 3,
        mediaFilter: filter as ContentResearchMediaFilter | undefined,
      });
      console.log("\n[OK] filter=", filter ?? "any", "endpoint=", r.endpoint, "posts=", r.posts.length);
      for (const p of r.posts) {
        console.log(" ", p.title?.slice(0, 50), "| cover=", !!p.coverImageUrl, "| video=", !!p.videoUrl);
      }
    } catch (e) {
      console.log("\n[FAIL] filter=", filter ?? "any", e instanceof Error ? e.message : e);
    }
  }

  console.log("\n--- raw hashtag ---");
  try {
    const hashtag = kw.trim().replace(/^#/, "").replace(/\s+/g, "").slice(0, 80);
    const body = await fetchJustOneApi(
      "/api/instagram/search-hashtag-posts/v1",
      { hashtag },
      "debug hashtag",
    );
    const items = flattenSearchItems(body);
    console.log("items", items.length, "code", body.code, "message", body.message);
    const first = asRecord(items[0]);
    if (first) console.log("first keys", Object.keys(first).join(", "));
  } catch (e) {
    console.log("FAIL", e instanceof Error ? e.message : e);
  }

  console.log("\n--- raw reels ---");
  try {
    const body = await fetchJustOneApi(
      "/api/instagram/search-reels/v1",
      { keyword: kw },
      "debug reels",
    );
    const items = flattenSearchItems(body);
    console.log("items", items.length, "code", body.code, "message", body.message);
    const first = asRecord(items[0]);
    if (first) console.log("first keys", Object.keys(first).join(", "));
  } catch (e) {
    console.log("FAIL", e instanceof Error ? e.message : e);
  }
}

main().catch(console.error);
