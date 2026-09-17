/**
 * Live Just One search probe — IG + RedNote only (no DeepSeek plan).
 * Run: npx tsx scripts/probe-justone-search.ts
 */
import { readFileSync, existsSync } from "fs";
import { searchPlatformPostsByKeyword } from "../lib/justoneapi-platform-search";

function loadEnvLocal() {
  if (!existsSync(".env.local")) return;
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (!m) continue;
    const key = m[1].trim();
    if (process.env[key]) continue;
    process.env[key] = m[2].trim().replace(/^["']|["']$/g, "");
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function probe(
  platform: "xiaohongshu" | "instagram",
  keyword: string,
  mediaFilter: "image" | "video" = "image",
) {
  const t0 = Date.now();
  try {
    const r = await searchPlatformPostsByKeyword(platform, keyword, {
      limit: 5,
      mediaFilter,
    });
    const sample = r.posts[0];
    console.log(
      `OK  ${platform.padEnd(12)} [${mediaFilter}] "${keyword}" ${Date.now() - t0}ms · posts=${r.posts.length}`,
    );
    console.log(`    endpoint=${r.endpoint} requestId=${r.requestId ?? "-"}`);
    if (sample) {
      console.log(
        `    sample cover=${Boolean(sample.coverImageUrl)} media=${sample.mediaType} url=${(sample.url ?? "").slice(0, 70)}`,
      );
    }
    return { ok: true as const, platform, keyword, posts: r.posts.length };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.log(
      `FAIL ${platform.padEnd(12)} [${mediaFilter}] "${keyword}" ${Date.now() - t0}ms`,
    );
    console.log(`    ${msg.slice(0, 400)}`);
    return { ok: false as const, platform, keyword, error: msg };
  }
}

async function main() {
  loadEnvLocal();
  const token = process.env.JUSTONEAPI_TOKEN?.trim();
  console.log("=== Just One search probe ===");
  console.log(
    `token: ${token ? `set (${token.length} chars)` : "MISSING"}`,
  );
  console.log(
    `base: ${process.env.JUSTONEAPI_BASE_URL?.trim() || "https://api.justoneapi.com (default)"}`,
  );
  if (!token) {
    process.exit(2);
  }

  const results = [];
  results.push(await probe("xiaohongshu", "Vitamin C serum", "image"));
  await sleep(3500);
  results.push(await probe("xiaohongshu", "维C精华", "image"));
  await sleep(3500);
  results.push(await probe("instagram", "Vitamin C serum", "image"));
  await sleep(3500);
  results.push(await probe("instagram", "vitamincserum", "image"));

  console.log("\n=== SUMMARY ===");
  for (const r of results) {
    if (r.ok) console.log(`✓ ${r.platform} "${r.keyword}" → ${r.posts} posts`);
    else console.log(`✗ ${r.platform} "${r.keyword}" → ${r.error.slice(0, 120)}`);
  }
  const failed = results.filter((r) => !r.ok);
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
