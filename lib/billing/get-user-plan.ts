import {
  INTERNAL_UNLIMITED_PLAN,
  isInternalUnlimitedClerkId,
  isInternalUnlimitedIdentity,
} from "@/lib/billing/internal-unlimited";
import { normalizeUserPlan, type UserPlan } from "@/lib/billing/plans";
import type { DbUser } from "@/lib/db/types";
import { getDb, isMongoConfigured } from "@/lib/mongodb";
import { isProductionEnv } from "@/lib/mongodb-production";
import { getActiveTeamMembership, syncOwnerTeamForPlan } from "@/lib/team/service";

/**
 * Server-only: resolve plan from Mongo for the signed-in Clerk user.
 * In production, Mongo must be configured — never silently treat everyone as free.
 */
export async function getUserPlan(clerkId: string): Promise<UserPlan> {
  if (isInternalUnlimitedClerkId(clerkId)) return INTERNAL_UNLIMITED_PLAN;
  if (!isMongoConfigured()) {
    if (isProductionEnv()) {
      throw new Error("MONGODB_URI is required in production to resolve user plan.");
    }
    return "free";
  }
  const db = await getDb();
  const user = await db.collection<DbUser>("users").findOne({ clerkId });
  if (
    isInternalUnlimitedIdentity({
      clerkId,
      email: user?.emailNormalized ?? user?.email,
    })
  ) {
    return INTERNAL_UNLIMITED_PLAN;
  }
  const ownPlan = normalizeUserPlan(user?.plan);
  const membership = await getActiveTeamMembership(clerkId);
  if (!membership) return ownPlan;
  if (membership.role === "owner" || membership.ownerClerkId === clerkId) {
    if (ownPlan !== "custom") {
      await syncOwnerTeamForPlan(clerkId, ownPlan);
    }
    return ownPlan;
  }
  const owner = await db.collection<DbUser>("users").findOne({
    clerkId: membership.ownerClerkId,
  });
  const ownerPlan = normalizeUserPlan(owner?.plan ?? ownPlan);
  if (ownerPlan !== "custom") {
    await syncOwnerTeamForPlan(membership.ownerClerkId, ownerPlan);
    return ownPlan;
  }
  return ownerPlan;
}
