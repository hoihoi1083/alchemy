/**
 * Integration readiness check — no paid API calls unless --live.
 * Run: npx tsx scripts/test-integration-env.ts
 * Live: npx tsx scripts/test-integration-env.ts --live
 */
import { readFileSync, existsSync } from "fs";
import { planContentResearch } from "../lib/content-research-plan";

function loadEnvLocal() {
  if (!existsSync(".env.local")) return;
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  }
}

const live = process.argv.includes("--live");

async function main() {
  loadEnvLocal();
  const checks: { name: string; ok: boolean; detail: string }[] = [];

  checks.push({
    name: "FAL_KEY",
    ok: Boolean(process.env.FAL_KEY?.trim()),
    detail: process.env.FAL_KEY?.trim() ? "set" : "missing — image/video generation disabled",
  });
  checks.push({
    name: "DEEPSEEK_API_KEY",
    ok: Boolean(process.env.DEEPSEEK_API_KEY?.trim()),
    detail: process.env.DEEPSEEK_API_KEY?.trim() ? "set" : "missing — planners/research disabled",
  });
  checks.push({
    name: "JUSTONEAPI_TOKEN",
    ok: Boolean(process.env.JUSTONEAPI_TOKEN?.trim()),
    detail: process.env.JUSTONEAPI_TOKEN?.trim()
      ? "set"
      : "missing — XHS/IG live post search disabled",
  });

  console.log("=== Integration env checklist ===\n");
  for (const c of checks) {
    console.log(`${c.ok ? "✓" : "✗"} ${c.name}: ${c.detail}`);
  }

  if (!live) {
    console.log("\n(Pass --live to run network synthesis smoke test)");
    const requiredForGen = checks.filter((c) => c.name === "FAL_KEY" || c.name === "DEEPSEEK_API_KEY");
    if (requiredForGen.some((c) => !c.ok)) {
      process.exit(1);
    }
    return;
  }

  if (!process.env.DEEPSEEK_API_KEY?.trim()) {
    throw new Error("DEEPSEEK_API_KEY required for --live");
  }

  console.log("\n=== Live research smoke (category + product) ===\n");
  const topic = "水晶手串";
  const product = "马达加斯加粉水晶手链";
  console.log("(1 Just One search + 1 DeepSeek call)\n");

  const plan = await planContentResearch({
    topic,
    product,
    platform: "xiaohongshu",
    market: "hk",
    promotionMode: "physical",
    mediaFilter: "image",
  });
  console.log("Plan mode:", plan.researchMode, "| candidates:", plan.candidates.length);
  const top = plan.topPicks[0] ?? plan.candidates[0];
  if (top) {
    console.log("Top hook:", top.hook.slice(0, 80));
    const mentionsProduct = top.hook.includes(product.slice(0, 4));
    console.log("Hook mentions product:", mentionsProduct ? "yes" : "no (may need manual headline edit)");
  }
  console.log("\n=== LIVE SMOKE PASS ===");
}

main().catch((e) => {
  console.error("FAIL:", e instanceof Error ? e.message : e);
  process.exit(1);
});
