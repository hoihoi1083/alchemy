/**
 * Live Just One MP4 pipeline — search → resolve → CDN download.
 *
 * Costs ~1 Just One search + up to 5 detail calls when URLs missing from list.
 *
 *   JUSTONE_ALLOW_LIVE=1 npx tsx scripts/test-justone-mp4-pipeline.ts
 *   JUSTONE_ALLOW_LIVE=1 npx tsx scripts/test-justone-mp4-pipeline.ts --keyword "粉水晶"
 */
import { existsSync, readFileSync } from "node:fs";
import { hasJustOneApiConfigured } from "../lib/justoneapi-client";
import {
  formatMp4ProbeReport,
  probeJustOneMp4Pipeline,
} from "../lib/justone-mp4-probe";

function loadEnvLocal() {
  if (!existsSync(".env.local")) return;
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  }
}

function argValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  loadEnvLocal();

  if (!process.env.JUSTONE_ALLOW_LIVE?.trim()) {
    console.error(
      "Set JUSTONE_ALLOW_LIVE=1 to run paid Just One API calls.\n" +
        "  Example: JUSTONE_ALLOW_LIVE=1 npm run test:justone-mp4\n",
    );
    process.exit(1);
  }

  if (!hasJustOneApiConfigured()) {
    console.error("JUSTONEAPI_TOKEN is not configured in .env.local");
    process.exit(1);
  }

  const keyword = argValue("--keyword")?.trim() || "水晶手串";
  const maxPosts = Number(argValue("--max") ?? "5");

  console.log("=== Just One MP4 pipeline (live) ===\n");
  console.log(`Keyword: ${keyword}`);
  console.log(`Max posts: ${maxPosts}\n`);

  const report = await probeJustOneMp4Pipeline({
    keyword,
    platform: "xiaohongshu",
    maxPosts,
  });

  console.log(formatMp4ProbeReport(report));
  console.log("");

  if (!report.searchOk) {
    console.error("FAIL — Just One search did not succeed. Video research cannot work until search works.");
    process.exit(1);
  }

  if (report.postsFound < 1) {
    console.error("FAIL — Search returned zero video posts for this keyword.");
    process.exit(1);
  }

  if (!report.anyDownloadOk) {
    console.error(
      "FAIL — Posts were found but NO reference MP4 could be downloaded.\n" +
        "  The content-research → reference-video flow is not viable with current Just One / CDN behavior.\n" +
        "  Try another keyword, check Just One dashboard permissions, or use manual MP4 upload.",
    );
    process.exit(1);
  }

  if (!report.anyMp4Ok) {
    console.warn(
      "WARN — Download succeeded but ftyp sniff failed (may still be playable video).",
    );
  }

  console.log("PASS — At least one Just One post MP4 downloaded successfully.");
}

main().catch((e) => {
  console.error("FAIL:", e instanceof Error ? e.message : e);
  process.exit(1);
});
