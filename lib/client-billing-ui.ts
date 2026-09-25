/**
 * Shared client helpers: token preflight + parse 402/403 billing responses.
 */
import {
  ApiClientError,
  mapApiError,
  type ErrorFallbacks,
} from "@/lib/api/errors";
import {
  cannotAfford,
  insufficientTokensMessage,
} from "@/lib/billing/estimate-job-tokens";
import type { UserPlan } from "@/lib/billing/plans";

export { cannotAfford, insufficientTokensMessage };

export type BillingErrorFallbacks = ErrorFallbacks & {
  planEntitlement?: string;
};

export type ParsedBillingFailure = {
  status: number;
  code?: string;
  message: string;
  requiredPlan?: UserPlan;
  balance?: number;
  required?: number;
  offerProTrial?: boolean;
};

export function parseBillingFailure(
  res: Response,
  data: unknown,
  fallback: string,
): ParsedBillingFailure {
  const body =
    data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  const code = typeof body.code === "string" ? body.code : undefined;
  const rawError =
    typeof body.error === "string" && body.error.trim()
      ? body.error.trim()
      : fallback;
  const requiredPlan =
    body.requiredPlan === "light" ||
    body.requiredPlan === "standard" ||
    body.requiredPlan === "pro" ||
    body.requiredPlan === "master" ||
    body.requiredPlan === "custom" ||
    body.requiredPlan === "free"
      ? (body.requiredPlan as UserPlan)
      : undefined;
  return {
    status: res.status,
    code,
    message: rawError,
    requiredPlan,
    balance: typeof body.balance === "number" ? body.balance : undefined,
    required: typeof body.required === "number" ? body.required : undefined,
    offerProTrial: body.offerProTrial === true,
  };
}

/** True when the response is a Standard+ (or other) plan gate. */
export function isPlanEntitlementFailure(f: ParsedBillingFailure): boolean {
  return (
    f.status === 403 &&
    (f.code === "PLAN_ENTITLEMENT" ||
      /requires\s+.+\s+plan/i.test(f.message) ||
      /需要.+方案|需要.+计划/.test(f.message))
  );
}

export function isInsufficientTokensFailure(f: ParsedBillingFailure): boolean {
  return (
    f.status === 402 ||
    f.code === "INSUFFICIENT_TOKENS" ||
    /not enough tokens|insufficient_tokens/i.test(f.message)
  );
}

/**
 * Map a failed Response JSON into safe user copy.
 * Prefer localized insufficientTokens / planEntitlement when codes match.
 */
export function messageFromBillingFailure(
  f: ParsedBillingFailure,
  fallbacks: BillingErrorFallbacks,
): string {
  if (isInsufficientTokensFailure(f)) {
    return (
      fallbacks.insufficientTokens ||
      insufficientTokensMessage(f.required ?? 0, f.balance ?? 0)
    );
  }
  if (isPlanEntitlementFailure(f) && fallbacks.planEntitlement) {
    return fallbacks.planEntitlement;
  }
  return mapApiError(
    new ApiClientError(f.message, f.status, {
      code: f.code,
      error: f.message,
    }),
    fallbacks,
  );
}

/** Block paid action when balance is known and too low. Returns message or null. */
export function precheckTokensOrNull(
  balance: number | null | undefined,
  required: number,
  localizedInsufficient: string,
): string | null {
  if (!cannotAfford(balance, required)) return null;
  // Prefer localized title-body string so WizardErrorBanner recognizes it.
  return localizedInsufficient || insufficientTokensMessage(required, balance as number);
}
