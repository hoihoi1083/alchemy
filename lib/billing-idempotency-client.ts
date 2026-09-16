/**
 * Browser helper: attach a one-shot Idempotency-Key so retries of the same
 * generate click do not double-charge tokens.
 */
export function newBillingIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `ik_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export type BillingFetchInit = RequestInit & {
  /** Reuse on explicit retry of the same user action. Fresh key if omitted. */
  idempotencyKey?: string;
};

/** Like fetch(), but always sends Idempotency-Key for charge-bearing APIs. */
export function billingFetch(
  input: RequestInfo | URL,
  init?: BillingFetchInit,
): Promise<Response> {
  const { idempotencyKey, ...rest } = init ?? {};
  const key = idempotencyKey?.trim() || newBillingIdempotencyKey();
  const headers = new Headers(rest.headers);
  if (!headers.has("Idempotency-Key")) {
    headers.set("Idempotency-Key", key);
  }
  return fetch(input, { ...rest, headers });
}

/** Merge Idempotency-Key into an existing RequestInit (FormData POSTs). */
export function withBillingIdempotency(
  init?: RequestInit,
  key?: string,
): RequestInit {
  const k = key?.trim() || newBillingIdempotencyKey();
  const headers = new Headers(init?.headers);
  if (!headers.has("Idempotency-Key")) {
    headers.set("Idempotency-Key", k);
  }
  return { ...init, headers };
}
