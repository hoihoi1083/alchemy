import { createHash } from "node:crypto";

const MAX_KEY_LEN = 128;

/** Normalize a client Idempotency-Key into a safe ledger ref segment. */
export function sanitizeIdempotencyKey(raw: string | null | undefined): string | undefined {
  if (!raw || typeof raw !== "string") return undefined;
  const trimmed = raw.trim().slice(0, MAX_KEY_LEN);
  if (!trimmed) return undefined;
  // Allow UUID / url-safe tokens; reject control chars.
  if (!/^[\w.:\-]+$/i.test(trimmed)) {
    return createHash("sha256").update(trimmed).digest("hex").slice(0, 40);
  }
  return trimmed;
}

/**
 * Stable unique ref for a token consume. Unique index on credit_transactions.ref
 * makes retries with the same key return the first charge instead of debiting again.
 */
export function buildChargeRef(idempotencyKey: string): string {
  const key = sanitizeIdempotencyKey(idempotencyKey);
  if (!key) {
    throw new Error("buildChargeRef requires a non-empty idempotency key");
  }
  if (key.startsWith("charge_")) return key;
  const hash = createHash("sha256").update(key).digest("hex").slice(0, 32);
  return `charge_${hash}`;
}

/** Read Idempotency-Key / X-Idempotency-Key from an incoming request. */
export function readIdempotencyKey(request: Request): string | undefined {
  const header =
    request.headers.get("idempotency-key") ||
    request.headers.get("x-idempotency-key");
  return sanitizeIdempotencyKey(header);
}

/**
 * Merge client idempotency into charge meta so chargeTokens/consumeTokens
 * can reuse the same debit on retry.
 */
export function billingMetaFromRequest(
  request: Request | null | undefined,
  meta: Record<string, unknown>,
): Record<string, unknown> {
  if (typeof meta.chargeRef === "string" && meta.chargeRef.trim()) {
    return meta;
  }
  const fromMeta =
    typeof meta.idempotencyKey === "string"
      ? sanitizeIdempotencyKey(meta.idempotencyKey)
      : undefined;
  const key = fromMeta || (request ? readIdempotencyKey(request) : undefined);
  if (!key) return meta;
  return {
    ...meta,
    idempotencyKey: key,
    chargeRef: buildChargeRef(key),
  };
}
