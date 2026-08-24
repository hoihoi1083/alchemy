/**
 * Isolated live Mongo probe for the token wallet.
 * Creates a throwaway user, exercises grant/consume/block, then deletes it.
 *
 * Requires MONGODB_URI. Does not call fal or Stripe.
 * Run: npx tsx scripts/billing-live-probe.ts
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
loadEnv();

import {
  assertCanAfford,
  consumeTokens,
  ensureSignupGrant,
  getUserBalance,
  InsufficientTokensError,
} from "../lib/billing/ledger";
import { TOKEN_COST } from "../lib/billing/token-costs";
import { FREE_SIGNUP_GRANT_TOKENS } from "../lib/billing/plans";
import { getDb, isMongoConfigured } from "../lib/mongodb";

const CLERK_ID = `billing_probe_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

async function main() {
  if (!isMongoConfigured()) {
    console.error("MONGODB_URI is not set — cannot run live probe.");
    process.exit(1);
  }

  const db = await getDb();
  console.log(`Probe user: ${CLERK_ID}`);

  try {
    await db.collection("users").insertOne({
      clerkId: CLERK_ID,
      email: null,
      name: "Billing Probe",
      imageUrl: null,
      creditBalance: 0,
      plan: "free",
      region: "hk",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const granted = await ensureSignupGrant(CLERK_ID);
    if (granted !== FREE_SIGNUP_GRANT_TOKENS) {
      throw new Error(
        `Expected signup grant ${FREE_SIGNUP_GRANT_TOKENS}, got ${granted}`,
      );
    }
    const again = await ensureSignupGrant(CLERK_ID);
    if (again !== null) {
      throw new Error("Signup grant must be idempotent (second call null)");
    }

    await assertCanAfford(CLERK_ID, TOKEN_COST.image);
    const afterImage = await consumeTokens(CLERK_ID, TOKEN_COST.image, {
      meta: { probe: "image" },
    });
    if (afterImage !== FREE_SIGNUP_GRANT_TOKENS - TOKEN_COST.image) {
      throw new Error(`After image expected ${FREE_SIGNUP_GRANT_TOKENS - TOKEN_COST.image}, got ${afterImage}`);
    }

    // Simulate failed job: afford check only, no consume
    await assertCanAfford(CLERK_ID, TOKEN_COST.music);
    const mid = await getUserBalance(CLERK_ID);
    if (mid?.balance !== FREE_SIGNUP_GRANT_TOKENS - TOKEN_COST.image) {
      throw new Error("Balance changed without consume — overcharge risk");
    }

    // Drain to below video cost then expect block
    const bal = mid!.balance;
    if (bal > 0) {
      await consumeTokens(CLERK_ID, bal, { meta: { probe: "drain" } });
    }
    let blocked = false;
    try {
      await assertCanAfford(CLERK_ID, TOKEN_COST.image);
    } catch (e) {
      if (e instanceof InsufficientTokensError) blocked = true;
      else throw e;
    }
    if (!blocked) throw new Error("Expected insufficient tokens at 0 balance");

    const txs = await db
      .collection("credit_transactions")
      .find({ clerkId: CLERK_ID })
      .toArray();
    const consumed = txs
      .filter((t) => t.reason === "consume")
      .reduce((s, t) => s + Math.abs(Number(t.delta)), 0);
    const grantedSum = txs
      .filter((t) => t.reason === "signup_grant")
      .reduce((s, t) => s + Number(t.delta), 0);

    if (grantedSum !== FREE_SIGNUP_GRANT_TOKENS) {
      throw new Error(`Grant ledger sum ${grantedSum} != ${FREE_SIGNUP_GRANT_TOKENS}`);
    }
    if (consumed !== FREE_SIGNUP_GRANT_TOKENS) {
      throw new Error(`Consume ledger sum ${consumed} != ${FREE_SIGNUP_GRANT_TOKENS}`);
    }

    const final = await getUserBalance(CLERK_ID);
    if (final?.balance !== 0) throw new Error(`Final balance ${final?.balance} != 0`);

    console.log("Live probe OK:");
    console.log(`  signup grant: ${FREE_SIGNUP_GRANT_TOKENS} (once)`);
    console.log(`  consumed total: ${consumed}`);
    console.log(`  final balance: 0`);
    console.log(`  ledger rows: ${txs.length}`);
  } finally {
    await db.collection("credit_transactions").deleteMany({ clerkId: CLERK_ID });
    await db.collection("users").deleteOne({ clerkId: CLERK_ID });
    console.log("Probe user cleaned up.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
