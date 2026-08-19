import { normalizeUserPlan } from "@/lib/billing/plans";
import type { DbUser } from "@/lib/db/types";
import { getDb, isMongoConfigured } from "@/lib/mongodb";
import { getActiveTeamMembership } from "@/lib/team/service";

export type TokenPayer = {
  actorClerkId: string;
  payerClerkId: string;
  teamId: string | null;
  pooled: boolean;
};

/**
 * Enterprise members spend from the owner's token pool.
 * Owners and non-members spend from their own balance.
 */
export async function resolveTokenPayer(actorClerkId: string): Promise<TokenPayer> {
  const self: TokenPayer = {
    actorClerkId,
    payerClerkId: actorClerkId,
    teamId: null,
    pooled: false,
  };
  if (!isMongoConfigured()) return self;
  const membership = await getActiveTeamMembership(actorClerkId);
  if (!membership || membership.role === "owner" || membership.ownerClerkId === actorClerkId) {
    return { ...self, teamId: membership?.teamId ?? null };
  }
  const db = await getDb();
  const owner = await db.collection<DbUser>("users").findOne({
    clerkId: membership.ownerClerkId,
  });
  if (normalizeUserPlan(owner?.plan) !== "custom") return self;
  return {
    actorClerkId,
    payerClerkId: membership.ownerClerkId,
    teamId: membership.teamId,
    pooled: true,
  };
}
