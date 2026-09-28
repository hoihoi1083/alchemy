import { createHash, randomUUID } from "node:crypto";

const MAX_KEY_LEN = 128;

export type ChargeRefParts = {
  kind?: string;
  mode?: string;
  via?: string;
  /** Disambiguate repeated same-kind charges in one request (e.g. person matte #2). */
  chargeSeq?: string | number;
};

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

function saltSegment(parts?: ChargeRefParts): string {
  if (!parts) return "";
  const bits = [
    typeof parts.kind === "string" ? parts.kind.trim() : "",
    typeof parts.mode === "string" ? parts.mode.trim() : "",
    typeof parts.via === "string" ? parts.via.trim() : "",
    parts.chargeSeq != null && String(parts.chargeSeq).trim()
      ? String(parts.chargeSeq).trim()
      : "",
  ].filter(Boolean);
  return bits.join("|");
}

/**
 * Stable unique ref for a token consume. Unique index on credit_transactions.ref
 * makes retries with the same key+salt return the first charge instead of debiting again.
 *
 * Salt with kind/mode/via/chargeSeq so multiple charges in one HTTP request
 * (Seedance → H3 → Kling, detect → matte → heal) each get their own debit.
 */
export function buildChargeRef(
  idempotencyKey: string,
  parts?: ChargeRefParts,
): string {
  const key = sanitizeIdempotencyKey(idempotencyKey);
  if (!key) {
    throw new Error("buildChargeRef requires a non-empty idempotency key");
  }
  if (key.startsWith("charge_") && !saltSegment(parts)) return key;
  const material = saltSegment(parts) ? `${key}|${saltSegment(parts)}` : key;
  const hash = createHash("sha256").update(material).digest("hex").slice(0, 32);
  return `charge_${hash}`;
}

/** One-off ref when the client did not send an Idempotency-Key (binds refunds). */
export function newEphemeralChargeRef(): string {
  return `charge_${randomUUID().replace(/-/g, "")}`;
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
 * can reuse the same debit on retry of the *same* logical charge (same salt).
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

  const parts: ChargeRefParts = {
    kind: typeof meta.kind === "string" ? meta.kind : undefined,
    mode: typeof meta.mode === "string" ? meta.mode : undefined,
    via: typeof meta.via === "string" ? meta.via : undefined,
    chargeSeq:
      typeof meta.chargeSeq === "string" || typeof meta.chargeSeq === "number"
        ? meta.chargeSeq
        : undefined,
  };

  return {
    ...meta,
    idempotencyKey: key,
    chargeRef: buildChargeRef(key, parts),
  };
}

/** Attach charge identity onto refund meta so refund refs stay 1:1 with debits. */
export function refundMetaFromCharge(
  charged: { chargeRef?: string; billedClerkId?: string | null },
  meta: Record<string, unknown>,
): Record<string, unknown> {
  return {
    ...meta,
    ...(charged.chargeRef ? { chargeRef: charged.chargeRef } : {}),
    ...(charged.billedClerkId
      ? { billedClerkId: charged.billedClerkId }
      : {}),
  };
}
