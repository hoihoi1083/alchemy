import { readFileSync } from "fs";
import { fetchPlatformWebResearch } from "../lib/content-research-web";
import { planContentResearch } from "../lib/content-research-plan";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim();
}

async function main() {
  const topic = "水晶手鏈送禮指南";
  console.log("=== Step 1: Web search (Tavily) ===");
  const bundle = await fetchPlatformWebResearch(topic, "xiaohongshu");
  console.log("Provider:", bundle.provider);
  console.log("Queries:", bundle.queries.length);
  console.log("Unique results:", bundle.results.length);
  console.log("First source:", bundle.results[0]?.title?.slice(0, 60));
  console.log("First url:", bundle.results[0]?.url?.slice(0, 70));

  console.log("\n=== Step 2: DeepSeek synthesis ===");
  const plan = await planContentResearch({
    topic,
    platform: "xiaohongshu",
    market: "hk",
    promotionMode: "concept",
  });
  console.log("Research mode:", plan.researchMode);
  console.log("Sources:", plan.sources?.length ?? 0);
  console.log("Candidates:", plan.candidates.length);
  console.log("Top picks:", plan.topPicks.length);
  for (const [i, p] of plan.topPicks.entries()) {
    console.log(`\n#${i + 1} ${p.title}`);
    console.log("  Hook:", p.hook.slice(0, 80));
    console.log("  Format:", p.formatLabel);
    console.log("  Score:", p.score);
    console.log("  Source:", p.sourceUrl ? p.sourceUrl.slice(0, 70) : "(none)");
  }
  console.log("\nSummary:", plan.summary?.slice(0, 200));
  console.log("\n=== PASS ===");
}

main().catch((e) => {
  console.error("FAIL:", e instanceof Error ? e.message : e);
  process.exit(1);
});
