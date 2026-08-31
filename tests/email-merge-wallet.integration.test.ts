/**
 * Integration: email merge must not duplicate wallets.
 * Run: npx tsx --test tests/email-merge-wallet.integration.test.ts
 */
import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import {
  clearBillingCollections,
  getTestDb,
  makeBatch,
  startMemoryMongo,
  stopMemoryMongo,
} from "./helpers/mongo-memory";

describe("email merge wallet transfer", () => {
  before(async () => {
    await startMemoryMongo();
  });
  after(async () => {
    await stopMemoryMongo();
  });
  beforeEach(async () => {
    const db = await getTestDb();
    await clearBillingCollections(db);
    await db.collection("signup_grant_claims").deleteMany({}).catch(() => undefined);
  });

  it("moves tokens once and leaves donor batches empty", async () => {
    const db = await getTestDb();
    const now = new Date();
    const email = "merge-dup@example.com";
    await db.collection("users").insertMany([
      {
        clerkId: "survivor",
        email,
        emailNormalized: email,
        name: null,
        imageUrl: null,
        region: "hk",
        creditBalance: 0,
        tokenBatches: [],
        tokenBatchesMigratedAt: now,
        plan: "free",
        createdAt: now,
        updatedAt: now,
      },
      {
        clerkId: "donor",
        email,
        emailNormalized: email,
        name: null,
        imageUrl: null,
        region: "hk",
        creditBalance: 5000,
        tokenBatches: [makeBatch(5000)],
        tokenBatchesMigratedAt: now,
        plan: "free",
        createdAt: now,
        updatedAt: now,
      },
    ]);

    const { mergeEmailDuplicatesInto } = await import("../lib/db/email-identity");
    const { getUserBalance } = await import("../lib/billing/ledger");

    await mergeEmailDuplicatesInto({
      clerkId: "survivor",
      emailNormalized: email,
    });
    // Second call must be a no-op (idempotent).
    await mergeEmailDuplicatesInto({
      clerkId: "survivor",
      emailNormalized: email,
    });

    const survivor = await getUserBalance("survivor");
    const donor = await db.collection("users").findOne({ clerkId: "donor" });
    const donorBal = await getUserBalance("donor");

    assert.equal(survivor?.balance, 5000);
    assert.equal(donor?.creditBalance, 0);
    assert.deepEqual(donor?.tokenBatches ?? [], []);
    assert.equal(donor?.supersededBy, "survivor");
    assert.equal(donor?.emailNormalized == null || donor?.emailNormalized === "", true);
    assert.equal(donorBal?.balance ?? 0, 0);

    const txs = await db
      .collection("credit_transactions")
      .find({ ref: "email_merge_donor_to_survivor" })
      .toArray();
    assert.equal(txs.length, 1);
    assert.equal(txs[0]?.delta, 5000);
  });
});
