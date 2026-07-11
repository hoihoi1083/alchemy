import { readFileSync } from "fs";
import { planContentResearch } from "../lib/content-research-plan";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim();
}

async function main() {
  const topic = "水晶手鏈送禮指南";
  console.log("=== Content research smoke (1 Just One search + DeepSeek) ===\n");
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
