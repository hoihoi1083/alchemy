import { NextResponse } from "next/server";
import {
  assertCanAfford,
  consumeTokens,
  grantTokens,
  insufficientTokensResponse,
  InsufficientTokensError,
} from "@/lib/billing/ledger";
import {
  estimateVideoTokens,
  resolveVideoBillingResolution,
  TOKEN_COST,
} from "@/lib/billing/token-costs";
import { isMongoConfigured } from "@/lib/mongodb";
import { isProductionEnv } from "@/lib/mongodb-production";

export { resolveVideoBillingResolution, estimateVideoTokens };

export function billingErrorResponse(err: unknown): NextResponse | null {
  if (err instanceof InsufficientTokensError) {
    return NextResponse.json(insufficientTokensResponse(err), { status: 402 });
  }
  return null;
}

function billingDbUnavailableResponse(): NextResponse {
  return NextResponse.json(
    { error: "Billing database is required. Set MONGODB_URI before charging tokens." },
    { status: 503 },
  );
}

/**
 * Soft pre-check only (does not lock balance). Prefer `chargeTokens` before
 * expensive fal calls so concurrent tabs cannot double-spend.
 */
export async function requireTokens(clerkId: string, cost: number): Promise<NextResponse | null> {
  if (cost <= 0) return null;
  if (!isMongoConfigured()) {
    if (isProductionEnv()) return billingDbUnavailableResponse();
    return null;
  }
  try {
    await assertCanAfford(clerkId, cost);
    return null;
  } catch (err) {
    return (
      billingErrorResponse(err) ??
      NextResponse.json({ error: "Billing check failed" }, { status: 500 })
    );
  }
}

/**
 * Deduct tokens BEFORE calling fal. Atomic — concurrent requests cannot both
 * pass. On fal failure, call `refundTokens` so the user is not charged.
 */
export async function chargeTokens(
  clerkId: string,
  cost: number,
  meta: Record<string, unknown>,
): Promise<{ error: NextResponse } | { balanceAfter: number | null }> {
  if (cost <= 0) {
    return { balanceAfter: null };
  }
  // Production must never silently skip billing when Mongo is unset.
  if (!isMongoConfigured()) {
    if (isProductionEnv()) {
      return { error: billingDbUnavailableResponse() };
    }
    return { balanceAfter: null };
  }
  try {
    const balanceAfter = await consumeTokens(clerkId, cost, {
      meta: { ...meta, phase: "charge" },
    });
    return { balanceAfter };
  } catch (err) {
    return {
      error:
        billingErrorResponse(err) ??
        NextResponse.json({ error: "Billing charge failed" }, { status: 500 }),
    };
  }
}

function alertRefundFailure(
  kind: "throw" | "null_user",
  clerkId: string,
  cost: number,
  meta: Record<string, unknown>,
  err?: unknown,
): void {
  console.error("[billing] refundTokens failed", {
    kind,
    clerkId,
    cost,
    meta,
    err: err instanceof Error ? err.message : err != null ? String(err) : undefined,
  });
  void import("@sentry/nextjs")
    .then((Sentry) => {
      if (kind === "throw" && err != null) {
        Sentry.captureException(err, {
          tags: { billing: "refund_failed" },
          extra: { clerkId, cost, meta, kind },
        });
      } else {
        Sentry.captureMessage("billing_refund_null", {
          level: "error",
          tags: { billing: "refund_failed" },
          extra: { clerkId, cost, meta, kind },
        });
      }
    })
    .catch(() => {
      /* no Sentry */
    });
}

/**
 * Refund tokens after a failed generation that was already charged.
 * Best-effort — never throws to the caller. Logs + Sentry on failure so ops
 * can catch "charged with no refund" wallet leaks (including grantTokens null
 * when the Mongo user row is missing).
 */
export async function refundTokens(
  clerkId: string,
  cost: number,
  meta: Record<string, unknown>,
): Promise<number | null> {
  if (!isMongoConfigured() || cost <= 0) return null;
  try {
    const balanceAfter = await grantTokens(clerkId, cost, "refund", {
      meta: { ...meta, phase: "refund" },
    });
    if (balanceAfter === null) {
      alertRefundFailure("null_user", clerkId, cost, meta);
    }
    return balanceAfter;
  } catch (err) {
    alertRefundFailure("throw", clerkId, cost, meta, err);
    return null;
  }
}

/**
 * @deprecated Prefer chargeTokens (upfront) + refundTokens on failure.
 */
export async function settleTokens(
  clerkId: string,
  cost: number,
  meta: Record<string, unknown>,
): Promise<number | null> {
  if (!isMongoConfigured() || cost <= 0) return null;
  return consumeTokens(clerkId, cost, { meta });
}

export function imageTokenCostFromRequest(opts: {
  numImages?: number;
  imageOutputMode?: string | null;
  multipartMode?: string | null;
}): number {
  const mode = opts.multipartMode?.trim() || "";
  if (mode.startsWith("refine")) return TOKEN_COST.image;
  const out = opts.imageOutputMode?.trim() || "";
  if (out === "campaign") return TOKEN_COST.campaign;
  if (out === "teaching-carousel") return TOKEN_COST.teaching_carousel;
  if (out === "ab" || (opts.numImages ?? 1) >= 2) return TOKEN_COST.image_ab;
  return TOKEN_COST.image;
}

export function videoTokenCostFromRequest(opts: {
  resolution: string;
  fast: boolean;
  duration: "auto" | number;
}): number {
  return estimateVideoTokens(opts);
}
