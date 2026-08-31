import { NextResponse } from "next/server";
import {
  assertCanAfford,
  consumeTokens,
  getUserBalance,
  insufficientTokensResponse,
  InsufficientTokensError,
} from "@/lib/billing/ledger";
import { buildRefundRef } from "@/lib/billing/refund-ref";
import { grantTokensOnce } from "@/lib/stripe/billing-sync";
import {
  estimateH3Tokens,
  estimateTeachingCarouselTokens,
  estimateVideoTokens,
  imageCountTokenCost,
  resolveVideoBillingResolution,
  TOKEN_COST,
} from "@/lib/billing/token-costs";
import {
  INTERNAL_UNLIMITED_DISPLAY_BALANCE,
  isInternalUnlimitedUser,
} from "@/lib/billing/internal-unlimited";
import { isMongoConfigured } from "@/lib/mongodb";
import { isProductionEnv } from "@/lib/mongodb-production";
import { resolveTokenPayer } from "@/lib/billing/team-payer";
import { recordPendingRefund } from "@/lib/billing/pending-refunds";

export { resolveVideoBillingResolution, estimateVideoTokens, estimateH3Tokens };

const REFUND_RETRY_ATTEMPTS = 3;
const REFUND_RETRY_BASE_MS = 120;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Balance for storyboard video pre-flight. Internal unlimited accounts
 * display 999,999 and skip debit — but Mongo may still hold a leftover
 * free-grant row. Affordability must use the display wallet, not that row.
 */
export async function getAffordabilityBalance(
  clerkId: string,
): Promise<number | null> {
  if (await isInternalUnlimitedUser(clerkId)) {
    return INTERNAL_UNLIMITED_DISPLAY_BALANCE;
  }
  if (!isMongoConfigured()) return null;
  const payer = await resolveTokenPayer(clerkId);
  if (await isInternalUnlimitedUser(payer.payerClerkId)) {
    return INTERNAL_UNLIMITED_DISPLAY_BALANCE;
  }
  const wallet = await getUserBalance(payer.payerClerkId);
  return wallet?.balance ?? null;
}

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
  if (await isInternalUnlimitedUser(clerkId)) return null;
  if (!isMongoConfigured()) {
    if (isProductionEnv()) return billingDbUnavailableResponse();
    return null;
  }
  try {
    const payer = await resolveTokenPayer(clerkId);
    if (await isInternalUnlimitedUser(payer.payerClerkId)) return null;
    await assertCanAfford(payer.payerClerkId, cost);
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
  if (await isInternalUnlimitedUser(clerkId)) {
    return { balanceAfter: INTERNAL_UNLIMITED_DISPLAY_BALANCE };
  }
  // Production must never silently skip billing when Mongo is unset.
  if (!isMongoConfigured()) {
    if (isProductionEnv()) {
      return { error: billingDbUnavailableResponse() };
    }
    return { balanceAfter: null };
  }
  try {
    const payer = await resolveTokenPayer(clerkId);
    if (await isInternalUnlimitedUser(payer.payerClerkId)) {
      return { balanceAfter: INTERNAL_UNLIMITED_DISPLAY_BALANCE };
    }
    const balanceAfter = await consumeTokens(payer.payerClerkId, cost, {
      meta: {
        ...meta,
        phase: "charge",
        actorClerkId: clerkId,
        billedClerkId: payer.payerClerkId,
        teamId: payer.teamId,
        teamPooled: payer.pooled,
      },
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
 * Retries transient failures, queues persistent failures for later replay.
 */
export async function refundTokens(
  clerkId: string,
  cost: number,
  meta: Record<string, unknown>,
): Promise<number | null> {
  if (!isMongoConfigured() || cost <= 0) return null;
  if (await isInternalUnlimitedUser(clerkId)) {
    return INTERNAL_UNLIMITED_DISPLAY_BALANCE;
  }

  const billedClerkId =
    typeof meta.billedClerkId === "string" && meta.billedClerkId.trim()
      ? meta.billedClerkId.trim()
      : (await resolveTokenPayer(clerkId)).payerClerkId;

  if (await isInternalUnlimitedUser(billedClerkId)) {
    return INTERNAL_UNLIMITED_DISPLAY_BALANCE;
  }

  const refundMeta = {
    ...meta,
    phase: "refund",
    billedClerkId,
    actorClerkId: clerkId,
  };
  const refundRef = buildRefundRef(billedClerkId, cost, refundMeta);

  for (let attempt = 1; attempt <= REFUND_RETRY_ATTEMPTS; attempt++) {
    try {
      const { balanceAfter } = await grantTokensOnce(
        billedClerkId,
        cost,
        "refund",
        refundRef,
        refundMeta,
      );
      if (balanceAfter !== null) return balanceAfter;
      if (attempt < REFUND_RETRY_ATTEMPTS) {
        await sleep(REFUND_RETRY_BASE_MS * attempt);
        continue;
      }
      alertRefundFailure("null_user", clerkId, cost, meta);
      await recordPendingRefund({
        actorClerkId: clerkId,
        billedClerkId,
        amount: cost,
        meta: refundMeta,
        errorKind: "null_user",
      });
      return null;
    } catch (err) {
      if (attempt >= REFUND_RETRY_ATTEMPTS) {
        alertRefundFailure("throw", clerkId, cost, meta, err);
        await recordPendingRefund({
          actorClerkId: clerkId,
          billedClerkId,
          amount: cost,
          meta: refundMeta,
          errorKind: "throw",
          lastError: err instanceof Error ? err.message : String(err),
        });
        return null;
      }
      await sleep(REFUND_RETRY_BASE_MS * attempt);
    }
  }
  return null;
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
  /** Optional slide count when mode is carousel / teaching-carousel. */
  slideCount?: number | null;
}): number {
  const mode = opts.multipartMode?.trim() || "";
  if (mode.startsWith("refine")) return imageCountTokenCost(opts.numImages);
  const out = opts.imageOutputMode?.trim() || "";
  if (out === "campaign") return TOKEN_COST.campaign;
  // Unified UI mode "carousel" + legacy teaching-carousel — never fall back to single-image price.
  if (out === "teaching-carousel" || out === "carousel") {
    const n = Number(opts.slideCount);
    if (Number.isFinite(n) && n > 0) {
      return estimateTeachingCarouselTokens(n);
    }
    return TOKEN_COST.teaching_carousel;
  }
  if (out === "ab") return TOKEN_COST.image_ab;
  return imageCountTokenCost(opts.numImages);
}

export function seedanceEndpointUsesFastTier(endpoint: string): boolean {
  return /\/fast(?:\/|$)/.test(endpoint.trim());
}

export function videoTokenCostFromRequest(opts: {
  resolution: string;
  fast: boolean;
  duration: "auto" | number;
}): number {
  return estimateVideoTokens(opts);
}

/** Bill from the resolved fal endpoint — not the client `fast` flag alone. */
export function videoTokenCostFromSeedanceEndpoint(opts: {
  resolution: string;
  duration: "auto" | number;
  endpoint: string;
}): number {
  const fast = seedanceEndpointUsesFastTier(opts.endpoint);
  return estimateVideoTokens({
    resolution: opts.resolution,
    fast,
    duration: opts.duration,
  });
}

export function h3TokenCostFromRequest(opts: {
  resolution: string;
  duration: "auto" | number;
  referenceVideoSec?: number;
  extraReferenceImages?: number;
}): number {
  return estimateH3Tokens(opts);
}
