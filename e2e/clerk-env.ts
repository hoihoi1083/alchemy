/** True when real Clerk + dedicated E2E user are configured (not CI placeholders). */
export function hasClerkE2eAuth(): boolean {
  const pk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim() ?? "";
  const sk = process.env.CLERK_SECRET_KEY?.trim() ?? "";
  const userId = process.env.E2E_CLERK_USER_ID?.trim() ?? "";
  if (!pk || !sk || !userId) return false;
  if (/placeholder/i.test(pk) || /placeholder/i.test(sk)) return false;
  if (!pk.startsWith("pk_") || !sk.startsWith("sk_")) return false;
  return true;
}
