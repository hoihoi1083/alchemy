/**
 * Ledger behavior tests against in-memory Mongo — exercises real consumeTokens /
 * grantTokens / ensureSignupGrant / pending-refund replay (not source greps).
 *
 *   npx tsx --test tests/billing-ledger.integration.test.ts
 */
import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import { FREE_SIGNUP_GRANT_TOKENS } from "../lib/billing/plans";
import { TOKEN_COST } from "../lib/billing/token-costs";
import {
  clearBillingCollections,
  getTestDb,
  makeBatch,
  seedWalletUser,
  startMemoryMongo,
  stopMemoryMongo,
} from "./helpers/mongo-memory";

type Ledger = typeof import("../lib/billing/ledger");
type PendingRefunds = typeof import("../lib/billing/pending-refunds");

let ledger: Ledger;
let pendingRefunds: PendingRefunds;

before(async () => {
  await startMemoryMongo();
  ledger = await import("../lib/billing/ledger");
  pendingRefunds = await import("../lib/billing/pending-refunds");
});

after(async () => {
  await stopMemoryMongo();
});

beforeEach(async () => {
  const db = await getTestDb();
  await clearBillingCollections(db);
});

describe("ledger integration — charge and refund", () => {
  it("consume then refund restores the starting balance", async () => {
    const db = await getTestDb();
    const clerkId = "user_charge_refund";
    const start = 1000;
    await seedWalletUser(db, clerkId, start);

    const afterCharge = await ledger.consumeTokens(clerkId, TOKEN_COST.image, {
      meta: { route: "test" },
    });
    assert.equal(afterCharge, start - TOKEN_COST.image);

    const afterRefund = await ledger.grantTokens(clerkId, TOKEN_COST.image, "refund", {
      meta: { route: "test" },
    });
    assert.equal(afterRefund, start);

    const wallet = await ledger.getUserBalance(clerkId);
    assert.equal(wallet?.balance, start);

    const txs = await db
      .collection("credit_transactions")
      .find({ clerkId })
      .sort({ createdAt: 1 })
      .toArray();
    assert.equal(txs.length, 2);
    assert.equal(txs[0]?.reason, "consume");
    assert.equal(txs[0]?.delta, -TOKEN_COST.image);
    assert.equal(txs[1]?.reason, "refund");
    assert.equal(txs[1]?.delta, TOKEN_COST.image);
  });

  it("failed job pattern: only one consume row when work never succeeds", async () => {
    const db = await getTestDb();
    const clerkId = "user_no_charge_on_fail";
    const start = 500;
    await seedWalletUser(db, clerkId, start);

    try {
      await ledger.assertCanAfford(clerkId, TOKEN_COST.image);
    } catch {
      assert.fail("preflight should pass");
    }
    // Work failed — production skips consumeTokens entirely.
    const wallet = await ledger.getUserBalance(clerkId);
    assert.equal(wallet?.balance, start);
    assert.equal(wallet?.plan, "free");

    const consumeRows = await db
      .collection("credit_transactions")
      .countDocuments({ clerkId, reason: "consume" });
    assert.equal(consumeRows, 0);
  });
});

