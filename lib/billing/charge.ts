import { NextResponse } from "next/server";
import {
  assertCanAfford,
  consumeTokens,
  insufficientTokensResponse,
  InsufficientTokensError,
} from "@/lib/billing/ledger";
import {
  estimateVideoTokens,
  resolveVideoBillingResolution,
  TOKEN_COST,
} from "@/lib/billing/token-costs";
import { isMongoConfigured } from "@/lib/mongodb";

export { resolveVideoBillingResolution, estimateVideoTokens };

export function billingErrorResponse(err: unknown): NextResponse | null {
  if (err instanceof InsufficientTokensError) {
    return NextResponse.json(insufficientTokensResponse(err), { status: 402 });
  }
  return null;
}

export async function requireTokens(clerkId: string, cost: number): Promise<NextResponse | null> {
  try {
    await assertCanAfford(clerkId, cost);
    return null;
  } catch (err) {
    return billingErrorResponse(err) ?? NextResponse.json({ error: "Billing check failed" }, { status: 500 });
  }
}

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
