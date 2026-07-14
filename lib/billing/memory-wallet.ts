/**
 * In-memory wallet used to prove billing correctness without Mongo/fal.
 * Mirrors production ledger rules in `lib/billing/ledger.ts`.
 */
import { FREE_SIGNUP_GRANT_TOKENS } from "@/lib/billing/plans";
import type { CreditReason, CreditTransaction } from "@/lib/billing/ledger";
import { InsufficientTokensError } from "@/lib/billing/ledger";

export type MemoryUser = {
  clerkId: string;
  creditBalance: number;
  signupGrantAt?: Date | null;
  plan: string;
};

export class MemoryWallet {
  readonly users = new Map<string, MemoryUser>();
  readonly transactions: CreditTransaction[] = [];

  seed(user: MemoryUser): void {
    this.users.set(user.clerkId, { ...user });
  }

  balance(clerkId: string): number | null {
    const u = this.users.get(clerkId);
    return u ? u.creditBalance : null;
  }

  assertCanAfford(clerkId: string, cost: number): number {
    if (cost <= 0) return this.balance(clerkId) ?? 0;
    const bal = this.balance(clerkId);
    if (bal === null) {
      throw new InsufficientTokensError(0, cost);
    }
    if (bal < cost) {
      throw new InsufficientTokensError(bal, cost);
    }
    return bal;
  }

  /** Soft preflight (same as requireTokens → assertCanAfford). Does NOT deduct. */
  require(clerkId: string, cost: number): void {
    this.assertCanAfford(clerkId, cost);
  }

  /** Post-success settle (same as consumeTokens). Atomic vs balance. */
  settle(clerkId: string, cost: number, meta?: Record<string, unknown>): number {
    if (cost <= 0) return this.balance(clerkId) ?? 0;
    const u = this.users.get(clerkId);
    if (!u || u.creditBalance < cost) {
      throw new InsufficientTokensError(u?.creditBalance ?? 0, cost);
    }
    u.creditBalance -= cost;
    this.transactions.push({
      clerkId,
      delta: -cost,
      reason: "consume",
      meta,
      balanceAfter: u.creditBalance,
      createdAt: new Date(),
    });
    return u.creditBalance;
  }

  /**
   * Simulate one generation: preflight → work → settle only if workSucceeded.
   * Returns charged amount (0 if failed / free).
   */
  runJob(opts: {
    clerkId: string;
    cost: number;
    workSucceeded: boolean;
    meta?: Record<string, unknown>;
  }): { charged: number; balanceAfter: number | null; blocked: boolean } {
    try {
      this.require(opts.clerkId, opts.cost);
    } catch (e) {
      if (e instanceof InsufficientTokensError) {
        return {
          charged: 0,
          balanceAfter: this.balance(opts.clerkId),
          blocked: true,
        };
      }
      throw e;
    }

    if (!opts.workSucceeded) {
      return {
        charged: 0,
        balanceAfter: this.balance(opts.clerkId),
        blocked: false,
      };
    }

    const balanceAfter = this.settle(opts.clerkId, opts.cost, opts.meta);
    return { charged: opts.cost, balanceAfter, blocked: false };
  }

  grant(
    clerkId: string,
    amount: number,
    reason: Exclude<CreditReason, "consume">,
  ): number {
    if (amount <= 0) return this.balance(clerkId) ?? 0;
    const u = this.users.get(clerkId);
    if (!u) throw new Error("user missing");
    u.creditBalance += amount;
    this.transactions.push({
      clerkId,
      delta: amount,
      reason,
      balanceAfter: u.creditBalance,
      createdAt: new Date(),
    });
    return u.creditBalance;
  }

  ensureSignupGrant(clerkId: string): number | null {
    const u = this.users.get(clerkId);
    if (!u) return null;
    if (u.signupGrantAt || u.creditBalance > 0) return null;
    u.signupGrantAt = new Date();
    u.plan = "free";
    u.creditBalance += FREE_SIGNUP_GRANT_TOKENS;
    this.transactions.push({
      clerkId,
      delta: FREE_SIGNUP_GRANT_TOKENS,
      reason: "signup_grant",
      meta: { source: "ensureSignupGrant" },
      balanceAfter: u.creditBalance,
      createdAt: new Date(),
    });
    return u.creditBalance;
  }

  totalConsumed(clerkId: string): number {
    return this.transactions
      .filter((t) => t.clerkId === clerkId && t.reason === "consume")
      .reduce((sum, t) => sum + Math.abs(t.delta), 0);
  }

  consumeCount(clerkId: string): number {
    return this.transactions.filter((t) => t.clerkId === clerkId && t.reason === "consume")
      .length;
  }
}
