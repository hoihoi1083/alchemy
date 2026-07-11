/**
 * Live matrix — every topic scenario × research + apply validation.
 * Run: npx tsx scripts/test-matrix-live.ts
 * Quick (3 topics): npx tsx scripts/test-matrix-live.ts --quick
 */
import { readFileSync, existsSync } from "fs";
import { buildContentAngleHandoff } from "../lib/content-research-apply";
import { planContentResearch } from "../lib/content-research-plan";
import { isContentResearchStyleExtra } from "../lib/content-research-promote";
import { TOPIC_SCENARIOS } from "../tests/fixtures/topic-matrix";

function loadEnvLocal() {
  if (!existsSync(".env.local")) return;
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  }
}

const quick = process.argv.includes("--quick");
const scenarios = quick ? TOPIC_SCENARIOS.slice(0, 3) : TOPIC_SCENARIOS;

type Row = {
  id: string;
  ok: boolean;
  skipped?: boolean;
  candidates: number;
  posts: number;
  format?: string;
  productOk: boolean;
  styleOnlyOk: boolean;
  detail: string;
};

function headlineMatchesProduct(headline: string, product: string): boolean {
  const p = product.trim();
  if (!p || !headline) return false;
  if (headline.includes(p)) return true;
  const chunk = p.slice(0, Math.min(4, p.length));
  if (chunk.length >= 2 && headline.includes(chunk)) return true;
  if (/[a-zA-Z]/.test(p)) {
    return headline.toLowerCase().includes(p.slice(0, 6).toLowerCase());
  }
  return false;
}

async function runScenario(s: (typeof TOPIC_SCENARIOS)[0]): Promise<Row> {
  const platform = s.platform ?? "xiaohongshu";
  try {
    const plan = await planContentResearch({
      topic: s.search,
      product: s.product,
      platform,
      market: s.market,
      promotionMode: s.promotionMode,
      mediaFilter: s.mediaFilter,
    });
    const angle =
      plan.candidates.find((c) => c.sourceUrl || c.sourceCoverImageUrl || c.sourceVideoUrl) ??
      plan.candidates[0];
    if (!angle) {
      return {
        id: s.id,
        ok: true,
        skipped: true,
        candidates: 0,
        posts: plan.posts?.length ?? 0,
        productOk: false,
        styleOnlyOk: false,
        detail: "skipped — no candidates (API/balance/filter)",
      };
    }
    const handoff = buildContentAngleHandoff(angle, plan, s.promotionMode, s.product);
    const productOk =
      s.promotionMode === "physical"
        ? handoff.product === s.product
        : Boolean(handoff.conceptIdea?.includes(s.product));
    const styleOnlyOk = Boolean(
      handoff.promptExtra &&
        isContentResearchStyleExtra(handoff.promptExtra) &&
        handoff.promptExtra.includes(s.product) &&
        handoff.promptExtra.includes("MATCH reference visual style"),
    );
    const headlineOk =
      Boolean(handoff.headline) &&
      !handoff.headline!.includes(s.referenceTopic) &&
      headlineMatchesProduct(handoff.headline!, s.product);
    return {
      id: s.id,
      ok: productOk && styleOnlyOk && headlineOk,
      candidates: plan.candidates.length,
      posts: plan.posts?.length ?? 0,
      format: angle.format,
      productOk,
      styleOnlyOk: styleOnlyOk && headlineOk,
      detail: `hook=${angle.hook.slice(0, 40)}…`,
    };
  } catch (e: unknown) {
    return {
      id: s.id,
      ok: false,
      candidates: 0,
      posts: 0,
      productOk: false,
      styleOnlyOk: false,
      detail: e instanceof Error ? e.message : String(e),
    };
  }
}

async function main() {
  loadEnvLocal();
  if (!process.env.JUSTONE_ALLOW_LIVE?.trim()) {
    console.error(
      "Refusing live matrix: this runs 14 paid Just One searches (3 with --quick).\n" +
        "Set JUSTONE_ALLOW_LIVE=1 in the environment to continue.",
    );
    process.exit(1);
  }
  if (!process.env.DEEPSEEK_API_KEY?.trim()) {
    throw new Error("DEEPSEEK_API_KEY required");
  }

  console.log(`=== Live matrix: ${scenarios.length} scenarios ===\n`);
  const rows: Row[] = [];
  for (const s of scenarios) {
    process.stdout.write(`… ${s.id} `);
    const row = await runScenario(s);
    rows.push(row);
    console.log(row.ok ? "✓" : "✗", row.detail);
  }

  console.log("\n=== Summary ===\n");
  console.log(
    "id".padEnd(22),
    "ok",
    "cand",
    "posts",
    "format".padEnd(18),
    "product",
    "style",
    "note",
  );
  for (const r of rows) {
    console.log(
      r.id.padEnd(22),
      r.skipped ? "–" : r.ok ? "✓" : "✗",
      String(r.candidates).padStart(4),
      String(r.posts).padStart(5),
      (r.format ?? "-").padEnd(18),
      r.productOk ? "✓" : "✗",
      r.styleOnlyOk ? "✓" : "✗",
      r.skipped ? "skip" : "",
    );
  }
  const failed = rows.filter((r) => !r.ok && !r.skipped);
  const skipped = rows.filter((r) => r.skipped);
  if (skipped.length) {
    console.log(`\n${skipped.length} scenario(s) skipped (API limit / no posts for filter)`);
  }
  if (failed.length) {
    console.error(`\n${failed.length}/${rows.length} scenarios failed`);
    process.exit(1);
  }
  console.log(`\n=== LIVE MATRIX PASS (${rows.length - skipped.length} ran, ${skipped.length} skipped) ===`);
}

main().catch((e) => {
  console.error("FAIL:", e instanceof Error ? e.message : e);
  process.exit(1);
});
