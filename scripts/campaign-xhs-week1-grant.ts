/**
 * XHS Week 1 (#NoPromptAdChallenge) — grant campaign reward to a winner.
 *
 * Reward: +1000 tokens + Pro features for 7 days (no Stripe card required).
 * Cap: first 20 successful grants for campaignId `xhs_week1_noprompt`.
 *
 * Does NOT set hasUsedProTrial — winners can still start the normal Stripe
 * Pro trial later (conversion path stays open).
 *
 * Usage:
 *   npx tsx scripts/campaign-xhs-week1-grant.ts --email user@x.com --dry-run
 *   npx tsx scripts/campaign-xhs-week1-grant.ts --email user@x.com --post-url "https://www.xiaohongshu.com/explore/..."
 *   npx tsx scripts/campaign-xhs-week1-grant.ts --from-csv path/to/winners.csv
 *
 * CSV columns (header required): email, post_url (optional), note (optional)
 *
 * Tracking: each grant is written to Mongo `campaign_grants` (idempotent per email).
 * Pair with Mixpanel: signup → Generate Success + spreadsheet of DM winners.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const CAMPAIGN_ID = "xhs_week1_noprompt";
const CAMPAIGN_TOKEN_BONUS = 1000;
const CAMPAIGN_PRO_DAYS = 7;
const CAMPAIGN_CAP = 20;

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

type WinnerRow = { email: string; postUrl?: string; note?: string };

function parseArgs(argv: string[]): {
  dryRun: boolean;
  rows: WinnerRow[];
} {
  const dryRun = argv.includes("--dry-run");
  const rows: WinnerRow[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--email") {
      const email = argv[++i]?.trim();
      if (!email) throw new Error("--email requires a value");
      let postUrl: string | undefined;
      let note: string | undefined;
      if (argv[i + 1] === "--post-url") {
        postUrl = argv[i + 2]?.trim();
        i += 2;
      }
      if (argv[i + 1] === "--note") {
        note = argv[i + 2]?.trim();
        i += 2;
      }
      rows.push({ email, postUrl, note });
    } else if (a === "--from-csv") {
      const file = argv[++i]?.trim();
      if (!file) throw new Error("--from-csv requires a path");
      rows.push(...parseCsv(file));
    }
  }
  if (rows.length === 0) {
    throw new Error(
      "Pass --email user@x.com and/or --from-csv winners.csv (optional --dry-run)",
    );
  }
  return { dryRun, rows };
}

function parseCsv(filePath: string): WinnerRow[] {
  const abs = path.isAbsolute(filePath)
    ? filePath
    : path.join(process.cwd(), filePath);
  const text = readFileSync(abs, "utf8");
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) throw new Error(`CSV empty or missing header: ${abs}`);
  const header = lines[0]!.split(",").map((h) => h.trim().toLowerCase());
  const emailIdx = header.indexOf("email");
  if (emailIdx < 0) throw new Error("CSV needs an email column");
  const postIdx = header.indexOf("post_url");
  const noteIdx = header.indexOf("note");
  const out: WinnerRow[] = [];
  for (const line of lines.slice(1)) {
    const cols = line.split(",").map((c) => c.trim());
    const email = cols[emailIdx]?.trim();
    if (!email) continue;
    out.push({
      email,
      postUrl: postIdx >= 0 ? cols[postIdx] || undefined : undefined,
      note: noteIdx >= 0 ? cols[noteIdx] || undefined : undefined,
    });
  }
  return out;
}

async function main() {
  const { dryRun, rows } = parseArgs(process.argv.slice(2));
  const { isMongoConfigured, getDb } = await import("../lib/mongodb");
  const { normalizeEmail } = await import("../lib/db/email-identity");
  const { grantTokens } = await import("../lib/billing/ledger");
  const { normalizeUserPlan } = await import("../lib/billing/plans");

  if (!isMongoConfigured()) {
    throw new Error("MONGODB_URI not configured");
  }
  const db = await getDb();
  const grants = db.collection("campaign_grants");
  await grants.createIndex(
    { campaignId: 1, emailNormalized: 1 },
    { unique: true },
  );
  await grants.createIndex({ campaignId: 1, grantedAt: 1 });

  const already = await grants.countDocuments({ campaignId: CAMPAIGN_ID });
  console.log(
    `[campaign] ${CAMPAIGN_ID} grants so far: ${already}/${CAMPAIGN_CAP}` +
      (dryRun ? " (dry-run)" : ""),
  );

  let ok = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of rows) {
    const emailNormalized = normalizeEmail(row.email);
    if (!emailNormalized) {
      console.error(`[skip] invalid email: ${row.email}`);
      skipped++;
      continue;
    }

    const existingGrant = await grants.findOne({
      campaignId: CAMPAIGN_ID,
      emailNormalized,
    });
    if (existingGrant) {
      console.log(`[skip] already granted: ${emailNormalized}`);
      skipped++;
      continue;
    }

    if (already + ok >= CAMPAIGN_CAP) {
      console.error(
        `[cap] reached ${CAMPAIGN_CAP} winners — stop. Not granting ${emailNormalized}`,
      );
      failed++;
      continue;
    }

    const escaped = emailNormalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const user = await db.collection("users").findOne({
      supersededBy: { $in: [null, undefined] },
      $or: [
        { emailNormalized },
        { email: { $regex: `^${escaped}$`, $options: "i" } },
      ],
    });
    if (!user?.clerkId) {
      console.error(
        `[fail] no Alchemy user for ${emailNormalized} — ask them to sign up first`,
      );
      failed++;
      continue;
    }

    const clerkId = String(user.clerkId);
    const plan = normalizeUserPlan(user.plan);
    if (plan !== "free" && plan !== "pro") {
      console.warn(
        `[warn] ${emailNormalized} is on plan=${plan} — still granting tokens; Pro overlay skipped if paid sub exists`,
      );
    }

    const proEndsAt = new Date(
      Date.now() + CAMPAIGN_PRO_DAYS * 24 * 60 * 60 * 1000,
    );
    const tokenRef = `campaign_${CAMPAIGN_ID}_${emailNormalized}`;

    console.log(
      `[grant] ${emailNormalized} clerkId=${clerkId} +${CAMPAIGN_TOKEN_BONUS} tok, Pro until ${proEndsAt.toISOString()}`,
    );

    if (dryRun) {
      ok++;
      continue;
    }

    try {
      const balanceAfter = await grantTokens(
        clerkId,
        CAMPAIGN_TOKEN_BONUS,
        "admin_adjust",
        {
          ref: tokenRef,
          meta: {
            campaignId: CAMPAIGN_ID,
            emailNormalized,
            postUrl: row.postUrl ?? null,
            note: row.note ?? null,
          },
        },
      );
      if (balanceAfter == null) {
        throw new Error("grantTokens returned null");
      }

      // Comp Pro for 7 days when not already on a higher paid plan with Stripe.
      const hasPaidSub = Boolean(user.stripeSubscriptionId);
      if (!hasPaidSub && (plan === "free" || plan === "pro")) {
        await db.collection("users").updateOne(
          { clerkId },
          {
            $set: {
              plan: "pro",
              proTrialEndsAt: proEndsAt,
              updatedAt: new Date(),
            },
          },
        );
        try {
          const { syncOwnerTeamForPlan } = await import("../lib/team/service");
          await syncOwnerTeamForPlan(clerkId, "pro");
        } catch (err) {
          console.warn("[warn] syncOwnerTeamForPlan failed", err);
        }
      }

      await grants.insertOne({
        campaignId: CAMPAIGN_ID,
        emailNormalized,
        clerkId,
        tokensGranted: CAMPAIGN_TOKEN_BONUS,
        balanceAfter,
        proEndsAt: hasPaidSub ? null : proEndsAt,
        postUrl: row.postUrl ?? null,
        note: row.note ?? null,
        grantedAt: new Date(),
      });

      console.log(
        `[ok] ${emailNormalized} balance≈${balanceAfter}` +
          (hasPaidSub ? " (tokens only — paid sub kept)" : ` Pro→${proEndsAt.toISOString()}`),
      );
      ok++;
    } catch (err) {
      console.error(
        `[fail] ${emailNormalized}`,
        err instanceof Error ? err.message : err,
      );
      failed++;
    }
  }

  console.log(
    `\n[done] ok=${ok} skipped=${skipped} failed=${failed} dryRun=${dryRun}`,
  );
  if (!dryRun) {
    const total = await grants.countDocuments({ campaignId: CAMPAIGN_ID });
    console.log(`[campaign] total grants now: ${total}/${CAMPAIGN_CAP}`);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
