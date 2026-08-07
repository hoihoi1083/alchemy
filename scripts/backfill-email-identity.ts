/**
 * Backfill emailNormalized + merge any remaining active email duplicates.
 * Safe to re-run. Run: npx tsx scripts/backfill-email-identity.ts
 */
import { existsSync, readFileSync } from "node:fs";

function loadEnv() {
  if (!existsSync(".env.local")) return;
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m && !process.env[m[1].trim()]) {
      process.env[m[1].trim()] = m[2].trim().replace(/^"|"$/g, "");
    }
  }
}

async function main() {
  loadEnv();
  const { normalizeEmail, mergeEmailDuplicatesInto, pickCanonicalUser } =
    await import("../lib/db/email-identity");
  const mongo = await import("../lib/mongodb");
  const getDb = (mongo as { getDb?: () => Promise<import("mongodb").Db> }).getDb
    ?? (mongo as { default?: { getDb: () => Promise<import("mongodb").Db> } }).default
        ?.getDb;
  if (!getDb) throw new Error("getDb missing");
  type DbUser = import("../lib/db/types").DbUser;

  const db = await getDb();

  // Drop non-partial unique emailNormalized index if present, recreate partial.
  const idxs = await db.collection("users").indexes();
  const emailNorm = idxs.find((i) => i.name === "emailNormalized_1");
  if (emailNorm) {
    console.log("Dropping existing emailNormalized_1 for recreate", {
      unique: emailNorm.unique,
      partial: Boolean(
        (emailNorm as { partialFilterExpression?: unknown }).partialFilterExpression,
      ),
    });
    await db.collection("users").dropIndex("emailNormalized_1");
  }

  // Group by normalized email (from email field) among non-superseded.
  const users = await db
    .collection<DbUser>("users")
    .find({
      $or: [{ supersededBy: null }, { supersededBy: { $exists: false } }],
    })
    .toArray();

  const byEmail = new Map<string, DbUser[]>();
  for (const u of users) {
    const norm = normalizeEmail(u.emailNormalized ?? u.email);
    if (!norm) continue;
    const list = byEmail.get(norm) ?? [];
    list.push(u);
    byEmail.set(norm, list);
  }

  let mergedGroups = 0;
  for (const [email, group] of byEmail) {
    if (group.length < 2) {
      const only = group[0];
      if (only && only.emailNormalized !== email) {
        await db.collection<DbUser>("users").updateOne(
          { clerkId: only.clerkId },
          { $set: { emailNormalized: email, updatedAt: new Date() } },
        );
      }
      continue;
    }
    mergedGroups += 1;
    const canonical = group.reduce((a, b) => pickCanonicalUser(a, b));
    console.log("Merging email group", email, "→", canonical.clerkId, "from", group.map((g) => g.clerkId));
    // Ensure canonical has emailNormalized before merge helpers run.
    await db.collection<DbUser>("users").updateOne(
      { clerkId: canonical.clerkId },
      {
        $set: {
          emailNormalized: email,
          supersededBy: null,
          supersededAt: null,
          updatedAt: new Date(),
        },
      },
    );
    await mergeEmailDuplicatesInto({
      clerkId: canonical.clerkId,
      emailNormalized: email,
    });
    await db.collection<DbUser>("users").updateOne(
      { clerkId: canonical.clerkId },
      { $set: { emailNormalized: email, updatedAt: new Date() } },
    );
  }

  // Set emailNormalized on remaining singles still missing it.
  const missing = await db
    .collection<DbUser>("users")
    .find({
      email: { $type: "string" },
      $or: [{ emailNormalized: { $exists: false } }, { emailNormalized: null }],
    })
    .toArray();
  for (const u of missing) {
    const norm = normalizeEmail(u.email);
    if (!norm) continue;
    await db.collection<DbUser>("users").updateOne(
      { clerkId: u.clerkId },
      { $set: { emailNormalized: norm, updatedAt: new Date() } },
    );
  }

  await db.collection("users").createIndex(
    { emailNormalized: 1 },
    {
      unique: true,
      partialFilterExpression: {
        emailNormalized: { $type: "string" },
        supersededBy: null,
      },
    },
  );

  console.log(
    JSON.stringify(
      {
        mergedGroups,
        backfilledMissing: missing.length,
        hoihoi: await db.collection("users").find({
          email: { $regex: /^hoihoi1083@gmail\.com$/i },
        }).project({
          clerkId: 1,
          plan: 1,
          creditBalance: 1,
          stripeCustomerId: 1,
          stripeSubscriptionId: 1,
          emailNormalized: 1,
          supersededBy: 1,
        }).toArray(),
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
