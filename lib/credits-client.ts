/** Browser helper to keep AuthNav balance in sync after generations. */

export const CREDITS_EVENT = "alchemy:credits";

export function notifyCreditBalance(balance: unknown): void {
  if (typeof window === "undefined") return;
  if (typeof balance !== "number" || !Number.isFinite(balance)) return;
  window.dispatchEvent(
    new CustomEvent(CREDITS_EVENT, { detail: { balance: Math.max(0, Math.round(balance)) } }),
  );
}

export function readCreditBalanceFromResponse(data: unknown): number | null {
  if (!data || typeof data !== "object") return null;
  const bal = (data as { creditBalance?: unknown }).creditBalance;
  return typeof bal === "number" && Number.isFinite(bal) ? bal : null;
}
