/**
 * Master test runner.
 *   npm test              — unit + assistant + env
 *   npm test -- --live    — + live matrix (all topics)
 *   npm test -- --generate — + FAL image smoke (2 images)
 */
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const testDir = join(root, "tests");
const testFiles = readdirSync(testDir)
  .filter((f) => f.endsWith(".test.ts"))
  .map((f) => join(testDir, f));

const args = process.argv.slice(2);
const live = args.includes("--live");
const justoneMp4 = args.includes("--justone-mp4");
const generate = args.includes("--generate");
const liveQuick = args.includes("--quick");

function run(cmd: string, runArgs: string[], label: string): boolean {
  console.log(`\n=== ${label} ===\n`);
  const r = spawnSync(cmd, runArgs, { cwd: root, stdio: "inherit", shell: false });
  if (r.status !== 0) {
    console.error(`\n✗ ${label} failed (exit ${r.status})`);
    return false;
  }
  console.log(`\n✓ ${label} passed`);
  return true;
}

let ok = true;
ok = run("npx", ["tsx", "--test", ...testFiles], `Unit + matrix tests (${testFiles.length} files)`) && ok;
ok =
  run("npx", ["tsx", "scripts/test-studio-assistant-routing-matrix.ts"], "Assistant routing matrix") &&
  ok;
ok = run("npx", ["tsx", "scripts/test-integration-env.ts"], "Integration env checklist") && ok;

if (justoneMp4) {
  if (!process.env.JUSTONE_ALLOW_LIVE?.trim()) {
    console.error(
      "\n✗ Just One MP4 probe skipped: set JUSTONE_ALLOW_LIVE=1\n" +
        "  Example: JUSTONE_ALLOW_LIVE=1 npm test -- --justone-mp4\n",
    );
    process.exit(1);
  }
  ok = run("npx", ["tsx", "scripts/test-justone-mp4-pipeline.ts"], "Just One MP4 pipeline (live)") && ok;
}

if (live) {
  if (!process.env.JUSTONE_ALLOW_LIVE?.trim()) {
    console.error(
      "\n✗ Live matrix skipped: set JUSTONE_ALLOW_LIVE=1 to run 14 paid Just One searches.\n" +
        "  Example: JUSTONE_ALLOW_LIVE=1 npm test -- --live\n",
    );
    process.exit(1);
  }
  const liveArgs = ["tsx", "scripts/test-matrix-live.ts"];
  if (liveQuick) liveArgs.push("--quick");
  ok = run("npx", liveArgs, liveQuick ? "Live matrix (quick)" : "Live matrix (all topics)") && ok;
}

if (generate) {
  ok = run("npx", ["tsx", "scripts/test-generate-pipeline-smoke.ts"], "FAL generate smoke") && ok;
}

if (!ok) process.exit(1);

const totalUnit = testFiles.length;
console.log(`
=== ALL TESTS PASSED ===
  Unit/matrix files: ${totalUnit}
  Assistant cases:   24
  Live matrix:       ${live ? (liveQuick ? "3 scenarios" : "14 scenarios") : "skipped (npm test -- --live)"}
  Just One MP4:      ${justoneMp4 ? "live probe" : "skipped (npm test -- --justone-mp4)"}
  FAL generate:      ${generate ? "2 images" : "skipped (npm test -- --generate)"}
`);
