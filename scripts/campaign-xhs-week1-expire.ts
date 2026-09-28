/**
 * Expire XHS Week 1 campaign Pro comps (no Stripe subscription).
 *
 * Downgrades users whose campaign `proEndsAt` has passed, plan is still `pro`,
 * and they have no `stripeSubscriptionId` (so paid subscribers are untouched).
 *
 * Usage:
 *   npx tsx scripts/campaign-xhs-week1-expire.ts --dry-run
 *   npx tsx scripts/campaign-xhs-week1-expire.ts
 *
 * Run daily during/after the campaign (or manually on Day 8+).
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const CAMPAIGN_ID = "xhs_week1_noprompt";

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
  const dryRun = process.argv.includes("--dry-run");
  const { isMongoConfigured, getDb } = await import("../lib/mongodb");
  if (!isMongoConfigured()) throw new Error("MONGODB_URI not configured");

  const db = await getDb();
  const now = new Date();
  const grants = await db
    .collection("campaign_grants")
    .find({
      campaignId: CAMPAIGN_ID,
      proEndsAt: { $ne: null, $lte: now },
      expiredAt: { $exists: false },
    })
    .toArray();

  console.log(
    `[expire] ${CAMPAIGN_ID} due: ${grants.length}` +
      (dryRun ? " (dry-run)" : ""),
  );

  let ok = 0;
  let skipped = 0;

  for (const g of grants) {
    const clerkId = String(g.clerkId);
    const user = await db.collection("users").findOne({ clerkId });
    if (!user) {
      console.warn(`[skip] missing user ${clerkId}`);
      skipped++;
      continue;
    }
    if (user.stripeSubscriptionId) {
      console.log(`[skip] ${g.emailNormalized} has Stripe sub — leave plan`);
      if (!dryRun) {
        await db.collection("campaign_grants").updateOne(
          { _id: g._id },
          { $set: { expiredAt: now, expireNote: "kept_paid_sub" } },
        );
      }
      skipped++;
      continue;
    }
    if (user.plan !== "pro") {
      console.log(`[skip] ${g.emailNormalized} plan=${user.plan}`);
      if (!dryRun) {
        await db.collection("campaign_grants").updateOne(
          { _id: g._id },
          { $set: { expiredAt: now, expireNote: `already_${user.plan}` } },
        );
      }
      skipped++;
      continue;
    }

    console.log(`[downgrade] ${g.emailNormalized} pro → free`);
    if (dryRun) {
      ok++;
      continue;
    }

    await db.collection("users").updateOne(
      { clerkId },
      {
        $set: {
          plan: "free",
          proTrialEndsAt: null,
          updatedAt: now,
        },
      },
    );
    try {
      const { syncOwnerTeamForPlan } = await import("../lib/team/service");
      await syncOwnerTeamForPlan(clerkId, "free");
    } catch (err) {
      console.warn("[warn] syncOwnerTeamForPlan failed", err);
    }
    await db.collection("campaign_grants").updateOne(
      { _id: g._id },
      { $set: { expiredAt: now, expireNote: "downgraded_free" } },
    );
    ok++;
  }

  console.log(`[done] downgraded=${ok} skipped=${skipped} dryRun=${dryRun}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
