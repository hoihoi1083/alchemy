import type { User } from "@clerk/nextjs/server";

function isVerifiedClerkEmail(
  entry: { verification?: { status?: string | null } | null } | null | undefined,
): boolean {
  return entry?.verification?.status === "verified";
}

/**
 * Identity email for Mongo merge / billing allowlists.
 * Returns null when the user has no verified address — never trust unverified
 * secondaries for wallet merge or INTERNAL_UNLIMITED_EMAILS matching.
 */
export function verifiedEmailFromClerkUser(
  clerkUser: User | null | undefined,
): string | null {
  if (!clerkUser) return null;

  const primary = clerkUser.primaryEmailAddress;
  if (primary?.emailAddress && isVerifiedClerkEmail(primary)) {
    return primary.emailAddress;
  }

  for (const entry of clerkUser.emailAddresses) {
    if (entry.emailAddress && isVerifiedClerkEmail(entry)) {
      return entry.emailAddress;
    }
  }

  return null;
}