describe("ledger integration — concurrency and FIFO batches", () => {
  it("parallel consumes cannot overdraw the same balance", async () => {
    const db = await getTestDb();
    const clerkId = "user_parallel";
    const cost = 65;
    const start = 100;
    await seedWalletUser(db, clerkId, start);

    const results = await Promise.allSettled([
      ledger.consumeTokens(clerkId, cost),
      ledger.consumeTokens(clerkId, cost),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");
    assert.equal(fulfilled.length, 1);
    assert.equal(rejected.length, 1);

    const wallet = await ledger.getUserBalance(clerkId);
    assert.equal(wallet?.balance, start - cost);

    const consumeRows = await db
      .collection("credit_transactions")
      .countDocuments({ clerkId, reason: "consume" });
    assert.equal(consumeRows, 1);
  });

  it("concurrent grant + consume never loses the granted tokens", async () => {
    const db = await getTestDb();
    const clerkId = "user_grant_consume_race";
    let losses = 0;

    for (let i = 0; i < 20; i++) {
      await clearBillingCollections(db);
      await seedWalletUser(db, clerkId, 100);

      await Promise.all([
        ledger.grantTokens(clerkId, 50, "refund", { meta: { i } }),
        ledger.consumeTokens(clerkId, 60, { meta: { i } }),
      ]);

      const wallet = await ledger.getUserBalance(clerkId);
      // 100 + 50 - 60 = 90. Stale consume overwrite used to leave 40.
      if (wallet?.balance !== 90) losses += 1;
    }

    assert.equal(losses, 0, "grant×consume race lost tokens in one or more trials");
  });

  it("consumes oldest batch first (FIFO by expiry)", async () => {
    const db = await getTestDb();
    const clerkId = "user_fifo";
    const olderGranted = new Date("2026-01-01T00:00:00.000Z");
    const newerGranted = new Date("2026-06-01T00:00:00.000Z");
    const older = makeBatch(40, {
      grantedAt: olderGranted,
      expiresAt: new Date("2027-01-01T00:00:00.000Z"),
      source: "older",
    });
    const newer = makeBatch(40, {
      grantedAt: newerGranted,
      expiresAt: new Date("2028-01-01T00:00:00.000Z"),
      source: "newer",
    });
    await seedWalletUser(db, clerkId, 80, { tokenBatches: [newer, older] });

    await ledger.consumeTokens(clerkId, 50);

    const user = await db.collection("users").findOne({ clerkId });
    const batches = (user?.tokenBatches ?? []) as Array<{ id: string; remaining: number }>;
    assert.equal(batches.length, 1);
    assert.equal(batches[0]?.id, newer.id);
    assert.equal(batches[0]?.remaining, 30);
    assert.equal(user?.creditBalance, 30);
  });
});

describe("ledger integration — signup grant", () => {
  it("ensureSignupGrant is idempotent", async () => {
    const db = await getTestDb();
    const clerkId = "user_signup";
    await seedWalletUser(db, clerkId, 0, { signupGrantAt: null });

    const first = await ledger.ensureSignupGrant(clerkId);
    const second = await ledger.ensureSignupGrant(clerkId);
    assert.equal(first, FREE_SIGNUP_GRANT_TOKENS);
    assert.equal(second, null);

    const wallet = await ledger.getUserBalance(clerkId);
    assert.equal(wallet?.balance, FREE_SIGNUP_GRANT_TOKENS);

    const grantRows = await db
      .collection("credit_transactions")
      .countDocuments({ clerkId, reason: "signup_grant" });
    assert.equal(grantRows, 1);
  });
});

describe("ledger integration — pending refund replay", () => {
  it("concurrent replay credits once and completes the row", async () => {
    const db = await getTestDb();
    const clerkId = "user_pending";
    const amount = TOKEN_COST.image;
    const start = 1000;
    await seedWalletUser(db, clerkId, start - amount);

    await pendingRefunds.recordPendingRefund({
      actorClerkId: clerkId,
      billedClerkId: clerkId,
      amount,
      meta: { route: "test", phase: "refund" },
      errorKind: "throw",
      lastError: "simulated transient failure",
    });

    const [a, b] = await Promise.all([
      pendingRefunds.processPendingRefundsForBilledUser(clerkId),
      pendingRefunds.processPendingRefundsForBilledUser(clerkId),
    ]);
    assert.equal(a + b, 1);

    const wallet = await ledger.getUserBalance(clerkId);
    assert.equal(wallet?.balance, start);

    const row = await db.collection("billing_pending_refunds").findOne({ billedClerkId: clerkId });
    assert.equal(row?.status, "completed");

    const refundRows = await db
      .collection("credit_transactions")
      .countDocuments({ clerkId, reason: "refund" });
    assert.equal(refundRows, 1);
  });

  it("processAllPendingRefunds sweeps every queued wallet", async () => {
    const db = await getTestDb();
    await seedWalletUser(db, "payer_a", 900);
    await seedWalletUser(db, "payer_b", 900);
    await pendingRefunds.recordPendingRefund({
      actorClerkId: "payer_a",
      billedClerkId: "payer_a",
      amount: 50,
      meta: { route: "test" },
      errorKind: "null_user",
    });
    await pendingRefunds.recordPendingRefund({
      actorClerkId: "payer_b",
      billedClerkId: "payer_b",
      amount: 30,
      meta: { route: "test" },
      errorKind: "null_user",
    });

    const sweep = await pendingRefunds.processAllPendingRefunds();
    assert.equal(sweep.usersProcessed, 2);
    assert.equal(sweep.completed, 2);
    assert.equal(sweep.pendingRemaining, 0);

    assert.equal((await ledger.getUserBalance("payer_a"))?.balance, 950);
    assert.equal((await ledger.getUserBalance("payer_b"))?.balance, 930);
  });

  it("crash after credit then stale-retry does not double-refund", async () => {
    const db = await getTestDb();
    const clerkId = "user_crash_replay";
    const amount = 65;
    const start = 900;
    await seedWalletUser(db, clerkId, start);

    await pendingRefunds.recordPendingRefund({
      actorClerkId: clerkId,
      billedClerkId: clerkId,
      amount,
      meta: { route: "test" },
      errorKind: "throw",
    });
    const row = await db.collection("billing_pending_refunds").findOne({ billedClerkId: clerkId });
    assert.ok(row?._id);

    // Simulate: grant succeeded (idempotent ref) but markCompleted never ran.
    const { grantTokensOnce } = await import("../lib/stripe/billing-sync");
    const first = await grantTokensOnce(
      clerkId,
      amount,
      "refund",
      `pending_refund_${String(row!._id)}`,
      { phase: "refund", pendingRefund: true },
    );
    assert.equal(first.granted, true);
    assert.equal(first.balanceAfter, start + amount);

    // Row still pending (crash before mark). Replay must not credit again.
    const completed = await pendingRefunds.processPendingRefundsForBilledUser(clerkId);
    assert.equal(completed, 1);
    assert.equal((await ledger.getUserBalance(clerkId))?.balance, start + amount);

    const refundRows = await db
      .collection("credit_transactions")
      .countDocuments({ clerkId, reason: "refund" });
    assert.equal(refundRows, 1);

    const done = await db.collection("billing_pending_refunds").findOne({ _id: row!._id });
    assert.equal(done?.status, "completed");
  });
});
