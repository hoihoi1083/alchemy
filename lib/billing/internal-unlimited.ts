import type { DbUser } from "@/lib/db/types";
import { getDb, isMongoConfigured } from "@/lib/mongodb";
import type { UserPlan } from "@/lib/billing/plans";

/**
 * Complimentary internal accounts (ops testers).
 * Full Master entitlements; generations do not debit the token wallet.
 *
 * Set on the Vercel environment (Production and/or Preview):
 *   INTERNAL_UNLIMITED_CLERK_IDS=user_2abc,user_2def
 *   INTERNAL_UNLIMITED_EMAILS=you@alchemyailab.com,tester@example.com
 *
 * Prefer Clerk IDs. Emails are matched case-insensitively against the Mongo user row.
 * Never hardcode identities in the repo. Do not use a wildcard.
 */
export const INTERNAL_UNLIMITED_PLAN: UserPlan = "master";

/** Shown in /api/me so the wizard does not treat the account as empty. */
export const INTERNAL_UNLIMITED_DISPLAY_BALANCE = 999_999;

export function parseCsvEnvList(raw: string | undefined | null): string[] {
  if (!raw?.trim()) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(/[,;\n]/)) {
    const value = part.trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
}

export function isInternalUnlimitedClerkId(clerkId: string | null | undefined): boolean {
  const id = clerkId?.trim();
  if (!id) return false;
  return parseCsvEnvList(process.env.INTERNAL_UNLIMITED_CLERK_IDS).includes(id);
}

export function isInternalUnlimitedEmail(email: string | null | undefined): boolean {
  const normalized = email?.trim().toLowerCase();
  if (!normalized) return false;
  return parseCsvEnvList(process.env.INTERNAL_UNLIMITED_EMAILS).some(
    (entry) => entry.toLowerCase() === normalized,
  );
}

export function isInternalUnlimitedIdentity(opts: {
  clerkId: string;
  email?: string | null;
}): boolean {
  return (
    isInternalUnlimitedClerkId(opts.clerkId) || isInternalUnlimitedEmail(opts.email)
  );
}

export async function isInternalUnlimitedUser(clerkId: string): Promise<boolean> {
  if (isInternalUnlimitedClerkId(clerkId)) return true;
  if (parseCsvEnvList(process.env.INTERNAL_UNLIMITED_EMAILS).length === 0) return false;
  if (!isMongoConfigured()) return false;
  const db = await getDb();
  const user = await db.collection<DbUser>("users").findOne(
    { clerkId },
    { projection: { email: 1, emailNormalized: 1 } },
  );
  return isInternalUnlimitedEmail(user?.emailNormalized ?? user?.email);
}
