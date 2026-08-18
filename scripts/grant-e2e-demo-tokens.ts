/**
 * Top up the Playwright E2E user so landing-demo recording can generate stills/video.
 *
 *   npx tsx scripts/grant-e2e-demo-tokens.ts
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

function loadEnvLocal() {
  const p = path.join(process.cwd(), ".env.local");
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (!m) continue;
    const key = m[1]!.trim();
    let val = m[2]!.trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvLocal();

async function main() {
  const clerkId = process.env.E2E_CLERK_USER_ID?.trim();
  if (!clerkId) throw new Error("E2E_CLERK_USER_ID is not set");
  const { grantTokens } = await import("../lib/billing/ledger");
  const after = await grantTokens(clerkId, 25_000, "admin_adjust", {
    meta: { reason: "landing_demo_record" },
  });
  console.log(`E2E demo wallet balance after grant: ${after}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
