import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
loadEnv();
import {
  getR2Config,
  getR2ObjectBytes,
  isR2Configured,
  putR2Object,
  signR2GetUrl,
} from "../lib/storage/r2";

/**
 * Smoke test for Cloudflare R2 connectivity.
 * Run: npx tsx scripts/test-r2-connection.ts
 */
async function main() {
  if (!isR2Configured()) {
    console.error("✗ R2 is not configured. Check R2_* vars in .env.local");
    process.exit(1);
  }
  const config = getR2Config()!;
  console.log(`✓ Config loaded — bucket "${config.bucket}" @ ${config.endpoint}`);

  const key = `diagnostics/r2-test-${Date.now()}.txt`;
  const message = `alchemy R2 test @ ${new Date().toISOString()}`;

  console.log(`→ Uploading ${key} …`);
  const put = await putR2Object(key, Buffer.from(message, "utf8"), "text/plain");
  console.log(`✓ Uploaded (public url: ${put.url ?? "n/a — private bucket"})`);

  console.log("→ Reading it back …");
  const got = await getR2ObjectBytes(key);
  if (!got) {
    console.error("✗ Could not read object back.");
    process.exit(1);
  }
  const roundTrip = Buffer.from(got.body).toString("utf8");
  if (roundTrip !== message) {
    console.error("✗ Round-trip mismatch:", roundTrip);
    process.exit(1);
  }
  console.log("✓ Round-trip content matches.");

  const signed = await signR2GetUrl(key, 600);
  console.log(`✓ Signed URL (valid ~10 min):\n  ${signed}`);

  console.log("\nAll R2 checks passed. You can delete the diagnostics/ test files anytime.");
}

main().catch((e) => {
  console.error("✗ R2 test failed:", e instanceof Error ? e.message : e);
  process.exit(1);
});
