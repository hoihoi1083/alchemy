import { createHash } from "node:crypto";

/** Stable idempotency key for a single charge→refund pair. */
export function buildRefundRef(
  billedClerkId: string,
  cost: number,
  meta: Record<string, unknown>,
): string {
  const explicit =
    typeof meta.refundRef === "string" ? meta.refundRef.trim() : "";
  if (explicit) return explicit;

  const payload = {
    billedClerkId,
    cost,
    actorClerkId:
      typeof meta.actorClerkId === "string" ? meta.actorClerkId.trim() : undefined,
    chargeRef:
      typeof meta.chargeRef === "string" ? meta.chargeRef.trim() : undefined,
    kind: typeof meta.kind === "string" ? meta.kind : undefined,
    mode: typeof meta.mode === "string" ? meta.mode : undefined,
    reason: typeof meta.reason === "string" ? meta.reason : undefined,
    route: typeof meta.route === "string" ? meta.route : undefined,
  };
  const hash = createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex")
    .slice(0, 32);
  return `refund_${hash}`;
}
